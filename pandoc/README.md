# Pandoc

Universal document format converter, run as an HTTP API (`pandoc-server`).
Converts between Markdown, DOCX, EPUB, HTML, LaTeX, PDF, and many more formats.
There is no web UI.

![pandoc](docs/dashboard.png)

## Usage

```bash
make docker-up
```

API-only — verify it's up and check the pandoc version/capabilities:

```bash
curl http://localhost:3030/version
```

<details>
<summary>API examples</summary>

Convert Markdown to HTML:

```bash
curl -X POST http://localhost:3030/ \
    -H "Content-Type: application/json" \
    -d '{"from": "markdown", "to": "html", "text": "# Hello World"}'
# => <h1 id="hello-world">Hello World</h1>
```

</details>

> On Apple Silicon / arm64 the compose file pins `platform: linux/amd64`
> (`pandoc/extra:latest` is amd64-only); first pull is large (~230 MB) and slow.

## Services

| Container | Port(s) | Description |
|-----------|---------|-------------|
| **pandoc** | `3030` | Pandoc server in HTTP API mode |

## Configuration

No environment variables. Behaviour is controlled per-request via the JSON body
POSTed to `/`.

## Volumes

None — the server is stateless.

## Observability

| Check | Endpoint / Command |
|-------|--------------------|
| Version | `curl http://localhost:3030/version` |
| Logs | `docker compose logs -f pandoc` |

## Resources

- GitHub: https://github.com/pandoc/dockerfiles
- Docs: https://pandoc.org
