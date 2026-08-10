# Supergateway

Transport bridge that runs a stdio-based MCP server and exposes it over SSE,
WebSocket, or Streamable HTTP. Useful for making local stdio-only MCP servers
reachable over HTTP for remote access, debugging, or web-based clients. This
stack wraps the `@modelcontextprotocol/server-everything` demo MCP server and
exposes it over SSE on port 8000.

![supergateway](docs/dashboard.png)

## Usage

```bash
make docker-up
```

Base URL is `http://localhost:8000`. The `/sse` stream emits an initial
`event: endpoint` handshake naming the per-session `/message?sessionId=...`
POST endpoint. Verify it is up:

```bash
curl -s http://localhost:8000/healthz          # -> ok
curl -sN --max-time 3 http://localhost:8000/sse # -> event: endpoint ...
```

> **First boot needs outbound internet.** `supercorp/supergateway` fetches the
> wrapped stdio server via `npx -y ...` at container *start*, so the first run
> takes a few extra seconds while npm resolves the package. The healthcheck
> uses `wget` (busybox), which ships in the image. Booted cleanly on OrbStack
> (macOS) with no config changes.

<details><summary>API examples</summary>

Subscribe to the SSE stream:

```bash
curl -N http://localhost:8000/sse
```

Send MCP JSON-RPC messages to the per-session message endpoint:

```bash
curl -X POST "http://localhost:8000/message?sessionId=<id>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

</details>

## Services

| Container | Port(s) | Description |
|-----------|---------|-------------|
| **supergateway** | `8000` | Bridges a stdio MCP server to SSE (`/sse`), message POST (`/message`), health (`/healthz`) |

## Configuration

Configured entirely via the `command:` args in `docker-compose.yml` (no `.env`):

| Flag | Default | Notes |
|------|---------|-------|
| `--stdio` | `npx -y @modelcontextprotocol/server-everything` | Wrapped stdio MCP server; **change** to any stdio MCP server |
| `--outputTransport` | `sse` | Transport: `sse`, `ws`, or `streamableHttp` |
| `--port` | `8000` | Port to listen on |
| `--baseUrl` | `http://localhost:8000` | Public base URL advertised to clients |
| `--ssePath` / `--messagePath` | `/sse` / `/message` | SSE and message paths |
| `--healthEndpoint` | `/healthz` | Health endpoint (returns `ok`) |
| `--cors` | enabled | Allow all origins |

Image variants add runtimes for other wrapped servers: `supercorp/supergateway:uvx`
(Python/uvx) and `supercorp/supergateway:deno` (Deno).

## Volumes

None — stateless.

## Observability

| Check | Endpoint / Command |
|-------|--------------------|
| Health | `curl http://localhost:8000/healthz` |
| Logs | `docker compose logs -f supergateway` |

## Resources

- GitHub: https://github.com/supercorp-ai/supergateway
- Wrapped server: https://github.com/modelcontextprotocol/servers/tree/main/src/everything
