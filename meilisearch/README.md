# Meilisearch

Lightning-fast, typo-tolerant search engine with a simple REST API. Index JSON
documents and get relevant, ranked full-text search results in milliseconds —
ideal as the search backend for apps, docs sites, and e-commerce catalogs.

Runs in `development` mode here, which enables the built-in search preview UI
and relaxes production-only checks. A sandbox master key is set so the API
examples below work with authentication, as they would in production.

## Usage

```bash
make docker-up
```

- REST API: http://localhost:7700
- Search preview UI: http://localhost:7700 — development-mode mini dashboard
  for browsing indexes and trying searches (enter the master key when prompted).

All API calls require the master key: `Authorization: Bearer meili-sandbox-key`.

<details>
<summary>API examples</summary>

Add documents to an index (the index is created automatically; indexing is
async — note the returned `taskUid`):

```bash
curl -X POST http://localhost:7700/indexes/movies/documents \
    -H "Authorization: Bearer meili-sandbox-key" \
    -H "Content-Type: application/json" \
    -d '[
      {"id": 1, "title": "Carol", "genres": ["Romance", "Drama"]},
      {"id": 2, "title": "Wonder Woman", "genres": ["Action", "Adventure"]},
      {"id": 3, "title": "Life of Pi", "genres": ["Adventure", "Drama"]}
    ]'
```

Check the async task status (wait for `"status": "succeeded"`):

```bash
curl http://localhost:7700/tasks/0 \
    -H "Authorization: Bearer meili-sandbox-key"
```

Search (typo-tolerant — `wondr womn` still finds Wonder Woman):

```bash
curl -X POST http://localhost:7700/indexes/movies/search \
    -H "Authorization: Bearer meili-sandbox-key" \
    -H "Content-Type: application/json" \
    -d '{"q": "wondr womn"}'
```

</details>

## Services

| Container | Port(s) | Description |
|-----------|---------|-------------|
| **meilisearch** | `7700` | Meilisearch server — REST API + search preview UI |

## Configuration

Environment variables in `docker-compose.yml`:

| Variable | Default | Notes |
|----------|---------|-------|
| `MEILI_ENV` | `development` | Enables the search preview UI — **set `production`** for real use |
| `MEILI_MASTER_KEY` | `meili-sandbox-key` | API master key; sandbox-only value — **change** for real use (production requires a strong key of 16+ bytes) |

## Volumes

| Path | Contents |
|------|----------|
| `.docker/meili_data/` | Indexes, documents, tasks, and settings (`data.ms`) |

## Observability

| Check | Endpoint / Command |
|-------|--------------------|
| Health | `curl http://localhost:7700/health` → `{"status":"available"}` |
| Version | `curl -H "Authorization: Bearer meili-sandbox-key" http://localhost:7700/version` |
| Stats | `curl -H "Authorization: Bearer meili-sandbox-key" http://localhost:7700/stats` |
| Logs | `docker compose logs -f meilisearch` |

## Resources

- GitHub: https://github.com/meilisearch/meilisearch
- Docs: https://www.meilisearch.com/docs
