# MCPJungle

Self-hosted MCP gateway and registry. Register many MCP servers once, then
expose them to Claude, Cursor, Copilot, or your own agents through a **single
streamable-HTTP endpoint** at `http://localhost:8080/mcp`. MCPJungle unifies
tool/prompt discovery, adds optional tool groups and access control, and keeps
client configuration in one place instead of scattered per-client setups.

Runs in `development` mode by default (single-user, no auth) — switch
`SERVER_MODE=enterprise` for multi-user deployments with authentication and ACLs.

![MCPJungle dashboard](docs/dashboard.png)

## Services

| Service | Description |
|---------|-------------|
| **mcpjungle** | MCP gateway/registry server; serves the unified MCP endpoint (`/mcp`) and HTTP API |
| **postgres** | PostgreSQL 17 storing registered servers, tools, groups, and state |

## Ports

| Port | Service |
|------|---------|
| `8080` | MCP gateway (`/mcp`), HTTP API, health (`/health`), metrics (`/metrics`) |
| `5432` | PostgreSQL (bound to `127.0.0.1`) |

## Usage

```bash
make docker-up
```

The gateway comes up at `http://localhost:8080`. Verify it is healthy:

```bash
curl http://localhost:8080/health
```

Connect an MCP client (e.g. Claude Desktop) to the unified endpoint:

```json
{
  "mcpServers": {
    "mcpjungle": {
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:8080/mcp", "--allow-http"]
    }
  }
}
```

## Configuration

Environment variables in `.env` (sandbox-safe defaults):

| Variable | Default | Notes |
|----------|---------|-------|
| `SERVER_MODE` | `development` | `development` (local, no auth) or `enterprise` (auth + ACLs) |
| `HOST_PORT` | `8080` | Host port mapped to the gateway |
| `MCPJUNGLE_IMAGE_TAG` | `latest-stdio` | `latest-stdio` bundles `npx`/`uvx` for stdio MCP servers; `latest` is minimal |
| `OTEL_ENABLED` | `false` | Prometheus-compatible metrics at `/metrics` |
| `MCP_SERVER_INIT_REQ_TIMEOUT_SEC` | `10` | Init request timeout for upstream MCP servers |
| `POSTGRES_USER` | `mcpjungle` | Database user |
| `POSTGRES_PASSWORD` | `mcpjungle` | Database password — **change** for real use |
| `POSTGRES_DB` | `mcpjungle` | Database name |

The server connects to Postgres via `DATABASE_URL`
(`postgres://mcpjungle:mcpjungle@postgres:5432/mcpjungle`). Postgres data
persists to `.docker/postgres` (gitignored). The host working directory is
mounted read-only at `/host` so filesystem-based MCP servers can be registered
against a path under `/host`.

## Registering an MCP server

Install the `mcpjungle` CLI locally (`brew install mcpjungle/mcpjungle/mcpjungle`)
and point it at the gateway, or use the HTTP API directly.

**Remote / streamable-HTTP server (via CLI):**

```bash
mcpjungle register --name context7 --url https://mcp.context7.com/mcp
```

**From a JSON config file:**

```bash
cat > calculator.json <<'JSON'
{
  "name": "calculator",
  "transport": "streamable_http",
  "description": "Basic math tools",
  "url": "http://host.docker.internal:8000/mcp"
}
JSON

mcpjungle register -c ./calculator.json
```

**Inspect and call tools** (canonical name is `<server>__<tool>`):

```bash
mcpjungle list tools
mcpjungle invoke calculator__multiply --input '{"a": 100, "b": 50}'
mcpjungle deregister calculator
```

If you did not install the CLI, you can also run it inside the container:

```bash
docker compose exec mcpjungle /mcpjungle list tools
```

## Links

- GitHub: https://github.com/mcpjungle/MCPJungle
