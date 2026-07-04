# Supergateway

![supergateway](docs/dashboard.png)

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

## Running

```bash
docker compose up -d
```

Base URL: `http://localhost:8000`

- `/sse` — SSE stream. On connect it emits the initial `event: endpoint`
  handshake naming the per-session `/message?sessionId=...` POST endpoint
  (this is what the screenshot above captures).
- `/message` — POST endpoint for sending MCP JSON-RPC messages.
- `/healthz` — health probe, returns `ok`.

Verify:

```bash
curl -s http://localhost:8000/healthz          # -> ok
curl -sN --max-time 3 http://localhost:8000/sse # -> event: endpoint ...
```

Bring down:

```bash
docker compose down
```

## Notes

- The wrapped MCP server here is `@modelcontextprotocol/server-everything`
  (the MCP demo/reference server), set via `--stdio` in `docker-compose.yml`.
- **First boot needs outbound internet.** `supercorp/supergateway` fetches the
  wrapped stdio server via `npx -y ...` at container *start*, so the first run
  takes a few extra seconds while npm resolves the package. Subsequent boots
  are faster.
- Health check uses `wget` (busybox), which is present in the image, so the
  container reports healthy once the bridge is listening.
- Booted cleanly on OrbStack (macOS) with no config changes required.

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
