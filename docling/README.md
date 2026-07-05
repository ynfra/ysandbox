# Docling

Document conversion service that transforms PDF, DOCX, PPTX, and other formats
into structured Markdown or JSON via the Docling Serve API.

![docling](docs/dashboard.png)

## Usage

```bash
make docker-up
```

- API base: http://localhost:5001
- Interactive API docs (Swagger): http://localhost:5001/docs — captured above
- Health check: http://localhost:5001/health

> First boot pulls the `ghcr.io/ds4sd/docling-serve` image (~1.5 GB across
> several layers), so the initial `up` takes a while before `/health` returns
> `200`. Subsequent boots are fast.

> The bundled Gradio web UI (`/ui`, needs `DOCLING_SERVE_ENABLE_UI=true`) is
> **not enabled** here on purpose: the current `:latest` image crash-loops at
> startup because the UI eagerly fetches its logo from a now-`404` upstream URL
> and takes the whole process down. Use `/docs` (Swagger) as the browsable
> surface until that upstream bug is fixed.

<details><summary>API examples</summary>

Convert a PDF to Markdown:

```bash
curl -X POST http://localhost:5001/v1/convert/file \
    -F "file=@document.pdf" \
    -F "output_format=markdown"
```

Convert a document from a URL:

```bash
curl -X POST http://localhost:5001/v1alpha/convert/source \
    -H "Content-Type: application/json" \
    -d '{"http_sources": [{"url": "https://arxiv.org/pdf/2408.09869"}]}'
```

</details>

## Services

| Container | Port(s) | Description |
|-----------|---------|-------------|
| **docling** | `5001` | Docling Serve API (`ghcr.io/ds4sd/docling-serve:latest`) |

## Configuration

No `.env` file — the service runs on image defaults. Optional upstream variables:

| Variable | Default | Notes |
|----------|---------|-------|
| `DOCLING_SERVE_ENABLE_UI` | `false` | Enables the Gradio `/ui`; leave off (crash-loops on `:latest`) |

## Volumes

None — stateless.

## Observability

| Check | Endpoint / Command |
|-------|--------------------|
| Health | `curl http://localhost:5001/health` |
| Logs | `docker compose logs -f docling` |

## Resources

- GitHub: https://github.com/docling-project/docling-serve
- Docs: https://docling-project.github.io/docling/
