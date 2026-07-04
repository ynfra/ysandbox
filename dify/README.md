# Dify

Open-source LLM app development platform — visual workflow/agent builder, RAG pipelines, prompt orchestration, and a model-agnostic backend (100k+ ⭐). Build assistants, agents and chat apps in a drag-and-drop canvas, then expose them as APIs or **MCP servers**. This is a large, multi-container stack; the compose here is a sandbox-trimmed but bootable subset of the official `docker/` deployment (Dify `1.15.0`).

## Services

| Service | Image | Description |
|---------|-------|-------------|
| **nginx** | `nginx:latest` | Entry reverse proxy — single door to web + api |
| **web** | `langgenius/dify-web:1.15.0` | Next.js console / app UI |
| **api** | `langgenius/dify-api:1.15.0` | Console + service REST API (Flask/Gunicorn) |
| **worker** | `langgenius/dify-api:1.15.0` | Celery worker (datasets, workflows, mail) |
| **db** | `postgres:15-alpine` | PostgreSQL — app metadata and config |
| **redis** | `redis:6-alpine` | Cache + Celery broker |
| **weaviate** | `semitechnologies/weaviate:1.27.0` | Vector store for RAG embeddings |
| **sandbox** | `langgenius/dify-sandbox:0.2.15` | Secure code-execution runtime |
| **ssrf_proxy** | `ubuntu/squid:latest` | Squid forward proxy guarding sandbox egress |
| **init_permissions** | `busybox:latest` | One-shot init that fixes storage ownership |

Optional upstream services (`plugin_daemon`, `api_websocket`, `certbot`, MySQL, and the alternative vector stores such as Qdrant / pgvector / Milvus / OpenSearch) are intentionally omitted for a lean local sandbox.

## Ports

| Port | Service |
|------|---------|
| `8080` | nginx entry proxy (host `8080` → container `80`) |

All other services are reachable only on the internal Compose networks.

## Usage

```bash
make docker-up
```

Then open http://localhost:8080 — on first launch you are redirected to
http://localhost:8080/install to create the initial admin account.

> **Note:** The API runs database migrations on first boot, so the console may
> take a minute or two to become reachable while `api`/`worker` initialize.

## Configuration

Key environment variables live in `.env` (loaded via `env_file:`). All defaults
are **sandbox-safe only — change them before any real use.**

| Variable | Default | Notes |
|----------|---------|-------|
| `SECRET_KEY` | `sk-dify-sandbox-CHANGE-ME…` | Session/data signing key — generate with `openssl rand -base64 42` |
| `DB_PASSWORD` | `difyai123456` | PostgreSQL password |
| `REDIS_PASSWORD` | `difyai123456` | Redis password (also in `CELERY_BROKER_URL`) |
| `VECTOR_STORE` | `weaviate` | Vector backend |
| `WEAVIATE_API_KEY` | `WVF5…pkih` | Weaviate API key |
| `SANDBOX_API_KEY` | `dify-sandbox` | Code-execution sandbox key |
| `EXPOSE_NGINX_PORT` | `8080` | Host port for the entry proxy |

Admin setup: visit http://localhost:8080/install on first run to create the
owner account, then sign in and configure a model provider (OpenAI, Anthropic,
Ollama, etc.) under **Settings → Model Provider** before building apps.

### MCP servers

Dify apps and workflows can be **published as MCP (Model Context Protocol)
servers**, letting external MCP clients (IDEs, agents, other LLM tools) call
your Dify apps as tools. Publish an app, then expose it via its MCP endpoint
under the app's API/access settings.

## Links

- GitHub: https://github.com/langgenius/dify
- Docs: https://docs.dify.ai
