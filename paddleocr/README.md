# PaddleOCR

![paddleocr](docs/dashboard.png)

OCR service supporting 80+ languages, powered by PaddlePaddle. Custom-built FastAPI server wrapping PaddleOCR.

## Services

- **paddleocr**: PaddleOCR REST API server (custom Docker build)

## Ports

- `8866`: PaddleOCR API endpoint

## Usage

```bash
make docker-up
```

First run will build the Docker image (takes a few minutes to install PaddlePaddle).

## Examples

OCR an image:

```bash
curl -X POST http://localhost:8866/ocr -F "file=@image.png"
```

Health check:

```bash
curl http://localhost:8866/health
```

API docs: http://localhost:8866/docs

## API

- `POST /ocr`: Upload an image, returns detected text lines with confidence scores and bounding boxes
- `GET /health`: Health check endpoint
- `GET /docs`: Interactive API documentation

## Running

This is a local `build:` stack — the image must be built before the first run:

```bash
docker compose up -d --build
```

The build is **large and slow**: `pip install paddlepaddle paddleocr` pulls a
heavy dependency chain. Allow several minutes on the first build (the layer is
cached afterwards). The container starts fast once built; `PaddleOCR` model
files are downloaded lazily on the **first** `POST /ocr` request, so the first
OCR call is slower than subsequent ones.

Confirm it is up (server binds `0.0.0.0:8866`):

```bash
curl -s http://localhost:8866/          # {"service":"paddleocr","docs":"/docs"}
curl -s http://localhost:8866/health    # {"status":"ok"}
```

Send an image for OCR (multipart file upload — **not** base64 JSON):

```bash
curl -X POST http://localhost:8866/ocr -F "file=@image.png"
# → {"lines":[{"text":"...","confidence":0.99,"box":[...]}], "text":"..."}
```

Bring it down:

```bash
docker compose down
```

## Notes

- **API-only service.** There is no web dashboard. `GET /` returns a small JSON
  descriptor and the useful human-facing surface is the auto-generated Swagger
  UI at `/docs` — that interactive API page (showing `GET /health`, `GET /`,
  `POST /ocr`) is what the screenshot above captures.
- **Host port 8866.** Port numbers are not globally unique across ysandbox
  stacks. If another stack already binds 8866, add a gitignored
  `docker-compose.override.yml` with `ports: !override` remapping to a free host
  port instead of editing the tracked compose file.
- **arm64 / Apple Silicon:** the current unpinned `paddlepaddle` / `paddleocr`
  wheels install and run cleanly under OrbStack on arm64 — no `platform:`
  override was needed. If a future wheel drops arm64 support, add
  `platform: linux/amd64` to the service in `docker-compose.yml`.
