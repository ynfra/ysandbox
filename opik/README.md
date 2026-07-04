# Comet Opik

![opik](docs/dashboard.png)

Open-source LLM observability and evaluation platform — tracing, experiments, prompt versioning, LLM-as-judge evals, and CI/CD integration. Apache-2.0 licensed.

## Services

| Service | Description |
|---------|-------------|
| **frontend** | Nginx web UI |
| **backend** | Java API server (Spring Boot) with MySQL + ClickHouse migrations |
| **python-backend** | Python evaluation service (runs user code in isolated containers) |
| **mysql** | MySQL 8 for relational/metadata storage |
| **clickhouse** | ClickHouse for trace/span analytics |
| **zookeeper** | ZooKeeper for ClickHouse coordination |
| **redis** | Redis cache and session store |
| **minio** | MinIO S3-compatible object storage |
| **mc** | One-time MinIO bucket initializer |

## Ports

| Port | Service |
|------|---------|
| `5173` | Web UI |
| `9001` | MinIO Console (admin, localhost-only) |

## Usage

```bash
make docker-up      # or: docker compose up -d
```

Open http://localhost:5173 — no login required by default.

> **Note:** First startup takes 2–3 minutes. The Java backend runs database migrations (Liquibase for MySQL + ClickHouse) before becoming healthy.

## Running

One command brings the whole stack up out of the box — no override needed:

```bash
docker compose up -d
```

- **Frontend / API:** http://localhost:5173 (the frontend nginx proxies `/api` to the backend).
- **Multi-container stack:** `mysql`, `clickhouse`, `redis`, `zookeeper`, `minio`,
  `backend`, `python-backend`, and `frontend` all boot together, ordered by
  healthchecks (`docker compose ps` should show every service `healthy`).
- **ClickHouse cluster / macros:** ClickHouse mounts `clickhouse-macros.xml` into
  `/etc/clickhouse-server/config.d/`. This supplies the `macros`, `zookeeper`, and
  `remote_servers` cluster definition that the backend's ClickHouse migrations
  require for `ReplicatedMergeTree` tables and `ON CLUSTER` DDL. Without it the
  migrations fail and the backend never becomes healthy.
- **Frontend nginx:** `nginx_default.conf.template` is mounted into
  `/etc/nginx/templates/` and rendered with `NGINX_PORT=5173`, exposing the `/api`
  reverse proxy and the `/health` endpoint used by the healthcheck.
- **DB migrations:** the backend runs `run_db_migrations.sh` (MySQL + ClickHouse)
  before starting the app; expect ~1–2 min before it reports healthy on first boot.

> **Security note:** `python-backend` mounts the host Docker socket
> (`/var/run/docker.sock`) so it can spawn ephemeral `sandbox-executor`
> containers to run user-supplied evaluation code. A Docker-socket mount is
> host-root-equivalent — only run this stack on trusted local machines.

To stop:

```bash
docker compose down       # add -v to also drop the .docker/ volumes
```

## Configuration

Key environment variables in `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `MYSQL_PASSWORD` | `opik` | MySQL user password |
| `CLICKHOUSE_PASSWORD` | `opik` | ClickHouse password |
| `REDIS_PASSWORD` | `opik` | Redis password |
| `MINIO_ROOT_USER` | `opik-access-key` | MinIO access key |
| `MINIO_ROOT_PASSWORD` | `opik-secret-key` | MinIO secret key |

## SDK Integration

**Python:**
```python
pip install opik
import opik
opik.configure(use_local=True)  # points to http://localhost:5173

from opik.integrations.openai import track_openai
from openai import OpenAI

client = track_openai(OpenAI())
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello"}]
)
```

**LangChain:**
```python
from opik.integrations.langchain import OpikTracer

tracer = OpikTracer()
chain.invoke({"input": "..."}, config={"callbacks": [tracer]})
```
