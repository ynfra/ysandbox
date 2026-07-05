# Langflow

Visual, low-code builder for AI workflows and agents. Drag-and-drop components
into flows, wire up LLMs, vector stores, prompts, and tools, then run or expose
them via API. Every Langflow project also ships a built-in MCP server, so any
flow can be published as an MCP tool for external agents to call. Backed by
PostgreSQL for flow, user, and secret storage.

![langflow](docs/dashboard.png)

## Usage

```bash
make docker-up
```

Open http://localhost:7860 — the flow editor loads once DB migrations finish
(first start takes a bit longer while the image initializes the database). With
this stack's defaults **no login is required** (`LANGFLOW_AUTO_LOGIN` left unset,
auto-login on), so the editor opens directly.

To require authentication, uncomment `LANGFLOW_AUTO_LOGIN=false` plus
`LANGFLOW_SUPERUSER` / `LANGFLOW_SUPERUSER_PASSWORD` (and a
`LANGFLOW_SECRET_KEY`) in `.env`, then log in with those credentials.

<details><summary>API examples</summary>

Each Langflow **project** exposes an MCP server over SSE. Point an MCP client at:

```
http://localhost:7860/api/v1/mcp/project/<project-id>/sse
```

Replace `<project-id>` with your project's ID (visible in the URL / project
settings). Flows added to that project become callable MCP tools. See
https://docs.langflow.org/mcp-server for auth and tool configuration.

</details>

## Services

| Container | Port(s) | Description |
|-----------|---------|-------------|
| **langflow** | `7860` | Langflow web UI, REST API, and per-project MCP server |
| **postgres** | — | PostgreSQL 16 for flows, users, secrets, and monitor data |

## Configuration

Environment variables in `.env` (sandbox-safe defaults):

| Variable | Default | Notes |
|----------|---------|-------|
| `POSTGRES_USER` | `langflow` | Database user |
| `POSTGRES_PASSWORD` | `langflow` | Database password — **change** for real use |
| `POSTGRES_DB` | `langflow` | Database name |
| `LANGFLOW_DATABASE_URL` | `postgresql://langflow:langflow@postgres:5432/langflow` | Connection string to Postgres |
| `LANGFLOW_CONFIG_DIR` | `/app/langflow` | In-container path for logs, file storage, secret keys (persisted to `.docker/langflow`) |

Optional superuser login (uncomment in `.env`): set `LANGFLOW_AUTO_LOGIN=false`
plus `LANGFLOW_SUPERUSER` / `LANGFLOW_SUPERUSER_PASSWORD` to require
authentication instead of the default open access.

## Volumes

| Path | Contents |
|------|----------|
| `.docker/langflow/` | Logs, file storage, and secret keys (`LANGFLOW_CONFIG_DIR`) |
| `.docker/postgres/` | PostgreSQL 16 data — flows, users, secrets, monitor data |

## Observability

| Check | Endpoint / Command |
|-------|--------------------|
| Health | `curl http://localhost:7860/health` (compose healthcheck) |
| Flow editor + API | `http://localhost:7860` |
| Logs | `docker compose logs -f langflow` |

## Resources

- GitHub: https://github.com/langflow-ai/langflow
- Docs: https://docs.langflow.org
- MCP: https://docs.langflow.org/mcp-server
