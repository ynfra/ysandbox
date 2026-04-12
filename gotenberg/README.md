# Gotenberg

HTML, Office, and document to PDF conversion API powered by Chromium and LibreOffice.

## Services

- **gotenberg**: Gotenberg API server with Chromium and LibreOffice engines

## Ports

- `3000`: Gotenberg API endpoint

## Usage

```bash
make docker-up
```

## Examples

Convert an HTML file to PDF:

```bash
curl -X POST http://localhost:3000/forms/chromium/convert/html \
    -F "files=@index.html" -o result.pdf
```

Convert a URL to PDF:

```bash
curl -X POST http://localhost:3000/forms/chromium/convert/url \
    -F "url=https://example.com" -o result.pdf
```

Convert an Office document to PDF:

```bash
curl -X POST http://localhost:3000/forms/libreoffice/convert \
    -F "files=@document.docx" -o result.pdf
```
