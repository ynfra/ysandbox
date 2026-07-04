# Browserless

![browserless](docs/dashboard.png)

Headless Chromium API for browser automation, screenshots, PDF generation, and scraping.

## Services

- **browserless**: Browserless Chromium server

## Ports

- `3000`: Browserless API endpoint

## Running

```bash
docker compose up -d
```

- **API / docs UI**: <http://localhost:3000/docs> — interactive docs + OpenAPI reference.
- **Live debugger**: <http://localhost:3000/debugger/> — interactive session debugger.
- **Version probe**: <http://localhost:3000/json/version>

No token is configured in `docker-compose.yml` (`BROWSERLESS_TOKEN` is left
commented out), so the server runs open — `GET /config` reports `"token": null`
and no `?token=` query param is required for any endpoint. Set
`BROWSERLESS_TOKEN` in the compose to lock it down.

Sample request (capture a screenshot of a page):

```bash
curl -X POST http://localhost:3000/screenshot \
    -H "Content-Type: application/json" \
    -d '{"url": "https://example.com"}' -o screenshot.png
```

### Notes

- Boots clean with plain `docker compose up -d`; the server logs
  `HTTP Server is listening on http://0.0.0.0:3000` once ready (a few seconds).
- The root path `/` returns 404 — the UI lives at `/docs` and `/debugger/`, not `/`.
- Host port `3000` is shared with several other ysandbox stacks; run only one at
  a time, or add a gitignored `docker-compose.override.yml` to remap it.

## Examples

Take a screenshot:

```bash
curl -X POST http://localhost:3000/screenshot \
    -H "Content-Type: application/json" \
    -d '{"url": "https://example.com"}' -o screenshot.png
```

Generate a PDF:

```bash
curl -X POST http://localhost:3000/pdf \
    -H "Content-Type: application/json" \
    -d '{"url": "https://example.com"}' -o page.pdf
```

## Configuration

- `CONCURRENT`: Max concurrent browser sessions (default: 3)
- `TIMEOUT`: Session timeout in ms (default: 30000)
- `BROWSERLESS_TOKEN`: Optional API token for authentication
