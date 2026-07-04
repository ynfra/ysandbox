# Langfuse

![langfuse](docs/dashboard.png)

Open-source LLM engineering platform — tracing, evals, prompt versioning, datasets, cost tracking, and playground. The most complete self-hostable LangSmith alternative (27k ⭐, MIT license). Pairs naturally with the litellm-proxy stack already in ysandbox.

## Services

| Service | Description |
|---------|-------------|
| **langfuse-web** | Next.js web UI and REST API server |
| **langfuse-worker** | Background job worker for async trace processing |
| **postgres** | PostgreSQL 17 for project metadata and config |
| **clickhouse** | ClickHouse for high-performance trace/span analytics |
| **redis** | Redis queue for worker job dispatch |
| **minio** | S3-compatible object storage for events and media |

## Ports

| Port | Service |
|------|---------|
| `3000` | Web UI |
| `9090` | MinIO S3 API (for direct SDK use) |

## Usage

```bash
make docker-up
```

Open http://localhost:3000 — create an account on first visit.

> **Security:** Before production use, generate real secrets:
> ```bash
> openssl rand -hex 32  # NEXTAUTH_SECRET
> openssl rand -hex 16  # SALT
> openssl rand -hex 32  # ENCRYPTION_KEY (use 64 hex chars)
> ```

## Running

```bash
docker compose up -d
```

- **UI:** http://localhost:3000
- **MinIO S3 API:** http://localhost:9090

First run: **sign up** to create the initial user, then create an
**Organization** and a **Project** — the project dashboard is where traces, API
keys, and evals live. Grab the project's public / secret keys (Settings → API
Keys) for the SDK snippets below.

## Notes

- Multi-container stack (web + worker + Postgres + ClickHouse + Redis + MinIO)
  with `depends_on` health gates — **first boot takes a while** until every
  dependency reports healthy.
- Datastores persist under `.docker/` (`postgres/`, `clickhouse/`, `redis/`,
  `minio/`).

## Configuration

Key environment variables in `.env`:

| Variable | Default | Notes |
|----------|---------|-------|
| `NEXTAUTH_SECRET` | `mysecret` | Session signing key — **change** |
| `SALT` | `mysalt` | Data hashing salt — **change** |
| `ENCRYPTION_KEY` | `000...` | 64-hex AES-256 key — **change** |
| `POSTGRES_PASSWORD` | `postgres` | Database password |
| `CLICKHOUSE_PASSWORD` | `clickhouse` | ClickHouse password |
| `REDIS_AUTH` | `myredissecret` | Redis auth password |
| `MINIO_ROOT_PASSWORD` | `miniosecret` | MinIO admin password |
| `TELEMETRY_ENABLED` | `false` | Usage analytics opt-in |

## SDK Integration

**Python:**
```python
pip install langfuse
from langfuse import Langfuse

langfuse = Langfuse(
    public_key="pk-lf-...",   # Settings → API Keys in UI
    secret_key="sk-lf-...",
    host="http://localhost:3000"
)
```

**LangChain callback:**
```python
from langfuse.callback import CallbackHandler

handler = CallbackHandler(
    public_key="pk-lf-...",
    secret_key="sk-lf-...",
    host="http://localhost:3000"
)
chain.invoke({"input": "..."}, config={"callbacks": [handler]})
```

**LiteLLM integration** (auto-traces all calls via the ysandbox litellm-proxy):
```yaml
# litellm/config.yml
litellm_settings:
  success_callback: ["langfuse"]
  failure_callback: ["langfuse"]

environment_variables:
  LANGFUSE_PUBLIC_KEY: "pk-lf-..."
  LANGFUSE_SECRET_KEY: "sk-lf-..."
  LANGFUSE_HOST: "http://langfuse-web:3000"
```
