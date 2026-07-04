# Docling

![docling](docs/dashboard.png)

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

## Running

```bash
docker compose up -d
```

- API base: `http://localhost:5001`
- Interactive API docs (Swagger): `http://localhost:5001/docs` — captured above
- Health check: `http://localhost:5001/health`
- Web UI: `http://localhost:5001/ui` (needs `DOCLING_SERVE_ENABLE_UI=true`)

Convert a document from a URL:

```bash
curl -X POST http://localhost:5001/v1alpha/convert/source \
    -H "Content-Type: application/json" \
    -d '{"http_sources": [{"url": "https://arxiv.org/pdf/2408.09869"}]}'
```

## Notes

- First boot pulls the `ghcr.io/ds4sd/docling-serve` image (~1.5 GB across
  several layers), so the initial `up` takes a while before `/health` returns
  `200`. Subsequent boots are fast.
- The bundled Gradio web UI (`DOCLING_SERVE_ENABLE_UI=true`) is **not enabled**
  here on purpose: the current `:latest` image crash-loops at startup because
  the UI eagerly fetches its logo from `https://ds4sd.github.io/docling/assets/logo.png`,
  which now returns `404` and takes the whole process down. Until that upstream
  bug is fixed, leave the UI off and use `/docs` (Swagger) as the browsable
  surface. The API itself works without the UI.

