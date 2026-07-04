# Langflow MCP bridge

A Model Context Protocol (MCP) server that exposes a running Langflow
instance's workflow-automation API as MCP tools (flows, executions, builds,
knowledge bases, variables, folders/projects, monitoring, and more).

Upstream (`nobrainer-tech/langflow-mcp`, npm `langflow-mcp-server`) is a
Node.js/TypeScript MCP server. It is run here in **stdio** mode and pinned to
the current npm release `3.1.1` (the latest published to npm). No image is
published to a public registry, so this stack runs the server via `npx` and
wraps it with [`supergateway`](https://github.com/supercorp-ai/supergateway)
to bridge stdio to SSE, exposing it over HTTP on port 8000. (HTTP-mode support
varies by upstream version; the stdio + supergateway bridge is used for a stable
SSE endpoint regardless.)

## Services

| Service | Image | Description |
|---------|-------|-------------|
| `langflow-mcp` | `supercorp/supergateway:latest` | Runs `npx langflow-mcp-server` (stdio) and bridges it to SSE |

## Ports

| Port | Description |
|------|-------------|
| `8000` | SSE endpoint (`/sse`), message endpoint (`/message`), health (`/healthz`) |

## Usage

```bash
make docker-up
```

Subscribe to the SSE stream:

```bash
curl -N http://localhost:8000/sse
```

Send MCP messages via `POST http://localhost:8000/message`. Health check:

```bash
curl http://localhost:8000/healthz
```

## Configuration

Configuration is loaded from `.env` (sandbox-safe placeholders) and passed
through to the wrapped `langflow-mcp-server` process:

- `LANGFLOW_BASE_URL` — base URL of your Langflow instance, no `/api/v1` suffix.
  Defaults to `http://host.docker.internal:7860`, which reaches a Langflow
  running on the Docker host. `host.docker.internal` is wired up via
  `extra_hosts` so it also resolves on Linux.
- `LANGFLOW_API_KEY` — Langflow API key (from your Langflow instance settings).
- `LANGFLOW_CONSOLIDATED_TOOLS` — `true` groups the granular tools into fewer
  action-based meta-tools (lower token usage); `false` exposes all granular
  tools. (In pinned v3.1.1 this consolidates ~93 tools into ~15.)
- `LOG_LEVEL` — `debug` / `info` / `warn` / `error`.

Transport: the underlying server speaks **stdio only**; `supergateway` exposes
it as **SSE** on port 8000 (`--outputTransport sse`). Swap to WebSocket or
Streamable HTTP by changing `--outputTransport` in `docker-compose.yml`.

This stack pairs with the ysandbox `langflow` stack: run Langflow there, then
point `LANGFLOW_BASE_URL` / `LANGFLOW_API_KEY` at it to expose its flows as MCP
tools.

> **Note:** a running, reachable Langflow instance + a valid API key are needed
> to serve real tool data. Without one, the bridge process still starts and
> binds port 8000 (the SSE/health endpoints respond) — tool calls just fail
> until Langflow is reachable.

## Links

- GitHub: https://github.com/nobrainer-tech/langflow-mcp
- npm: https://www.npmjs.com/package/langflow-mcp-server
- Supergateway: https://github.com/supercorp-ai/supergateway
