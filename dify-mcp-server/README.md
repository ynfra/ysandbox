# Dify MCP Server

MCP server that wraps [Dify](https://github.com/langgenius/dify) workflow apps and exposes each configured Dify app as an MCP tool, so any MCP client can invoke Dify workflows.

Upstream `dify-mcp-server` is a **stdio-only** Python MCP server (no native SSE/HTTP transport), so this stack runs it behind [`mcpo`](https://github.com/open-webui/mcpo) — the same MCP-to-OpenAPI proxy used elsewhere in ysandbox — to expose its tools as OpenAPI/REST over HTTP on port 8000.

![Dify MCP Server dashboard](docs/dashboard.png)

## Usage

```bash
make docker-up
```

Open the interactive OpenAPI docs at http://localhost:8000/docs. The wrapped MCP server is mounted under its own sub-route at http://localhost:8000/dify (schema at http://localhost:8000/dify/docs). The `/docs` landing page is unauthenticated; every tool call needs the bearer token.

> **First boot needs outbound internet.** `mcpo` launches the stdio server via `uvx --from git+https://github.com/YanxingLiu/dify-mcp-server` at container **start** (the package is not on PyPI) — first run clones + builds it (~37 packages, a few seconds) before the tool routes appear. Watch `docker compose logs -f` for `Uvicorn running on http://0.0.0.0:8000`.
>
> **Requires a real Dify backend.** `dify_mcp_server` calls `<dify_base_url>/info` for every SK at startup, so an invalid/unreachable key crashes the server on launch. The default `config.yaml` ships an empty `dify_app_sks: []` so the stack boots clean with zero tools for sandbox verification; supply at least one valid key to expose real tools.

<details>
<summary>API examples</summary>

Fetch the wrapped server's schema (auth via the bearer token):

```bash
curl -H "Authorization: Bearer top-secret" http://localhost:8000/dify/docs
```

Call a tool once real workflows are configured:

```bash
curl -X POST http://localhost:8000/dify/<workflow_name> \
    -H "Authorization: Bearer top-secret" \
    -H "Content-Type: application/json" \
    -d '{ ... }'
```
</details>

## Services

| Container | Port(s) | Description |
|-----------|---------|-------------|
| **dify-mcp-server** | `8000` | mcpo proxy running the stdio `dify-mcp-server` (via `uvx`) and exposing it as OpenAPI/REST |

## Configuration

The Dify connection lives in `config.yaml` (mounted read-only, pointed at by `CONFIG_PATH` in `config.json`):

```yaml
dify_base_url: "https://cloud.dify.ai/v1"
dify_app_sks:
  - "app-xxxxxxxx"   # one SK per Dify workflow app; each becomes an MCP tool
```

| Setting | Default | Notes |
|---------|---------|-------|
| `dify_base_url` | `https://cloud.dify.ai/v1` | Base URL of your Dify API (or self-hosted `.../v1`); may also come from `DIFY_BASE_URL` |
| `dify_app_sks` | `[]` (empty) | List of Dify **App Secret Keys** (`app-xxxxxxxx`); may also come from comma-separated `DIFY_APP_SKS` |
| `MCPO_API_KEY` | `top-secret` | Bearer token (`--api-key`) required on every request — **change** for real use |

## Volumes

None — stateless. `config.json` and `config.yaml` are mounted read-only into the container.

## Observability

| Check | Endpoint / Command |
|-------|--------------------|
| Health | `curl http://localhost:8000/docs` (Compose healthcheck probes `/docs` via `python -c` + urllib — no `curl`/`wget` in the image) |
| Logs | `docker compose logs -f dify-mcp-server` |

## Resources

- GitHub: https://github.com/YanxingLiu/dify-mcp-server
- Dify: https://github.com/langgenius/dify
- mcpo: https://github.com/open-webui/mcpo
