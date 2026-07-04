# MCPHub

Unified hub and gateway for multiple MCP (Model Context Protocol) servers. Organizes servers into flexible Streamable HTTP/SSE endpoints — expose all servers, individual servers, or logical groups — behind a single management dashboard with hot-swappable configuration.

![MCPHub dashboard](docs/dashboard.png)

## Services

| Service | Description |
|---------|-------------|
| **mcphub** | MCPHub gateway + management dashboard, aggregating the MCP servers defined in `mcp_settings.json` |

## Ports

| Port | Service |
|------|---------|
| `3000` | Dashboard UI + MCP HTTP/SSE endpoints |

## Usage

```bash
make docker-up
```

Open http://localhost:3000 and log in with username `admin` (password from `ADMIN_PASSWORD`, default `admin`).

Connect AI clients (Claude Desktop, Cursor, etc.) via:

```
http://localhost:3000/mcp           # All servers
http://localhost:3000/mcp/{group}   # Specific group
http://localhost:3000/mcp/{server}  # Specific server
http://localhost:3000/mcp/$smart    # Smart routing
```

## Configuration

MCP servers are declared in `mcp_settings.json`, mounted read/write into the container at `/app/mcp_settings.json`. The bundled example wires up a single `fetch` server:

```json
{
  "mcpServers": {
    "fetch": {
      "command": "uvx",
      "args": ["mcp-server-fetch"]
    }
  }
}
```

Add more servers (`command`/`args` for stdio, or `url` for remote) and MCPHub picks them up without a restart.

Environment variables (in `.env`):

| Variable | Default | Notes |
|----------|---------|-------|
| `ADMIN_PASSWORD` | `admin` | Dashboard admin password — **change** for anything but local use. If unset, a random password is generated and printed to the logs. |

Runtime state (accounts, keys, generated config) is persisted to `.docker/data/` (gitignored).

> **Security:** MCP endpoints require bearer authentication by default. Disable it only in trusted local environments via the dashboard's Keys section.

## Links

- GitHub: https://github.com/samanhappy/mcphub
- Docs: https://mcphub.app
