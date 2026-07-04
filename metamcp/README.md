# MetaMCP

MCP proxy and aggregator with a web UI. Bundles multiple MCP servers behind
unified "MetaMCP" endpoints, organises them into namespaces, and layers
middleware (filtering, transforms) over the aggregated tool set. Backed by
Postgres for persistence.

![MetaMCP dashboard](docs/dashboard.png)

## Services

| Service | Description |
|---------|-------------|
| **app** | MetaMCP Next.js web app, aggregator, and MCP endpoint server |
| **postgres** | PostgreSQL 16 for namespaces, endpoints, users, and config |

## Ports

| Port | Service |
|------|---------|
| `12008` | Web UI + MetaMCP endpoints |

## Usage

```bash
make docker-up
```

Open http://localhost:12008 — create an account on first visit, then build a
namespace and expose it as a unified MetaMCP endpoint (see below).

> **Security:** Before any real use, generate proper secrets:
> ```bash
> openssl rand -hex 32  # BETTER_AUTH_SECRET
> openssl rand -hex 32  # ENCRYPTION_KEY (64 hex chars = AES-256)
> ```

## Configuration

Key environment variables in `.env`:

| Variable | Default | Notes |
|----------|---------|-------|
| `BETTER_AUTH_SECRET` | `sandbox-...` | Session signing key — **change** |
| `ENCRYPTION_KEY` | `000...` | 64-hex AES-256 key for stored secrets — **change** |
| `APP_URL` | `http://localhost:12008` | Public URL of the web UI |
| `POSTGRES_USER` | `metamcp_user` | Database user |
| `POSTGRES_PASSWORD` | `m3t4mcp` | Database password |
| `POSTGRES_DB` | `metamcp_db` | Database name |
| `DATABASE_URL` | composed | Postgres connection string |
| `TRANSFORM_LOCALHOST_TO_DOCKER_INTERNAL` | `true` | Rewrite host `localhost` MCP URLs to `host.docker.internal` |

## Creating an endpoint

1. Register **MCP Servers** (stdio or SSE/HTTP) in the UI.
2. Group one or more servers into a **Namespace**, optionally attaching
   middleware to filter or transform tools.
3. Publish the namespace as a **MetaMCP Endpoint** — a single aggregated URL
   under `http://localhost:12008/metamcp/<endpoint>` that any MCP client
   (Claude Desktop, Cursor, etc.) can connect to.

## Links

- GitHub: https://github.com/metatool-ai/metamcp
