# SearXNG

![searxng](docs/dashboard.png)

Self-hosted meta-search engine that aggregates results from 70+ search engines. Provides both a web UI and a JSON API.

## Running

```bash
docker compose up -d
```

- Open [`http://localhost:8080`](http://localhost:8080) and run a query — the
  results page aggregates hits from the configured upstream engines.
- The JSON API is available at the same port
  (`http://localhost:8080/search?q=<query>&format=json`).
- No authentication. A Valkey (Redis-compatible) container backs rate limiting
  and caching; search data persists in `.docker/data/`.

## Services

- **searxng**: SearXNG search engine
- **redis**: Valkey (Redis-compatible) for rate limiting and caching

## Ports

- `8080`: SearXNG web UI and API

## Usage

```bash
make docker-up
```

## Examples

Web search via JSON API:

```bash
curl "http://localhost:8080/search?q=hello+world&format=json"
```

## Configuration

Edit `settings.yml` to customize:

- `server.secret_key`: Instance secret key
- `search.safe_search`: Safe search level (0=off, 1=moderate, 2=strict)
- `search.default_lang`: Default search language
- `ui.theme_args.simple_style`: Theme (`dark` or `light`)

Search data is persisted in `.docker/data/`
