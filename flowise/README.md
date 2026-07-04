# Flowise

![flowise](docs/dashboard.png)

Visual drag-and-drop builder for LLM agents and workflows. Compose chatflows, agents, and RAG pipelines from a node graph, then expose them via REST API or embed them. Ships with a large node library (LLMs, vector stores, tools, memory). Uses SQLite out of the box — no external database required.

## Services

| Service | Description |
|---------|-------------|
| **flowise** | Flowise app (UI + REST API), SQLite storage |

## Ports

| Port | Service |
|------|---------|
| `3000` | Flowise UI + API |

## Usage

```bash
make docker-up
```

Open http://localhost:3000 and sign in with the basic-auth credentials below.

## Configuration

Environment variables in `.env`:

| Variable | Default | Notes |
|----------|---------|-------|
| `FLOWISE_USERNAME` | `admin` | Basic-auth username — **change** |
| `FLOWISE_PASSWORD` | `admin` | Basic-auth password — **change** |
| `PORT` | `3000` | HTTP port (host and container) |
| `DATABASE_TYPE` | `sqlite` | `sqlite` (default) or `postgres` |
| `DATABASE_PATH` | `/root/.flowise` | SQLite + config location |
| `SECRETKEY_PATH` | `/root/.flowise` | Encryption key store for credentials |
| `BLOB_STORAGE_PATH` | `/root/.flowise/storage` | Uploaded file / blob storage |
| `LOG_PATH` | `/root/.flowise/logs` | Log directory |
| `DISABLE_FLOWISE_TELEMETRY` | `true` | Disable anonymous usage analytics |

All state persists to `.docker/flowise` (gitignored). Delete it to reset.

## MCP support

Flowise integrates with the Model Context Protocol on both sides:

- **As an MCP client** — the *Custom MCP* / *MCP* tool nodes let a chatflow or
  agent connect to external MCP servers (stdio or SSE) and call their tools.
- **As an MCP-style backend** — each deployed flow is reachable over the REST
  API, so it can be wrapped and consumed by other agents/tools.

For stdio MCP servers, review the `CUSTOM_MCP_*` security env vars in the
[official `.env` example](https://raw.githubusercontent.com/FlowiseAI/Flowise/main/docker/.env.example)
before enabling arbitrary command execution.

## Links

- GitHub: https://github.com/FlowiseAI/Flowise
- Docs: https://docs.flowiseai.com
