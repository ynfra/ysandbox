# PaddleOCR

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
