# promptregistry-mcp

A lightweight, file-based [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
prompt registry server. Store, version, and retrieve prompt templates (with
`{{variable}}` substitution and tags) as simple JSON files.

The upstream server is **stdio-only**, so this stack wraps it with
[`supergateway`](https://github.com/supercorp-ai/supergateway) to expose it over
SSE on port 8000 for a testable HTTP sandbox.

![promptregistry-mcp](docs/dashboard.png)

## Usage

```bash
make docker-up
```

Subscribe to the SSE stream (emits an `event: endpoint` with a
`/message?sessionId=…` data line):

```bash
curl -N http://localhost:8000/sse
```

Send MCP messages via `POST http://localhost:8000/message`.

> **Repo name ≠ package name.** The upstream repo is
> [`promptregistry-mcp`](https://github.com/stevengonsalvez/promptregistry-mcp),
> but it is published on npm as **[`mcp-promptregistry`](https://www.npmjs.com/package/mcp-promptregistry)**
> (v1.3.0 at time of writing). The compose `--stdio` arg (`npx -y mcp-promptregistry`)
> uses the correct **package** name — verify with `npm view mcp-promptregistry version`.
>
> **First boot needs internet.** `supergateway` fetches the wrapped server via
> `npx` at container start, so the first `up` requires outbound network access and
> takes a few seconds before `/healthz` returns `ok`. There is **no web UI** — `/sse`
> renders only the raw SSE handshake in a browser.

<details><summary>API examples</summary>

```bash
# SSE handshake
curl -N http://localhost:8000/sse        # → event: endpoint + /message?sessionId=…

# Health
curl http://localhost:8000/healthz        # → ok
```

Each prompt is a JSON file (`<prompt-id>.json`) with `id`, `content`,
`description`, `tags`, `variables`, and `metadata` fields. Management tools
exposed over MCP include `add_prompt`, `get_prompt_file_content`,
`update_prompt`, `delete_prompt`, `filter_prompts_by_tags`, and
`load_default_prompts`. The server starts with `Registered 0 prompts` until
prompts are added under `.docker/prompts/`.

To wrap a different stdio MCP server, edit the `--stdio` argument in
`docker-compose.yml`. Other supergateway flags (`--outputTransport`, `--ssePath`,
`--messagePath`, `--healthEndpoint`, `--cors`) are documented in the
`supergateway` sibling stack.

</details>

## Services

| Container | Port(s) | Description |
|-----------|---------|-------------|
| **promptregistry-mcp** | `8000` | `supercorp/supergateway` runs the stdio `mcp-promptregistry` server and bridges it to SSE (`/sse`), message (`/message`), and health (`/healthz`) |

## Configuration

Environment variables set in `docker-compose.yml`:

| Variable | Default | Notes |
|----------|---------|-------|
| `PROMPT_REGISTRY_PROJECT_DIR` | `/data` | Container path where prompts are stored as JSON; bind-mounted to `.docker/prompts/` (upstream default is `~/.promptregistry/`) |

Wrapped stdio command: `npx -y mcp-promptregistry`. Transport: stdio (upstream)
→ SSE (exposed by supergateway) on `http://localhost:8000/sse`.

## Volumes

| Path | Contents |
|------|----------|
| `.docker/prompts/` | Prompt JSON files (persist across restarts) |

## Observability

| Check | Endpoint / Command |
|-------|--------------------|
| Health | `curl http://localhost:8000/healthz` |
| Logs | `docker compose logs -f promptregistry-mcp` |

## Resources

- GitHub: https://github.com/stevengonsalvez/promptregistry-mcp
- npm package: https://www.npmjs.com/package/mcp-promptregistry
- supergateway: https://github.com/supercorp-ai/supergateway
