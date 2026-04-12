"""Minimal Kraken OCR REST API server."""
import io
import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from PIL import Image

app = FastAPI(title="Kraken OCR Server", version="1.0")

# Lazy-loaded model
_model = None
_model_path = os.environ.get("KRAKEN_MODEL", "en_best.mlmodel")


def get_model():
    global _model
    if _model is None:
        from kraken import rpred
        from kraken.lib import models
        try:
            _model = models.load_any(_model_path)
        except Exception:
            # Download default model if not present
            from kraken import repo
            repo.get_model(_model_path, Path("/models"))
            _model = models.load_any(f"/models/{_model_path}")
    return _model


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/")
def root():
    return {"service": "kraken-ocr", "docs": "/docs"}


@app.post("/ocr")
async def ocr(file: UploadFile = File(...)):
    """OCR an uploaded image. Returns extracted text lines."""
    try:
        data = await file.read()
        img = Image.open(io.BytesIO(data)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {e}")

    try:
        from kraken import blla, rpred
        from kraken.lib import models

        model = get_model()
        baseline_seg = blla.segment(img)
        pred_it = rpred.rpred(model, img, baseline_seg)
        lines = [record.prediction for record in pred_it]
        return JSONResponse({"lines": lines, "text": "\n".join(lines)})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
