# MCP Gateway & Registry

A governed control plane for MCP servers, AI agents, skills, and custom AI
assets ([agentic-community/mcp-gateway-registry](https://github.com/agentic-community/mcp-gateway-registry)).
It combines an **nginx reverse-proxy gateway**, a **FastAPI registry + web UI**,
and a separate **OAuth/OIDC auth server** into a single entry point: one secure
gateway URL fronting many MCP servers, with centralized discovery, access
control, semantic search, and audit.

This stack uses the upstream **pre-built images** published to Amazon ECR
Public (`public.ecr.aws/p3v1o3c6`) — no build from source required. It mirrors
the official `docker-compose.prebuilt.yml`, adapted to ysandbox conventions
(state under `.docker/`, registry UI on host `7860`).

> **Note on images:** the core services (`registry`, `auth-server`, `mcpgw`)
> ship only as ECR Public images; there is no Docker Hub / GHCR mirror. ECR
> Public rate-limits anonymous pulls, so the first `up` may need a retry or two.
> The demo MCP servers (`currenttime`, `realserverfaketools`) and the standalone
> `metrics-service` are **not** published to ECR and are therefore omitted here
> (they only exist in the upstream build-from-source `docker-compose.yml`).

## Services

| Service | Image | Description |
|---------|-------|-------------|
| **registry** | `public.ecr.aws/p3v1o3c6/registry:latest` | nginx gateway + FastAPI registry + web UI (bundles sentence-transformers embeddings) |
| **auth-server** | `public.ecr.aws/p3v1o3c6/auth-server:latest` | OAuth/OIDC broker + token minting |
| **mcpgw-server** | `public.ecr.aws/p3v1o3c6/mcpgw:latest` | `mcpgw` MCP server exposing registry tools |
| **mongodb** | `mongo:8.2` | Storage backend + semantic search (replica set `rs0`, `--auth`) |
| **mongodb-keyfile-init** | `alpine:latest` | One-shot: generates the replica-set keyfile |
| **mongodb-init** | `python:3.14-slim` | One-shot: creates replica set, indexes, seeds admin scopes |
| **openbao** | `openbao/openbao:2.5.5` | Per-user egress credential vault (dev mode, in-memory) |
| **keycloak** | `quay.io/keycloak/keycloak:25.0` | Identity provider (OIDC) |
| **keycloak-db** | `postgres:16-alpine` | Keycloak backing store |
| **prometheus** | `prom/prometheus:v3.11.3` | Scrapes OTel-native metrics (`:9464`) from the core services |
| **grafana** | `grafana/grafana:12.3.1` | Dashboards over Prometheus |
| **pingfederate** | `pingidentity/pingfederate:13.0.2` | Optional alternative IdP (disabled; `pingfederate` profile, needs Ping EULA) |

## Ports

| Host port | Service | Notes |
|-----------|---------|-------|
| `7860` | registry UI + gateway (HTTP) | primary entry point |
| `8443` | gateway (HTTPS) | needs mounted certs — see Configuration |
| `127.0.0.1:8888` | auth-server | loopback; normally reached via the gateway |
| `127.0.0.1:8003` | mcpgw-server | loopback |
| `127.0.0.1:8080` | keycloak | loopback |
| `127.0.0.1:27017` | mongodb | loopback |
| `127.0.0.1:8200` | openbao | loopback |
| `127.0.0.1:9090` | prometheus | loopback |
| `127.0.0.1:3000` | grafana | loopback |

Loopback ports bind to `${HOST_BIND_IP:-127.0.0.1}`; set `HOST_BIND_IP=0.0.0.0`
to expose them. Keycloak defaults to host `8080`; if that port is taken, change
its mapping before running.

## Usage

```bash
make docker-up
```

Then open http://localhost:7860 — the **AI Gateway & Registry** UI. First run
pulls several GB of images and seeds MongoDB, so allow a few minutes; the
registry reports `healthy` once nginx has reloaded a valid config.

## Configuration

Sandbox-safe defaults live in `.env` (**change every secret before real use**):

| Variable | Default | Notes |
|----------|---------|-------|
| `SECRET_KEY` | `sandbox-…` | App signing key, **≥32 chars** — required |
| `AUTH_SERVER_NGINX_MARKER_SECRET` | `sandbox-…` | Shared nginx→auth marker, **≥32 chars**, identical in registry + auth-server — required |
| `DOCUMENTDB_USERNAME` / `DOCUMENTDB_PASSWORD` | `admin` / `sandbox-mongo-pass` | MongoDB root creds |
| `OPENBAO_TOKEN` | `dev-root-token` | Dev-mode vault root token |
| `AUTH_PROVIDER` / `KEYCLOAK_ENABLED` | `keycloak` / `true` | Identity provider selection |
| `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD` | `admin` / `sandbox-keycloak-admin` | Keycloak master-realm admin console (http://localhost:8080) |
| `KEYCLOAK_CLIENT_SECRET` / `KEYCLOAK_M2M_CLIENT_SECRET` | `sandbox-…` | OIDC client secrets |
| `GRAFANA_ADMIN_PASSWORD` | `sandbox-grafana-admin` | Grafana admin (required, no default) |
| `MCP_TELEMETRY_DISABLED` | `1` | Anonymous usage telemetry off |

Generate real secrets with:

```bash
openssl rand -hex 32   # SECRET_KEY
openssl rand -hex 32   # AUTH_SERVER_NGINX_MARKER_SECRET
```

### Auth / admin setup (first-run)

The default identity provider is **Keycloak**. The registry auto-writes an
nginx config that proxies OIDC to the `keycloak` container. For login to
actually succeed you must provision the `mcp-gateway` realm with the
`mcp-gateway-web` / `mcp-gateway-m2m` clients and a user — either through the
Keycloak admin console (http://localhost:8080, `admin` / `KEYCLOAK_ADMIN_PASSWORD`)
or by dropping a realm-export JSON into `keycloak/import/` (mounted at
`/opt/keycloak/data/import`). Registry admin identities are seeded into MongoDB
from `scripts/registry-admins.json` / `scripts/mcp-registry-admin.json` by the
`mongodb-init` job. See the upstream
[docs](https://agentic-community.github.io/mcp-gateway-registry) for the full
Keycloak bootstrap. The gateway UI and unauthenticated pages serve without this;
`/api/*` correctly returns `401` until you log in.

### HTTPS (port 8443)

The registry image serves HTTP on `8080` (mapped to host `7860`) out of the box.
The HTTPS listener on container `8443` needs certificates: mount a cert directory
into `/etc/ssl` on the `registry` service (the upstream setup scripts generate a
self-signed pair under `~/mcp-gateway/ssl`). Without it, only HTTP is served.

### Mounted config

| Path | Purpose |
|------|---------|
| `config/prometheus.yml` | Prometheus scrape config (per-service `:9464` OTel endpoints) |
| `config/grafana/{dashboards,datasources}/` | Grafana provisioning (Prometheus datasource) |
| `config/federation.json` | Registry federation peer config (`{}` by default) |
| `scripts/init-mongodb-ce.py` + `scripts/*.json` | MongoDB seed script + admin/scope definitions (from upstream) |
| `keycloak/{themes,providers,import}/` | Keycloak extension + realm-import mount points |

All runtime state is written under `.docker/` (gitignored). Reset the stack with
`docker compose down -v` and `rm -rf .docker`.

## Links

- GitHub: https://github.com/agentic-community/mcp-gateway-registry
- Docs: https://agentic-community.github.io/mcp-gateway-registry
