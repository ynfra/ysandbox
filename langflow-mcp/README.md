# Langflow MCP bridge

A Model Context Protocol (MCP) server that exposes a running Langflow instance's
workflow-automation API as MCP tools (flows, executions, builds, knowledge
bases, variables, folders/projects, monitoring, and more).

Upstream (`nobrainer-tech/langflow-mcp`, npm `langflow-mcp-server`) is a
stdio-only Node.js MCP server with no published image. This stack runs it via
`npx` inside [`supergateway`](https://github.com/supercorp-ai/supergateway),
which bridges stdio → SSE and exposes it over HTTP on port 8000.

![langflow-mcp](docs/dashboard.png)

## Usage

```bash
make docker-up
```

Base URL is `http://localhost:8000`:

- `http://localhost:8000/sse` — SSE stream (opens with an `event: endpoint`
  frame carrying the per-session `/message?sessionId=...` path)
- `http://localhost:8000/healthz` — liveness probe, returns `ok`

Pairs with the ysandbox `langflow` stack: run Langflow there, then point
`LANGFLOW_BASE_URL` / `LANGFLOW_API_KEY` at it to expose its flows as MCP tools.

> **Version pin.** The npm package is pinned explicitly
> (`npx -y langflow-mcp-server@3.1.1`) rather than tracking `latest`: npm
> `latest` drifts and can target a different Langflow API than the pinned
> server. Bump the pin deliberately after checking upstream.

> **First boot needs internet.** Supergateway fetches the wrapped server via
> `npx` at container **start**, so the first `up` needs outbound network and
> takes a few extra seconds before `/healthz` answers. The bridge binds port
> 8000 (SSE + health respond) even without a reachable Langflow — only real tool
> calls need a live `LANGFLOW_BASE_URL` + valid `LANGFLOW_API_KEY`. Default host
> port 8000 is shared with other ysandbox stacks; remap via a gitignored
> `docker-compose.override.yml` (`ports: !override`) to run alongside them.

<details><summary>API examples</summary>

```bash
# Health check
curl -sf http://localhost:8000/healthz            # -> ok

# Subscribe to the SSE stream
curl -N http://localhost:8000/sse                 # -> event: endpoint / data: /message?...
```

Send MCP messages via `POST http://localhost:8000/message`.

</details>

## Services

| Container | Port(s) | Description |
|-----------|---------|-------------|
| **langflow-mcp** | `8000` | `supercorp/supergateway` running `npx langflow-mcp-server@3.1.1` (stdio) bridged to SSE |

## Configuration

Environment variables in `.env` (sandbox-safe placeholders), passed through to
the wrapped `langflow-mcp-server`:

| Variable | Default | Notes |
|----------|---------|-------|
| `LANGFLOW_BASE_URL` | `http://host.docker.internal:7860` | Langflow instance base URL (no `/api/v1` suffix); `host.docker.internal` wired via `extra_hosts` |
| `LANGFLOW_API_KEY` | `changeme-sandbox-key` | Langflow API key — **change** to a real key |
| `LANGFLOW_CONSOLIDATED_TOOLS` | `true` | `true` groups granular tools into ~15 meta-tools (lower tokens); `false` exposes all ~93 |
| `LOG_LEVEL` | `info` | `debug` / `info` / `warn` / `error` |
| `MCP_MODE` | `stdio` | Wrapped server transport; supergateway bridges it to SSE |

Swap the SSE output for WebSocket or Streamable HTTP by changing
`--outputTransport` in `docker-compose.yml`.

## Volumes

None — stateless. The bridge holds no persistent state; all data lives in the
Langflow instance it proxies.

## Observability

| Check | Endpoint / Command |
|-------|--------------------|
| Health | `curl -sf http://localhost:8000/healthz` (compose healthcheck via `wget`) |
| SSE stream | `curl -N http://localhost:8000/sse` |
| Logs | `docker compose logs -f langflow-mcp` |

## Resources

- GitHub: https://github.com/nobrainer-tech/langflow-mcp
- npm: https://www.npmjs.com/package/langflow-mcp-server
- Supergateway: https://github.com/supercorp-ai/supergateway
