# Gotenberg

![gotenberg](docs/dashboard.png)

HTML, Office, and document to PDF conversion API powered by Chromium and LibreOffice.

## Services

- **gotenberg**: Gotenberg API server with Chromium and LibreOffice engines

## Ports

- `3000`: Gotenberg API endpoint

## Running

```bash
docker compose up -d      # or: make docker-up
```

API is served at `http://localhost:3000`. Gotenberg is **API-only** — it has no
web dashboard, so `/` and most paths return 404 for browsers. The one
browser-renderable endpoint is the health check (the screenshot above is that
`/health` JSON page):

```bash
curl -s http://localhost:3000/health
# {"status":"up","details":{"chromium":{"status":"up",...},"libreoffice":{"status":"up",...}}}
```

Sample conversion — render an HTML file to PDF via Chromium:

```bash
echo '<h1>Hello Gotenberg</h1>' > index.html
curl -X POST http://localhost:3000/forms/chromium/convert/html \
    -F "files=@index.html" -o result.pdf
```

Bring it down with `docker compose down`.

## Notes

- Default host port is `3000`. If another sandbox stack already binds `3000`,
  add a gitignored `docker-compose.override.yml` remapping it
  (`ports: !override`) — do not commit the override.
- The compose command hardens Chromium: JavaScript is disabled
  (`--chromium-disable-javascript=true`) and file access is restricted to
  `/tmp` (`--chromium-allow-list=file:///tmp/.*`).
- Booted cleanly on OrbStack (macOS) with no config changes — `/health` reports
  both `chromium` and `libreoffice` engines `up` within seconds of start.

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
