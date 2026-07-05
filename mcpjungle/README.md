# MCPJungle

Self-hosted MCP gateway and registry. Register many MCP servers once, then
expose them to Claude, Cursor, Copilot, or your own agents through a **single
streamable-HTTP endpoint** at `http://localhost:8080/mcp`. MCPJungle unifies
tool/prompt discovery, adds optional tool groups and access control, and keeps
client configuration in one place instead of scattered per-client setups.

Runs in `development` mode by default (single-user, no auth) — switch
`SERVER_MODE=enterprise` for multi-user deployments with authentication and ACLs.

![MCPJungle dashboard](docs/dashboard.png)

## Usage

```bash
make docker-up
```

The gateway comes up at **http://localhost:8080**. Connect an MCP client (e.g.
Claude Desktop) to the unified endpoint:

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

<details>
<summary>API examples</summary>

Install the CLI locally (`brew install mcpjungle/mcpjungle/mcpjungle`) and point
it at the gateway, or run it inside the container:

```bash
# Register a remote streamable-HTTP server
mcpjungle register --name context7 --url https://mcp.context7.com/mcp

# Register from a JSON config file
mcpjungle register -c ./calculator.json

# Inspect and call tools (canonical name is <server>__<tool>)
mcpjungle list tools
mcpjungle invoke calculator__multiply --input '{"a": 100, "b": 50}'
mcpjungle deregister calculator

# Without the local CLI, run it inside the container
docker compose exec mcpjungle /mcpjungle list tools
```

</details>

> The host working directory is mounted read-only at `/host` so filesystem-based
> MCP servers can be registered against a path under `/host`. Postgres publishes
> on `127.0.0.1:5432`; several ysandbox stacks do the same, so remap one with a
> gitignored `docker-compose.override.yml` (`ports: !override`) to run two at once.

## Services

| Container | Port(s) | Description |
|-----------|---------|-------------|
| **mcpjungle** | `8080` | MCP gateway (`/mcp`), HTTP API, health (`/health`), metrics (`/metrics`) |
| **postgres** | `127.0.0.1:5432` | PostgreSQL `17` — registered servers, tools, groups, state |

## Configuration

Environment variables in `.env` (sandbox-safe defaults):

| Variable | Default | Notes |
|----------|---------|-------|
| `SERVER_MODE` | `development` | `development` (local, no auth) or `enterprise` (auth + ACLs) |
| `HOST_PORT` | `8080` | Host port mapped to the gateway |
| `MCPJUNGLE_IMAGE_TAG` | `latest-stdio` | `latest-stdio` bundles `npx`/`uvx` for stdio servers; `latest` is minimal |
| `OTEL_ENABLED` | `false` | Prometheus-compatible metrics at `/metrics` |
| `MCP_SERVER_INIT_REQ_TIMEOUT_SEC` | `10` | Init request timeout for upstream MCP servers |
| `POSTGRES_USER` | `mcpjungle` | Database user |
| `POSTGRES_PASSWORD` | `mcpjungle` | Database password — **change** for real use |
| `POSTGRES_DB` | `mcpjungle` | Database name |

The server connects to Postgres via `DATABASE_URL`
(`postgres://mcpjungle:mcpjungle@postgres:5432/mcpjungle`).

## Volumes

| Path | Contents |
|------|----------|
| `.docker/postgres/` | PostgreSQL data (registered servers, tools, groups) |

## Observability

| Check | Endpoint / Command |
|-------|--------------------|
| Health | `curl http://localhost:8080/health` |
| Metrics | `http://localhost:8080/metrics` (when `OTEL_ENABLED=true`) |
| Logs | `docker compose logs -f mcpjungle` |

## Resources

- GitHub: https://github.com/mcpjungle/MCPJungle
