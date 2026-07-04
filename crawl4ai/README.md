# Crawl4AI

![crawl4ai](docs/dashboard.png)

AI-powered web crawler and scraper with built-in browser automation. Extracts structured data from websites using LLM-based extraction strategies.

## Services

- **crawl4ai**: Crawl4AI server with headless Chromium

## Ports

- `11235`: Crawl4AI API endpoint

## Usage

```bash
make docker-up
```

## Running

```bash
docker compose up -d
```

- API: <http://localhost:11235> (health at `/health`)
- Interactive **playground** UI: <http://localhost:11235/playground> — build/run
  requests, inspect the JSON response, and copy the equivalent Python/cURL.
- API docs: <http://localhost:11235/docs>

The image is large (multi-GB); first `docker compose up -d` pulls it and boot
takes a minute or two while the browser pool warms up.

Every request (including the `/playground` UI and its assets) must carry the
API token as a bearer header — only `/health` and `/token` are public:

```bash
curl -X POST http://localhost:11235/crawl \
    -H "Authorization: Bearer ${CRAWL4AI_API_TOKEN:-crawl4ai-sandbox}" \
    -H "Content-Type: application/json" \
    -d '{"urls": ["https://example.com"]}'
```

## Notes

- **Loopback-by-default bind (boot gotcha).** crawl4ai ≥ 0.9.0 refuses to
  expose the API on non-loopback interfaces without a credential — its
  `entrypoint.sh` binds gunicorn to `127.0.0.1` unless `CRAWL4AI_API_TOKEN`
  (or JWT) is set, so the published host port `11235` is dead otherwise. This
  stack sets a sandbox-safe `CRAWL4AI_API_TOKEN` (default `crawl4ai-sandbox`)
  so `docker compose up -d` yields a reachable, authenticated API. Override it
  via env for anything exposed off-host.
- The container reports `healthy` from its internal `/health` probe even while
  the host port is unreachable — check `Listening at: http://[::]:11235` (not
  `127.0.0.1`) in `docker compose logs` to confirm the host-facing bind.

## Examples

Basic crawl:

```bash
curl -X POST http://localhost:11235/crawl \
    -H "Authorization: Bearer ${CRAWL4AI_API_TOKEN:-crawl4ai-sandbox}" \
    -H "Content-Type: application/json" \
    -d '{"urls": ["https://example.com"]}'
```

## Configuration

Optional LLM API keys for AI-powered extraction (set in environment or `.env`):

- `CRAWL4AI_API_TOKEN`: bearer token required by all API endpoints (default `crawl4ai-sandbox`)
- `OPENAI_API_KEY`: OpenAI API key
- `ANTHROPIC_API_KEY`: Anthropic API key

Resource limits: 4GB memory limit, 1GB shared memory for Chromium.
