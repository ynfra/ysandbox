# mcpo

![mcpo](docs/dashboard.png)

MCP-to-OpenAPI proxy by Open WebUI. Wraps one or more MCP (Model Context
Protocol) servers and exposes their tools as standard OpenAPI/REST HTTP
endpoints, auto-generating interactive OpenAPI docs. This stack wraps the
`mcp-server-time` demo MCP server via a Claude-desktop-style `config.json`.

## Services

| Service | Image | Description |
|---------|-------|-------------|
| mcpo | `ghcr.io/open-webui/mcpo:main` | MCP-to-OpenAPI proxy wrapping the `time` MCP server |

## Ports

| Port | Description |
|------|-------------|
| `8000` | mcpo HTTP server + OpenAPI docs |

## Usage

```bash
make docker-up
```

Then open the interactive OpenAPI docs at http://localhost:8000/docs.
Each wrapped MCP server also gets its own sub-route and schema, e.g.
http://localhost:8000/time and http://localhost:8000/time/docs.

## Configuration

mcpo is started with `--config /app/config.json` (mounted from `./config.json`).
The config follows the Claude Desktop format — a `mcpServers` map where each
entry is an MCP server launched by mcpo:

```json
{
  "mcpServers": {
    "time": {
      "command": "uvx",
      "args": ["mcp-server-time", "--local-timezone=Europe/Prague"]
    }
  }
}
```

Add more servers under `mcpServers` (e.g. `npx -y @modelcontextprotocol/server-everything`);
each is exposed under its own route.

- `--api-key`: bearer token required on every request. Defaults to the
  sandbox-safe value `top-secret` (override via `MCPO_API_KEY` in `.env`).
- OpenAPI docs are served at http://localhost:8000/docs and the raw schema
  at http://localhost:8000/openapi.json.

Call a tool (auth via the API key):

```bash
curl -X POST http://localhost:8000/time/get_current_time \
    -H "Authorization: Bearer top-secret" \
    -H "Content-Type: application/json" \
    -d '{"timezone": "Europe/Prague"}'
```

## Running

```bash
docker compose up -d
```

Interactive Swagger UI: http://localhost:8000/docs (the UI itself loads
without auth). The wrapped `time` MCP server is exposed under its own route
at http://localhost:8000/time with schema at http://localhost:8000/time/docs.

All **tool calls** require the API key as a bearer token
(`--api-key`, default `top-secret`, override via `MCPO_API_KEY` in `.env`):

```bash
curl -X POST http://localhost:8000/time/get_current_time \
    -H "Authorization: Bearer top-secret" \
    -H "Content-Type: application/json" \
    -d '{"timezone": "Europe/Prague"}'
```

## Notes

- **Wrapped MCP server:** `mcp-server-time` (launched via `uvx` from
  `config.json`), exposing a `time` tool as OpenAPI/REST.
- **First boot needs outbound internet.** mcpo runs the wrapped server via
  `uvx`/`npx` at container **start**, so the first boot downloads the
  `mcp-server-time` package (a few seconds). Watch progress with
  `docker compose logs -f`; the UI returns 200 on `/docs` once
  "Application startup complete" appears.
- **Port 8000 clash:** several ysandbox stacks publish host port 8000. To run
  mcpo alongside another such stack, add a gitignored
  `docker-compose.override.yml` remapping the port with `ports: !override`
  (never committed).
- The root `/docs` page lists available tools; per-tool operations render on
  each tool's own `/docs` sub-route (e.g. `/time/docs`).

## Links

- GitHub: https://github.com/open-webui/mcpo
