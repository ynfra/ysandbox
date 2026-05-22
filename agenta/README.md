# Agenta

Open-source LLM engineering platform — prompt playground, side-by-side testing, evaluations, tracing, and datasets. Purpose-built for iterating on LLM applications with human and automated evals.

## Services

| Service | Description |
|---------|-------------|
| **traefik** | Reverse proxy routing `/api`, `/services`, `/` paths |
| **web** | Next.js web UI |
| **api** | FastAPI/Gunicorn backend (routes via `/api`) |
| **alembic** | One-time database migration runner (init container) |
| **worker-evaluations** | Celery worker — evaluation jobs |
| **worker-tracing** | Celery worker — trace processing |
| **worker-webhooks** | Celery worker — webhook delivery |
| **worker-events** | Celery worker — event processing |
| **cron** | Scheduled jobs (supercronic) |
| **services** | Additional services layer (routes via `/services`) |
| **supertokens** | Auth service (SuperTokens + PostgreSQL) |
| **postgres** | PostgreSQL 17 (agenta + supertokens databases) |
| **redis-volatile** | Redis (LRU eviction) — Celery broker + cache |
| **redis-durable** | Redis (AOF persistence) — Celery results |

## Ports

| Port | Service |
|------|---------|
| `8081` | Web UI (via Traefik) |
| `8082` | Traefik dashboard (localhost-only) |
| `6381` | Redis durable (localhost-only) |

> Port `8081` is configurable via `AGENTA_PORT` in `.env`.

## Usage

```bash
make docker-up
```

Open http://localhost:8081 — create an account on first visit.

> **Note:** First startup runs database migrations (`alembic` container). Allow 1–2 minutes for all services to become ready.

## Configuration

Key environment variables in `.env`:

| Variable | Default | Notes |
|----------|---------|-------|
| `AGENTA_AUTH_KEY` | `changeme-...` | Auth signing key — **change in production** |
| `AGENTA_CRYPT_KEY` | `changeme-...` | Encryption key — **change in production** |
| `POSTGRES_PASSWORD` | `agenta` | PostgreSQL password |
| `AGENTA_PORT` | `8081` | External port for the UI |

Generate secure keys:
```bash
openssl rand -hex 32
```

## SDK Integration

**Python:**
```python
pip install agenta
import agenta as ag

ag.init(
    host="http://localhost:8081",
    app_name="my-app",
)

@ag.instrument()
def my_llm_call(prompt: str) -> str:
    # your LLM call here
    return response
```

**LangChain:**
```python
from agenta.sdk.tracing.integrations.langchain import AgentaCallbackHandler

handler = AgentaCallbackHandler()
chain.invoke({"input": "..."}, config={"callbacks": [handler]})
```
