# Qdrant

![qdrant dashboard](docs/dashboard.png)

High-performance vector database for similarity search and AI applications. Supports filtering, payload storage, and distributed deployment.

## Running

```bash
docker compose up -d
```

- **REST API**: [`http://localhost:6333`](http://localhost:6333)
- Web **dashboard**: [`http://localhost:6333/dashboard`](http://localhost:6333/dashboard)
  — browse collections, run queries, and inspect points.
- **gRPC API**: `localhost:6334`
- No authentication by default (the `QDRANT__SERVICE__API_KEY` env var is
  commented out in `docker-compose.yml`). Storage persists in `.docker/storage/`.

## Services

- **qdrant**: Qdrant vector database server

## Ports

- `6333`: REST API
- `6334`: gRPC API

## Usage

```bash
make docker-up
```

## Examples

Create a collection:

```bash
curl -X PUT http://localhost:6333/collections/my_collection \
    -H "Content-Type: application/json" \
    -d '{"vectors": {"size": 384, "distance": "Cosine"}}'
```

Search vectors:

```bash
curl -X POST http://localhost:6333/collections/my_collection/points/search \
    -H "Content-Type: application/json" \
    -d '{"vector": [0.1, 0.2, ...], "limit": 5}'
```

## Configuration

- `QDRANT__SERVICE__API_KEY`: Optional API key for authentication
- Vector data is persisted in `.docker/storage/`
- Dashboard available at http://localhost:6333/dashboard
