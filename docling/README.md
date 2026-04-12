# Docling

Document conversion service that transforms PDF, DOCX, PPTX, and other formats into structured Markdown or JSON.

## Services

- **docling**: Docling Serve API

## Ports

- `5001`: Docling API endpoint

## Usage

```bash
make docker-up
```

## Examples

Convert a PDF to Markdown:

```bash
curl -X POST http://localhost:5001/v1/convert/file \
    -F "file=@document.pdf" \
    -F "output_format=markdown"
```
