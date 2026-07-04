# Pandoc

![pandoc](docs/dashboard.png)

Universal document format converter. Converts between Markdown, DOCX, EPUB, HTML, LaTeX, PDF, and many more formats.

## Services

- **pandoc**: Pandoc server (HTTP API mode)

## Ports

- `3030`: Pandoc server API endpoint

## Usage

```bash
make docker-up
```

## Examples

Convert Markdown to HTML:

```bash
curl -X POST http://localhost:3030 \
    -H "Content-Type: application/json" \
    -d '{"from": "markdown", "to": "html", "text": "# Hello World"}'
```

List supported formats:

```bash
curl http://localhost:3030
```

## Running

```bash
docker compose up -d
```

This runs **pandoc-server** — an HTTP API only, there is no web UI. Verify it's
up and check the pandoc version + capabilities:

```bash
curl http://localhost:3030/version
```

Convert a document by POSTing JSON to `/`:

```bash
curl -X POST http://localhost:3030/ \
    -H "Content-Type: application/json" \
    -d '{"from": "markdown", "to": "html", "text": "# Hello World"}'
# => <h1 id="hello-world">Hello World</h1>
```

Bring it down:

```bash
docker compose down
```

## Notes

- **API-only server.** Since there is no dashboard, the screenshot above is the
  `/version` endpoint (pandoc version string) rendered in a browser.
- **arm64 boot fix.** `pandoc/extra:latest` ships an amd64-only manifest, so on
  Apple Silicon / arm64 hosts the compose file pins `platform: linux/amd64` to
  let it boot under emulation. First pull is large (~230 MB layer) and slow.
- **Host port 3030.** If another stack already binds 3030, add a gitignored
  `docker-compose.override.yml` remapping it (`ports: !override`) before running.
