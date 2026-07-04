# promptregistry-mcp

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

## Links

- GitHub: https://github.com/stevengonsalvez/promptregistry-mcp
