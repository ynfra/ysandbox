# Browserless

Headless Chromium API for browser automation, screenshots, PDF generation, and scraping.

## Services

- **browserless**: Browserless Chromium server

## Ports

- `3000`: Browserless API endpoint

## Usage

```bash
make docker-up
```

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
