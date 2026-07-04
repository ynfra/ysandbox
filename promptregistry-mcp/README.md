# promptregistry-mcp

![promptregistry-mcp](docs/dashboard.png)

A lightweight, file-based [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) prompt registry server. Store, version, and retrieve prompt templates (with `{{variable}}` substitution and tags) as simple JSON files.

The upstream server (`mcp-promptregistry`) is **stdio-only**, so this stack wraps it with [`supergateway`](https://github.com/supercorp-ai/supergateway) to expose it over SSE on port 8000 for a testable HTTP sandbox.

## Services

| Service | Image | Description |
|---------|-------|-------------|
| `promptregistry-mcp` | `supercorp/supergateway:latest` | Runs the stdio `mcp-promptregistry` server and bridges it to SSE |

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

- **Wrapped stdio command:** `npx -y mcp-promptregistry` (npm package [`mcp-promptregistry`](https://www.npmjs.com/package/mcp-promptregistry)).
- **Transport:** stdio (upstream) → SSE (exposed by supergateway).
- **SSE endpoint:** `http://localhost:8000/sse`
- **Storage directory / env var:** prompts are stored as JSON files in the directory named by `PROMPT_REGISTRY_PROJECT_DIR` (default upstream is `~/.promptregistry/`). This stack sets it to `/data` inside the container and bind-mounts `./.docker/prompts` there, so prompts persist under `.docker/prompts/` on the host.

Each prompt is a JSON file (`<prompt-id>.json`) with `id`, `content`, `description`, `tags`, `variables`, and `metadata` fields. Management tools exposed over MCP include `add_prompt`, `get_prompt_file_content`, `update_prompt`, `delete_prompt`, `filter_prompts_by_tags`, and `load_default_prompts`.

To wrap a different stdio MCP server, edit the `--stdio` argument in `docker-compose.yml`. Other supergateway flags (`--outputTransport`, `--ssePath`, `--messagePath`, `--healthEndpoint`, `--cors`) are documented in the `supergateway` sibling stack.

## Running

```bash
docker compose up -d          # or: make docker-up
```

Base URL: `http://localhost:8000`

- **SSE handshake:** `curl -N http://localhost:8000/sse` → emits `event: endpoint`
  with a `/message?sessionId=…` data line (this is what the screenshot above shows).
- **Health:** `curl http://localhost:8000/healthz` → `ok`.

Bring the stack down with `docker compose down`.

## Notes

- **Repo name ≠ package name.** The upstream project repo is
  [`promptregistry-mcp`](https://github.com/stevengonsalvez/promptregistry-mcp),
  but it is published on npm as **[`mcp-promptregistry`](https://www.npmjs.com/package/mcp-promptregistry)**
  (v1.3.0 at time of writing). The compose `--stdio` arg (`npx -y mcp-promptregistry`)
  uses the correct **package** name — verify with `npm view mcp-promptregistry version`.
- **First boot needs internet.** `supergateway` fetches the wrapped server via
  `npx` at container **start**, so the first `up` requires outbound network
  access and takes a few seconds before `/healthz` returns `ok`.
- **No web UI.** This is a headless MCP bridge — `/sse` renders only the raw SSE
  handshake text in a browser; there is no dashboard. The server starts with
  `Registered 0 prompts` until prompts are added under `.docker/prompts/`.
- **Port 8000.** Default host port; if another sandbox stack already binds 8000,
  add a gitignored `docker-compose.override.yml` with `ports: !override` remapping
  to a free port (do not commit it).

## Links

- GitHub: https://github.com/stevengonsalvez/promptregistry-mcp
