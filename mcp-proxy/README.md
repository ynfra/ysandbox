# mcp-proxy

![mcp-proxy](docs/dashboard.png)

TBXark mcp-proxy — a lightweight Go MCP proxy that aggregates multiple MCP servers behind a single HTTP entrypoint. Each backend MCP server is exposed under its own path; supports `stdio`, `sse`, and `streamable-http` backends. Fully config-file driven via `config.json`.

## Services

- **mcp-proxy**: MCP proxy server aggregating one or more backend MCP servers

## Ports

- `9090`: MCP proxy HTTP endpoint (matches `mcpProxy.addr` in `config.json`)

## Usage

```bash
make docker-up
```

## Running

```bash
docker compose up -d
```

- Base URL: `http://localhost:9090` (host port `9090`, `mcpProxy.addr` is `:9090`).
- There is **no index/status page** at `/` — the root path returns `404 page not found`. Each backend is namespaced by its `mcpServers` map key:
  - `type: sse` → `http://localhost:9090/<name>/sse` (plus a paired `/<name>/message` POST channel)
  - `type: streamable-http` → `http://localhost:9090/<name>/mcp`
- Configured servers (`config.json`): a single stdio backend **`everything`** (`npx -y @modelcontextprotocol/server-everything`), exposed at `/everything/sse`.
- Requests to a backend need the bearer token from `mcpProxy.options.authTokens` — send it as `Authorization: sandbox-token` (header only; query params are rejected). Without it the endpoint returns `401`.
- The screenshot above is the initial `event: endpoint` handshake returned by `GET /everything/sse` (with the auth header set) — proof the proxy is serving the aggregated MCP SSE stream.

Verify the SSE handshake from the shell:

```bash
curl -s --max-time 2 -H "Authorization: sandbox-token" http://localhost:9090/everything/sse
# event: endpoint
# data: http://localhost:9090/everything/message?sessionId=...
```

## Notes

- **First boot needs outbound internet.** The `everything` backend is fetched at container start via `npx` (the image ships Node + `npx`/`uvx`), so the first `up` takes a few seconds while the package downloads. Logs show `<everything> Connecting` → `Successfully listed 13 tools` → `All clients initialized` once ready.
- **Healthcheck.** The image ships no `curl`/`wget`, so Compose TCP-probes the listen port with `node` (`require('net').connect(9090,...)`). Container reports `healthy` ~40s after start. No fix was needed — the stack boots clean out of the box.
- **Auth token** `sandbox-token` in `config.json` is a sandbox-safe default; the `/<name>/message` and `/<name>/sse` paths both require it.

## Configuration

All behaviour is driven by `config.json`, mounted at `/config/config.json`. It has two top-level sections:

### `mcpProxy`

Global proxy settings inherited by every backend:

- `baseURL`: Public URL base used to build client endpoints (e.g. `http://localhost:9090`).
- `addr`: Bind address (e.g. `:9090`) — must match the mapped host port.
- `name`, `version`: Server identity for the MCP handshake.
- `type`: `sse` (default) or `streamable-http`.
- `options`: Defaults inherited by each `mcpServers.*.options` entry.
  - `panicIfInvalid`: If true, startup fails when a backend cannot initialize.
  - `logEnabled`: Log requests and events.
  - `authTokens`: Valid bearer tokens; requests must send `Authorization: <token>`.

### `mcpServers`

A map of backend MCP servers. Each entry is one of:

- **stdio** (implicit when `command` is set): run a subprocess via stdio — `command` + `args` + optional `env`. The image ships with `npx` and `uvx` so Node and Python MCP servers work out of the box.
- **sse** / **streamable-http** (when `url` is set): connect to a remote MCP server over HTTP.

### Exposed endpoints

Each backend is served under its own path, derived from its map key:

- `type: sse` → `http://localhost:9090/<name>/sse`
- `type: streamable-http` → `http://localhost:9090/<name>/mcp`

The bundled config exposes one demo stdio backend (`@modelcontextprotocol/server-everything`) under `/everything/sse`.

The Compose healthcheck TCP-probes the listen port with `node` (the image ships no `curl`/`wget`). Newer mcp-proxy releases also expose unauthenticated `GET /_healthz` and `GET /_readyz` liveness endpoints, but they are not present in every image tag.

### Auth

When `authTokens` is set (default `sandbox-token` here — a sandbox-safe value), backend requests must include the bearer token:

```
Authorization: sandbox-token
```

The health endpoints never require the token.

## Links

- GitHub: https://github.com/TBXark/mcp-proxy
- Docs: https://tbxark.github.io/mcp-proxy
