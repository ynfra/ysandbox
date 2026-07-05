# Weaviate

Open-source vector database with hybrid search — combines vector similarity
(HNSW) with BM25 keyword search, exposes REST, GraphQL, and gRPC APIs, and
ships optional vectorizer/reranker/generative modules for many providers.

This sandbox runs with `DEFAULT_VECTORIZER_MODULE: none`, so it has no
external model dependencies — you bring your own vectors on insert and query
(like Qdrant). Anonymous access is enabled — local sandbox use only.

## Usage

```bash
make docker-up
```

- REST API: http://localhost:8080/v1
- GraphQL API: http://localhost:8080/v1/graphql
- gRPC API: `localhost:50051`

Verify it is up:

```bash
curl http://localhost:8080/v1/.well-known/ready   # 200 when ready
curl http://localhost:8080/v1/meta                # {"version": "1.38.2", ...}
```

<details>
<summary>API examples</summary>

Create a class (bring-your-own-vectors):

```bash
curl -X POST http://localhost:8080/v1/schema \
    -H "Content-Type: application/json" \
    -d '{"class": "SandboxDoc", "vectorizer": "none", "properties": [{"name": "title", "dataType": ["text"]}]}'
```

Insert an object with a vector:

```bash
curl -X POST http://localhost:8080/v1/objects \
    -H "Content-Type: application/json" \
    -d '{"class": "SandboxDoc", "properties": {"title": "hello weaviate"}, "vector": [0.1, 0.2, 0.3, 0.4]}'
```

Query by vector similarity (GraphQL):

```bash
curl -X POST http://localhost:8080/v1/graphql \
    -H "Content-Type: application/json" \
    -d '{"query": "{ Get { SandboxDoc(nearVector: {vector: [0.1, 0.2, 0.3, 0.4]}, limit: 1) { title _additional { id distance } } } }"}'
```

</details>

## Services

| Container | Port(s) | Description |
|-----------|---------|-------------|
| **weaviate** | `8080` (REST + GraphQL), `50051` (gRPC) | Weaviate vector database server |

## Configuration

Environment variables in `docker-compose.yml` (sandbox-safe defaults):

| Variable | Default | Notes |
|----------|---------|-------|
| `AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED` | `true` | No auth — **disable and configure API keys** for anything but local use |
| `PERSISTENCE_DATA_PATH` | `/var/lib/weaviate` | Data directory inside the container |
| `DEFAULT_VECTORIZER_MODULE` | `none` | Bring your own vectors; set e.g. `text2vec-openai` to vectorize server-side |
| `QUERY_DEFAULTS_LIMIT` | `25` | Default result limit when a query specifies none |
| `CLUSTER_HOSTNAME` | `node1` | Node name (required for single-node persistence) |

## Volumes

| Path | Contents |
|------|----------|
| `.docker/data/` | Schema, objects, vectors, and indexes |

## Observability

| Check | Endpoint / Command |
|-------|--------------------|
| Readiness | `curl http://localhost:8080/v1/.well-known/ready` |
| Liveness | `curl http://localhost:8080/v1/.well-known/live` |
| Meta / version | `curl http://localhost:8080/v1/meta` |
| Logs | `docker compose logs -f weaviate` |

## Resources

- GitHub: https://github.com/weaviate/weaviate
- Docs: https://docs.weaviate.io
