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
make docker-up
```

Open http://localhost:5173 — no login required by default.

> **Note:** First startup takes 2–3 minutes. The Java backend runs database migrations (Liquibase for MySQL + ClickHouse) before becoming healthy.

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
