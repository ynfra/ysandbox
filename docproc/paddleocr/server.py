"""Minimal PaddleOCR REST API server."""
import io
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from PIL import Image
import numpy as np

app = FastAPI(title="PaddleOCR Server", version="1.0")

_ocr = None


def get_ocr():
    global _ocr
    if _ocr is None:
        from paddleocr import PaddleOCR
        _ocr = PaddleOCR(use_angle_cls=True, lang="en", use_gpu=False, show_log=False)
    return _ocr


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/")
def root():
    return {"service": "paddleocr", "docs": "/docs"}


@app.post("/ocr")
async def ocr(file: UploadFile = File(...)):
    """OCR an uploaded image. Returns detected text with confidence scores."""
    try:
        data = await file.read()
        img = Image.open(io.BytesIO(data)).convert("RGB")
        img_array = np.array(img)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {e}")

    try:
        result = get_ocr().ocr(img_array, cls=True)
        lines = []
        for page in (result or []):
            for line in (page or []):
                box, (text, confidence) = line
                lines.append({"text": text, "confidence": round(confidence, 4), "box": box})
        return JSONResponse({
            "lines": lines,
            "text": "\n".join(l["text"] for l in lines),
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
