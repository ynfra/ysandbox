# Document Processing Stack

A bundled document processing toolkit combining multiple services: document conversion, OCR, headless browser, and image processing.

## Services

- **docling**: Document conversion (PDF/DOCX to Markdown/JSON)
- **paddleocr**: OCR service supporting 80+ languages (custom build)
- **browserless**: Headless Chromium for screenshots and PDF generation
- **thumbor**: Image resizing and processing

## Ports

- `5001`: Docling API
- `8866`: PaddleOCR API
- `3000`: Browserless API
- `8888`: Thumbor API

## Usage

```bash
make docker-up
```

First run will build the PaddleOCR image.

## Examples

Convert a document with Docling:

```bash
curl -X POST http://localhost:5001/v1/convert/file \
    -F "file=@document.pdf" -F "output_format=markdown"
```

OCR an image with PaddleOCR:

```bash
curl -X POST http://localhost:8866/ocr -F "file=@scan.png"
```

Screenshot with Browserless:

```bash
curl -X POST http://localhost:3000/screenshot \
    -H "Content-Type: application/json" \
    -d '{"url": "https://example.com"}' -o screenshot.png
```

Resize an image with Thumbor:

```bash
curl "http://localhost:8888/unsafe/300x200/https://example.com/image.jpg" -o resized.jpg
```
