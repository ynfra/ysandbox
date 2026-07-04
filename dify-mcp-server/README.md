# Dify MCP Server

![dify-mcp-server](docs/dashboard.png)

MCP server that wraps [Dify](https://github.com/langgenius/dify) workflow apps
and exposes each configured Dify app as an MCP tool, so any MCP client can
invoke Dify workflows.

Upstream `dify-mcp-server` is a **stdio-only** Python MCP server (no native
SSE/HTTP transport), so this stack runs it behind
[`mcpo`](https://github.com/open-webui/mcpo) — the same MCP-to-OpenAPI proxy
used elsewhere in ysandbox — to expose its tools as OpenAPI/REST over HTTP on
port 8000. `mcpo` launches the stdio server via `uvx` straight from the
upstream Git repo (it is not published to PyPI).

## Services

| Service | Image | Description |
|---------|-------|-------------|
| `dify-mcp-server` | `ghcr.io/open-webui/mcpo:main` | mcpo proxy running the stdio `dify-mcp-server` (via `uvx`) and exposing it as OpenAPI |

## Ports

| Port | Description |
|------|-------------|
| `8000` | mcpo HTTP server + OpenAPI docs (`/docs`) |

## Usage

```bash
make docker-up
```

Then open the interactive OpenAPI docs at http://localhost:8000/docs.
The wrapped MCP server is mounted under its own sub-route at
http://localhost:8000/dify (schema at http://localhost:8000/dify/docs).

> First start is slow: `uvx` clones and builds `dify-mcp-server` from GitHub
> inside the container before the tool routes appear.

## Configuration

The Dify connection is configured in `config.yaml` (mounted read-only into the
container and pointed to via `CONFIG_PATH` in `config.json`):

```yaml
dify_base_url: "https://cloud.dify.ai/v1"
dify_app_sks:
  - "app-xxxxxxxx"   # one SK per Dify workflow app; each becomes an MCP tool
```

- `dify_base_url` — base URL of your Dify API (`https://cloud.dify.ai/v1` for
  Dify Cloud, or your self-hosted `.../v1` URL). May also be supplied via the
  `DIFY_BASE_URL` environment variable.
- `dify_app_sks` — list of Dify **App Secret Keys** (format `app-xxxxxxxx`).
  Each SK maps to one Dify workflow app and is surfaced as one MCP tool. May
  also be supplied via the comma-separated `DIFY_APP_SKS` environment variable.

Alternatively, edit `config.json` to pass `DIFY_BASE_URL` / `DIFY_APP_SKS` as
`env` to the wrapped server instead of using `config.yaml`.

`mcpo` itself is protected by a bearer token:

- `--api-key` — bearer token required on every request. Defaults to the
  sandbox-safe value `top-secret` (override via `MCPO_API_KEY` in `.env`).

Call a tool once real workflows are configured (auth via the API key):

```bash
curl -X POST http://localhost:8000/dify/<workflow_name> \
    -H "Authorization: Bearer top-secret" \
    -H "Content-Type: application/json" \
    -d '{ ... }'
```

### Requires a real Dify backend

`dify-mcp-server` calls `<dify_base_url>/info` for every SK **at startup**, so
an invalid or unreachable key crashes the server on launch. For that reason the
default `config.yaml` ships with an **empty** `dify_app_sks: []`, letting the
stack start cleanly with zero tools for local sandbox verification. To expose
real tools, supply at least one valid key pointing at a reachable Dify
instance.

## Running

```bash
docker compose up -d          # or: make docker-up
```

Then open the interactive Swagger UI at http://localhost:8000/docs. The page
renders **"MCP OpenAPI Proxy — Swagger UI"** with the wrapped `dify` server
listed as an available tool sub-route (schema at
http://localhost:8000/dify/docs). Bring the stack down with `docker compose down`.

Every request to `mcpo` needs the bearer token (`--api-key`, default
`top-secret`, override via `MCPO_API_KEY` in `.env`):

```bash
curl -H "Authorization: Bearer top-secret" http://localhost:8000/dify/docs
```

The `/docs` landing page itself is unauthenticated and renders without a key.

## Notes

- **First boot needs outbound internet.** `mcpo` launches the stdio
  `dify_mcp_server` via `uvx --from git+https://github.com/YanxingLiu/dify-mcp-server`
  at container **start** — on first run it clones + builds the package from
  GitHub (a few seconds, ~37 packages) before the tool routes appear. Watch
  progress with `docker compose logs -f`; wait for
  `Application startup complete` / `Uvicorn running on http://0.0.0.0:8000`.
- **How the Dify workflow is wired.** The connection lives in `config.yaml`
  (mounted read-only, pointed at by `CONFIG_PATH=/app/config.yaml` in
  `config.json`): `dify_base_url` (e.g. `https://cloud.dify.ai/v1` or your
  self-hosted `.../v1`) plus `dify_app_sks` — a list of Dify **App Secret Keys**
  (`app-xxxxxxxx`), one per workflow app, each surfaced as one MCP tool.
- **Empty key list boots clean with zero tools.** `dify_mcp_server` calls
  `<dify_base_url>/info` for every SK at startup, so an invalid/unreachable key
  crashes the server on launch. The default `config.yaml` ships
  `dify_app_sks: []` so the stack starts cleanly for sandbox verification; the
  Swagger UI then shows the `dify` sub-route with "No operations defined in
  spec!" until real keys are supplied.
- The `mcpo` image is Python-based, so the healthcheck uses `python -c` +
  `urllib` (no `curl`/`wget` in the image) to probe `/docs`.

## Links

- GitHub: https://github.com/YanxingLiu/dify-mcp-server
- Dify: https://github.com/langgenius/dify
- mcpo: https://github.com/open-webui/mcpo
