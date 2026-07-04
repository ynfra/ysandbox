# Firecrawl

![firecrawl](docs/dashboard.png)

Web scraping and crawling API with browser automation, structured data extraction, and queue-based job processing.

## Services

- **api**: Firecrawl API server
- **playwright-service**: Headless browser for JavaScript-rendered pages
- **redis**: Redis for rate limiting and caching
- **rabbitmq**: RabbitMQ for job queue management
- **nuq-postgres**: PostgreSQL for persistent storage

## Ports

- `3002`: Firecrawl API endpoint

## Running

```bash
docker compose up -d      # or: make docker-up
```

Multi-container stack (api + worker harness, playwright-service, redis,
rabbitmq, nuq-postgres). The API is served on host port `3002` and returns
`200` within ~15-20s of boot. Firecrawl is **API-first** — the root path
returns a small status JSON:

```bash
curl -s http://localhost:3002
# {"message":"Firecrawl API","documentation_url":"https://docs.firecrawl.dev"}
```

Sample scrape request:

```bash
curl -X POST http://localhost:3002/v1/scrape \
    -H "Content-Type: application/json" \
    -d '{"url": "https://example.com"}'
```

## Notes

- The screenshot above is the **Bull queue dashboard** (the stack's only rich
  UI), reachable at `http://localhost:3002/admin/firecrawl-sandbox-key/queues`.
  It shows the scrape/crawl job queues (`billingQueue`, `deepResearchQueue`,
  `generateLlmsTxtQueue`, `precrawlQueue`, ...). The admin path key is the
  `BULL_AUTH_KEY` set in `docker-compose.yml` (`firecrawl-sandbox-key`).
- `rabbitmq` uses a healthcheck; the `api` waits for it via
  `depends_on: condition: service_healthy`, so first boot is gated on RabbitMQ
  becoming healthy (~10s).
- No repo-config changes were needed — plain `docker compose up -d` boots clean.

## Examples

Scrape a single page:

```bash
curl -X POST http://localhost:3002/v1/scrape \
    -H "Content-Type: application/json" \
    -d '{"url": "https://example.com"}'
```

Crawl a website:

```bash
curl -X POST http://localhost:3002/v1/crawl \
    -H "Content-Type: application/json" \
    -d '{"url": "https://example.com", "limit": 10}'
```

Queue admin UI: http://localhost:3002/admin/firecrawl-sandbox-key/queues

## Configuration

Optional environment variables (set in shell or `.env`):

- `OPENAI_API_KEY`: For AI-powered extraction features
- `OPENAI_BASE_URL`: Custom LLM endpoint (e.g., OpenRouter)
- `MODEL_NAME`: LLM model for extraction

Data is persisted in `.docker/` subdirectories (redis, rabbitmq, postgres).
