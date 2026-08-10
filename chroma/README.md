# Chroma

AI-native open-source vector/embedding database for LLM apps and semantic
search. Stores documents, embeddings, and metadata in collections and serves
similarity queries over a REST API (v2) with first-class Python and JS clients.

## Usage

```bash
make docker-up
```

- REST API: http://localhost:8000 (v2 API under `/api/v2`; v1 was removed in
  Chroma 1.x)

```bash
curl http://localhost:8000/api/v2/heartbeat
# {"nanosecond heartbeat":1783247931920648418}
```

No authentication by default — sandbox use only.

<details>
<summary>API examples</summary>

Create a collection (returns the collection `id` used in later calls):

```bash
curl -X POST http://localhost:8000/api/v2/tenants/default_tenant/databases/default_database/collections \
    -H "Content-Type: application/json" \
    -d '{"name": "my_collection"}'
```

List collections:

```bash
curl http://localhost:8000/api/v2/tenants/default_tenant/databases/default_database/collections
```

Add embeddings:

```bash
curl -X POST http://localhost:8000/api/v2/tenants/default_tenant/databases/default_database/collections/<collection-id>/add \
    -H "Content-Type: application/json" \
    -d '{"ids": ["doc1"], "embeddings": [[0.1, 0.2, 0.3]], "documents": ["hello chroma"]}'
```

Query by similarity:

```bash
curl -X POST http://localhost:8000/api/v2/tenants/default_tenant/databases/default_database/collections/<collection-id>/query \
    -H "Content-Type: application/json" \
    -d '{"query_embeddings": [[0.1, 0.2, 0.3]], "n_results": 1}'
```

</details>

## Services

| Container | Port(s) | Description |
|-----------|---------|-------------|
| **chroma** | `8000` | Chroma vector database server (v2 REST API) |

## Configuration

No environment variables are required; the image runs single-node with
persistence enabled out of the box.

| Variable | Default | Notes |
|----------|---------|-------|
| `ANONYMIZED_TELEMETRY` | `true` | Set to `false` to opt out of anonymized product telemetry |

## Volumes

| Path | Contents |
|------|----------|
| `.docker/data/` | Collections, embeddings, and metadata (SQLite + index files) |

## Observability

| Check | Endpoint / Command |
|-------|--------------------|
| Heartbeat | `curl http://localhost:8000/api/v2/heartbeat` |
| Health | `curl http://localhost:8000/api/v2/healthcheck` |
| API version | `curl http://localhost:8000/api/v2/version` |
| Logs | `docker compose logs -f chroma` |

## Resources

- GitHub: https://github.com/chroma-core/chroma
- Docs: https://docs.trychroma.com
