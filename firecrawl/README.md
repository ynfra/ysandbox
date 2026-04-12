# Firecrawl

Web scraping and crawling API with browser automation, structured data extraction, and queue-based job processing.

## Services

- **api**: Firecrawl API server
- **playwright-service**: Headless browser for JavaScript-rendered pages
- **redis**: Redis for rate limiting and caching
- **rabbitmq**: RabbitMQ for job queue management
- **nuq-postgres**: PostgreSQL for persistent storage

## Ports

- `3002`: Firecrawl API endpoint

## Usage

```bash
make docker-up
```

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
