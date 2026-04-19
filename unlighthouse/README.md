# Unlighthouse

Scans an entire website with Google Lighthouse and presents results in a modern web dashboard. Provides performance, accessibility, best practices, and SEO scores for every page.

## Services

- **unlighthouse**: Unlighthouse web dashboard

## Ports

- `5678`: Unlighthouse web UI

## Usage

```bash
make docker-up
```

## Configuration

- `SITE`: Target website URL to scan (default: `https://example.com`)

Change the `SITE` environment variable in `docker-compose.yml` to point to the website you want to audit.
