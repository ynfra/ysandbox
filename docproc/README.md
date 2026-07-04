# Document Processing Stack

![docproc](docs/dashboard.png)

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

## Running

```bash
docker compose up -d
```

Bundled services and their published host ports:

| Service | URL | Purpose |
|---------|-----|---------|
| docling | http://localhost:5001 (Swagger UI at `/docs`) | Document conversion (PDF/DOCX → Markdown/JSON) |
| paddleocr | http://localhost:8866 | OCR REST API (custom local build) |
| browserless | http://localhost:3000 | Headless Chromium API |
| thumbor | http://localhost:8888 | On-demand image processing/resizing |

The screenshot above shows the **Docling Serve Swagger UI** at
http://localhost:5001/docs, the most reliable renderable page in the stack.

Bring the stack down with `docker compose down`.

## Notes

- Plain `docker compose up -d` boots all four services on OrbStack / macOS
  (arm64) with no config changes. Docling is ready within a few seconds.
- `paddleocr` builds locally on first run (`build: ./paddleocr`) — expect a
  one-time image build.
- The `thumbor` image ships as `linux/amd64` only, so it runs under emulation
  on Apple Silicon (a harmless platform-mismatch warning is printed at boot).
- Avoid the Docling Gradio `/ui` on `:latest` — it can crash-loop; use `/docs`.
- All four host ports (5001, 8866, 3000, 8888) must be free. If one clashes
  with another running stack, add a gitignored `docker-compose.override.yml`
  to remap it (never commit that override).

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
