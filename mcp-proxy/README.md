# mcp-proxy

TBXark mcp-proxy — a lightweight Go MCP proxy that aggregates multiple MCP
servers behind a single HTTP entrypoint. Each backend is exposed under its own
path and can be `stdio`, `sse`, or `streamable-http`. Everything is driven by
`config.json`.

![mcp-proxy](docs/dashboard.png)

## Usage

```bash
make docker-up
```

The proxy listens on **http://localhost:9090** (matching `mcpProxy.addr` in
`config.json`). There is **no index page** at `/` — the root returns
`404 page not found`. Each backend is namespaced by its `mcpServers` map key:

- `type: sse` → `http://localhost:9090/<name>/sse` (plus a paired
  `/<name>/message` POST channel)
- `type: streamable-http` → `http://localhost:9090/<name>/mcp`

The bundled config exposes one demo stdio backend **`everything`**
(`npx -y @modelcontextprotocol/server-everything`) at `/everything/sse`.
Backend requests require the bearer token from `mcpProxy.options.authTokens`
(default `sandbox-token`) as an `Authorization` header (header only; query
params are rejected) — without it the endpoint returns `401`.

<details>
<summary>API examples</summary>

```bash
# SSE handshake for the aggregated "everything" backend
curl -s --max-time 2 -H "Authorization: sandbox-token" \
    http://localhost:9090/everything/sse
# event: endpoint
# data: http://localhost:9090/everything/message?sessionId=...
```

</details>

> **First boot needs outbound internet.** The `everything` backend is fetched at
> container start via `npx` (the image ships Node + `npx`/`uvx`), so the first
> `up` takes a few seconds. Logs show `<everything> Connecting` →
> `Successfully listed 13 tools` → `All clients initialized` once ready.
>
> **Healthcheck.** The image ships no `curl`/`wget`, so Compose TCP-probes the
> listen port with `node`. Newer mcp-proxy releases also expose unauthenticated
> `GET /_healthz` and `GET /_readyz`, but they are not present in every tag.

## Services

| Container | Port(s) | Description |
|-----------|---------|-------------|
| **mcp-proxy** | `9090` | MCP proxy aggregating one or more backend MCP servers |

## Configuration

All behaviour is driven by `config.json`, mounted at `/config/config.json`. It
has two top-level sections:

| Section | Key | Notes |
|---------|-----|-------|
| `mcpProxy` | `baseURL` | Public URL base used to build client endpoints |
| `mcpProxy` | `addr` | Bind address (e.g. `:9090`); must match the host port |
| `mcpProxy` | `options.authTokens` | Valid bearer tokens (default `sandbox-token`; **change** for real use) |
| `mcpProxy` | `options.panicIfInvalid` | Fail startup if a backend cannot initialize |
| `mcpProxy` | `options.logEnabled` | Log requests and events |
| `mcpServers` | `<name>.command` + `args` | stdio backend (Node/Python via bundled `npx`/`uvx`) |
| `mcpServers` | `<name>.url` | `sse` / `streamable-http` remote backend |

## Volumes

None — stateless. Only `config.json` is mounted into the container.

## Observability

| Check | Endpoint / Command |
|-------|--------------------|
| Health (TCP) | Compose `node` probe on port `9090` (`docker compose ps`) |
| Health (HTTP) | `curl http://localhost:9090/_healthz` (newer tags only) |
| Logs | `docker compose logs -f mcp-proxy` |

## Resources

- GitHub: https://github.com/TBXark/mcp-proxy
- Docs: https://tbxark.github.io/mcp-proxy
