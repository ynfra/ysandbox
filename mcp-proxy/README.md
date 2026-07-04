# mcp-proxy

TBXark mcp-proxy — a lightweight Go MCP proxy that aggregates multiple MCP servers behind a single HTTP entrypoint. Each backend MCP server is exposed under its own path; supports `stdio`, `sse`, and `streamable-http` backends. Fully config-file driven via `config.json`.

## Services

- **mcp-proxy**: MCP proxy server aggregating one or more backend MCP servers

## Ports

- `9090`: MCP proxy HTTP endpoint (matches `mcpProxy.addr` in `config.json`)

## Usage

```bash
make docker-up
```

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
