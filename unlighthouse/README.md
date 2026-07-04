# Unlighthouse

![unlighthouse](docs/dashboard.png)

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

## Running

```bash
docker compose up -d
```

Then open the dashboard at http://localhost:5678. The scan runs in the
background: Unlighthouse crawls the target `SITE`, runs Lighthouse on each
discovered route, and the dashboard populates live with per-route and total
scores as results come in.

## Notes

- `SITE` (in `docker-compose.yml`) is the required target URL. It ships with a
  sandbox-safe default of `https://example.com`. Point it at the site you want
  to audit before bringing the stack up.
- For a single-page target like `example.com`, only `/` is scanned (no sitemap
  or internal links to crawl), so the dashboard shows one scored route. A real
  multi-page site populates many routes.
- First boot pulls the `ghcr.io/indykoning/unlighthouse-docker:master` image
  (~430 MB) and needs outbound internet to reach the target site.
- The screenshot above was captured against `https://example.com` (total score
  94, scan 100% complete).
