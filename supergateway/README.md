# Supergateway

Transport bridge that runs a stdio-based MCP server and exposes it over SSE, WebSocket, or Streamable HTTP (and vice-versa). Useful for making local stdio MCP servers reachable over HTTP for remote access, debugging, or web-based clients.

This stack wraps the `@modelcontextprotocol/server-everything` demo MCP server and exposes it over SSE on port 8000.

## Services

| Service | Image | Description |
|---------|-------|-------------|
| `supergateway` | `supercorp/supergateway:latest` | Bridges a stdio MCP server to SSE |

## Ports

| Port | Description |
|------|-------------|
| `8000` | SSE endpoint (`/sse`), message endpoint (`/message`), health (`/healthz`) |

## Usage

```bash
make docker-up
```

Once running, subscribe to the SSE stream:

```bash
curl -N http://localhost:8000/sse
```

Send MCP messages via `POST http://localhost:8000/message`. Health check:

```bash
curl http://localhost:8000/healthz
```

## Configuration

The wrapped stdio MCP server is set via the `--stdio` argument in `docker-compose.yml`. Replace the demo server with any stdio MCP server, e.g. the filesystem server:

```yaml
command:
  - "--stdio"
  - "npx -y @modelcontextprotocol/server-filesystem /data"
```

Transport is selected with `--outputTransport`:

- `sse` — Server-Sent Events (default here). SSE endpoint: `http://localhost:8000/sse`
- `ws` — WebSocket. Endpoint: `ws://localhost:8000/message`
- `streamableHttp` — Streamable HTTP. Endpoint: `http://localhost:8000/mcp`

Other useful flags:

- `--port` — port to listen on (default `8000`)
- `--ssePath` / `--messagePath` — SSE and message paths (default `/sse`, `/message`)
- `--healthEndpoint` — register a health endpoint that returns `ok`
- `--cors` — enable CORS (no value allows all origins, or pass specific origins)
- `--header "x-user-id: 123"` — inject headers; `--oauth2Bearer <token>` for Authorization

Pre-built image variants add dependencies for other runtimes: `supercorp/supergateway:uvx` (uv/uvx for Python MCP servers) and `supercorp/supergateway:deno` (Deno-based MCP servers).

## Links

- GitHub: https://github.com/supercorp-ai/supergateway
