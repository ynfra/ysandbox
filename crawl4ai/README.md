# Crawl4AI

AI-powered web crawler and scraper with built-in browser automation. Extracts structured data from websites using LLM-based extraction strategies.

## Services

- **crawl4ai**: Crawl4AI server with headless Chromium

## Ports

- `11235`: Crawl4AI API endpoint

## Usage

```bash
make docker-up
```

## Examples

Basic crawl:

```bash
curl -X POST http://localhost:11235/crawl \
    -H "Content-Type: application/json" \
    -d '{"urls": ["https://example.com"]}'
```

## Configuration

Optional LLM API keys for AI-powered extraction (set in environment or `.env`):

- `OPENAI_API_KEY`: OpenAI API key
- `ANTHROPIC_API_KEY`: Anthropic API key

Resource limits: 4GB memory limit, 1GB shared memory for Chromium.
