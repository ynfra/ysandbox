# Langflow

![langflow](docs/dashboard.png)

Visual, low-code builder for AI workflows and agents. Drag-and-drop components
into flows, wire up LLMs, vector stores, prompts, and tools, then run or expose
them via API. Every Langflow project also ships a built-in MCP server, so any
flow can be published as an MCP tool for external agents to call. Backed by
PostgreSQL for flow, user, and secret storage.

## Services

| Service | Description |
|---------|-------------|
| **langflow** | Langflow web UI, REST API, and per-project MCP server |
| **postgres** | PostgreSQL 16 for flows, users, secrets, and monitor data |

## Ports

| Port | Service |
|------|---------|
| `7860` | Langflow web UI + API |

## Usage

```bash
make docker-up
```

Open http://localhost:7860 — the flow editor loads once DB migrations finish
(first start takes a bit longer while the image initializes the database).

## Configuration

Key environment variables in `.env`:

| Variable | Default | Notes |
|----------|---------|-------|
| `POSTGRES_USER` | `langflow` | Database user |
| `POSTGRES_PASSWORD` | `langflow` | Database password |
| `POSTGRES_DB` | `langflow` | Database name |
| `LANGFLOW_DATABASE_URL` | `postgresql://langflow:langflow@postgres:5432/langflow` | Connection string to postgres |
| `LANGFLOW_CONFIG_DIR` | `/app/langflow` | In-container path for logs, file storage, secret keys (persisted to `.docker/langflow`) |

Optional superuser login (uncomment in `.env`): set `LANGFLOW_AUTO_LOGIN=false`
plus `LANGFLOW_SUPERUSER` / `LANGFLOW_SUPERUSER_PASSWORD` to require
authentication instead of the default open access.

## MCP server

Each Langflow **project** exposes an MCP server over SSE. Point an MCP client at:

```
http://localhost:7860/api/v1/mcp/project/<project-id>/sse
```

Replace `<project-id>` with the ID of your project (visible in the URL / project
settings). Flows added to that project become callable MCP tools. See the docs
for authentication and tool configuration: https://docs.langflow.org/mcp-server

## Links

- GitHub: https://github.com/langflow-ai/langflow
- Docs: https://docs.langflow.org
- MCP: https://docs.langflow.org/mcp-server
