# ysandbox — Agent Reference

**Local reference library.** Self-contained Docker Compose stacks for local
prototyping and experimentation. Each subdirectory is an independent,
copy-pasteable example — they do not share networks or depend on each other.
Port numbers are not globally unique across stacks; do not run two stacks with
the same host port simultaneously.

Once a service is proven here and needed in production, promote it to `ydocker/`
which manages the actual server deployment.

---

## Directory Layout

Every service folder follows the same pattern:

```
<service>/
  docker-compose.yml   # required — defines all containers
  Makefile             # optional — exposes `docker-up` target
  README.md            # optional — description and notes
  .docker/             # runtime state (gitignored) — volumes mount here
  <config-dirs>/       # optional static config (nginx/, grafana/, volumes/, etc.)
```

Exceptions:
- `nginx-php/` — includes a `Dockerfile` and custom build context (no pre-built image).
- `open-interpreter/`, `paddleocr/`, `squid/` — also use local `build:` directives.
- `franken/` — builds a `frankapp` image from a local Dockerfile.
- `terraform-r2/` — Terraform only, no Docker Compose (`main.tf`, `variables.tf`, `terraform.tfvars`).

---

## Running a Service

```bash
# Option 1 — via Makefile (when present)
cd <service>
make docker-up

# Option 2 — directly
cd <service>
docker compose up

# Detached
docker compose up -d

# Stop and remove containers
docker compose down
```

---

## Data Persistence

All runtime state is written to `.docker/` inside each service folder (gitignored). Common subdirectories:

| Path | Contents |
|------|----------|
| `.docker/postgres/` | PostgreSQL data |
| `.docker/redis/` | Redis persistence |
| `.docker/minio/` | MinIO object storage |
| `.docker/clickhouse/` | ClickHouse data + logs |
| `.docker/n8n/` | n8n user data |
| `.docker/data/` | Generic service data |

Named Docker volumes (e.g. `db-config`, `deno-cache` in `supabase`) are managed by Compose and not in `.docker/`.

---

## Service Catalog

| Service | Primary Image | Port(s) | Description |
|---------|--------------|---------|-------------|
| `activepieces` | `ghcr.io/activepieces/activepieces:0.86.0` + PostgreSQL (pgvector) + Redis | 8081 | No-code workflow automation (Zapier alternative) with MCP support |
| `agenta` | `ghcr.io/agenta-ai/agenta-web` + Traefik | 8081 | LLM engineering platform — prompt playground, evals, tracing |
| `agentregistry` | `ghcr.io/agentregistry-dev/agentregistry/server` + PostgreSQL | 12121 (UI/API), 31313 (MCP) | Registry for MCP servers, agents, skills, and prompts |
| `anythingllm` | `mintplexlabs/anythingllm:latest` | 3001 | Document-aware AI chat with RAG |
| `browserless` | `ghcr.io/browserless/chromium:latest` | 3000 | Headless Chromium API for screenshots, PDFs, automation |
| `changedetection` | `ghcr.io/dgtlmoon/changedetection.io:latest` | 5000 | Website change monitoring and notifications |
| `chroma` | `chromadb/chroma:1.5.9` | 8000 | AI-native open-source vector/embedding database (v2 REST API) |
| `chromium-browser` | `lscr.io/linuxserver/chrome:latest` | 3000 | LinuxServer Chrome with MCP extension support |
| `crawl4ai` | `unclecode/crawl4ai:latest` | 11235 | AI-powered web crawler with structured data extraction |
| `dify` | `langgenius/dify-api` + `dify-web` + `dify-sandbox` + PostgreSQL + Redis + Weaviate + Nginx | 8080 | Visual LLM app/workflow builder; apps can be exposed as MCP servers |
| `dify-mcp-server` | `ghcr.io/open-webui/mcpo:main` (wraps `dify_mcp_server`) | 8000 | MCP wrapper for invoking Dify workflows, exposed as OpenAPI/REST |
| `docling` | `ghcr.io/ds4sd/docling-serve:latest` | 5001 | PDF/DOCX → Markdown/JSON conversion |
| `docproc` | `ghcr.io/ds4sd/docling-serve:latest` + Browserless + Thumbor | 5001, 8866 | Bundled document processing stack (Docling, PaddleOCR, Browserless, Thumbor) |
| `firecrawl` | `ghcr.io/firecrawl/firecrawl:latest` | 3002 | Web scraping/crawling API with browser automation and job queues |
| `flowise` | `flowiseai/flowise:3.1.3` | 3000 | Visual drag-and-drop LLM agent/workflow builder with MCP integrations |
| `franken` | local `frankapp` build + Caddy | 8080 | FrankenPHP server with Caddy |
| `gotenberg` | `gotenberg/gotenberg:8` | 3000 | HTML, Office, and document → PDF conversion API |
| `grafana-stack` | `grafana/grafana:latest` + Prometheus + Mimir + MinIO + Nginx | 9000 (Grafana), 9090 (Prometheus), 9009 (LB), 8000/8001 (MinIO) | Grafana + Prometheus + MinIO + Mimir monitoring stack |
| `haproxy-consul` | `haproxy:3.2` + `hashicorp/consul:1.21` | 8080 (HAProxy), 8500 (Consul) | HAProxy with Consul service discovery |
| `healthchecks` | `healthchecks/healthchecks:latest` | 8000 | Cron job and uptime monitoring |
| `helicone` | `helicone/helicone-all-in-one:latest` | 3000 | LLM proxy + analytics (request logging, cost tracking, caching) |
| `iconify-swr` | `nginx:1.27` + `iconify/api:latest` | 8080 | Nginx + Iconify with proxy cache and stale-while-revalidate |
| `imgproxy` | `darthsim/imgproxy:v4.0.11` | 8085 | Fast on-the-fly image processing (resize, crop, WebP/AVIF) via URL parameters |
| `kasm-chromium` | `kasmweb/chromium:1.17.0` | 6901 | Kasm Workspaces Chromium with VNC web access |
| `langflow` | `langflowai/langflow:1.10.1` + PostgreSQL | 7860 | Visual AI workflow builder; flows exposed as MCP tools |
| `langflow-mcp` | `supercorp/supergateway` (wraps `langflow-mcp-server`) | 8000 | MCP bridge exposing Langflow flows as MCP tools (stdio→SSE) |
| `langfuse` | `langfuse/langfuse:3` + `langfuse/langfuse-worker:3` | 3000 | LLM observability — traces, evals, prompt management |
| `librechat` | `ghcr.io/danny-avila/librechat:latest` + MongoDB + Meilisearch | 3080 | Multi-model AI chat platform |
| `litellm-proxy` | `ghcr.io/berriai/litellm:main-latest` + PostgreSQL + Prometheus | 4000 (LiteLLM), 9090 (Prometheus) | LiteLLM proxy with PostgreSQL and Prometheus |
| `lobechat` | `lobehub/lobe-chat:latest` | 3210 | Client-side AI chat UI for multiple LLM providers |
| `mcp-gateway-registry` | `public.ecr.aws/p3v1o3c6/registry` + auth-server + mcpgw + MongoDB + Keycloak + OpenBao + Postgres + Prometheus + Grafana | 7860 (UI/gateway), 8443 (HTTPS) | Governed control plane for MCP servers, agents, and skills |
| `mcp-proxy` | `ghcr.io/tbxark/mcp-proxy:latest` | 9090 | TBXark lightweight MCP proxy aggregating many MCP servers behind one HTTP server |
| `mcphub` | `samanhappy/mcphub:latest` | 3000 | Unified hub/gateway for multiple MCP servers with dashboard and Streamable HTTP/SSE |
| `mcpjungle` | `ghcr.io/mcpjungle/mcpjungle` + PostgreSQL | 8080 | Self-hosted MCP gateway/registry — one endpoint for many MCP servers |
| `mcpo` | `ghcr.io/open-webui/mcpo:main` | 8000 | Expose MCP tools as OpenAPI/REST (by Open WebUI) |
| `meilisearch` | `getmeili/meilisearch:v1.48.3` | 7700 | Lightning-fast, typo-tolerant full-text search engine with REST API and search preview UI |
| `metabase-multi` | `metabase/metabase:v0.56.x` ×2 + PostgreSQL ×2 | 3001, 3002 | Dual Metabase instances with separate PostgreSQL databases |
| `metamcp` | `ghcr.io/metatool-ai/metamcp:latest` + PostgreSQL | 12008 | MCP proxy/aggregator with middleware and namespaces |
| `minio` | `minio/minio:latest` | 9000 (API), 9001 (console) | MinIO S3-compatible object storage |
| `n8n` | `n8nio/n8n:1.107.4` + PostgreSQL + Redis + Qdrant | 5678 (n8n), 8000 (Adminer), 6333 (Qdrant) | Workflow automation in queue mode with PostgreSQL and Redis |
| `neko-browser` | `dockette/neko:chromium` | 8080 | Neko browser streaming with virtual display |
| `neko-playwright` | `dockette/neko:chromium` | 8080 | Neko + Playwright browser automation |
| `neko-stagehand` | `dockette/neko:chromium` | 8080 | Neko + Stagehand browser automation |
| `nginx-php` | custom build (Nginx + PHP-FPM) | 8080 | Nginx + PHP-FPM setup |
| `nginx-proxy` | `nginx:1.27` + `oven/bun:latest` | 8080 | Nginx + Bun.js app with proxy pass |
| `nginx-swr` | `nginx:1.27` + `oven/bun:latest` | 8080 | Nginx + Bun.js with proxy cache and stale-while-revalidate |
| `open-interpreter` | local build | 8000 | Code-executing AI agent via WebSocket and HTTP API |
| `openobserve` | `public.ecr.aws/zinclabs/openobserve:latest` | 5080 | Observability platform for logs, metrics, and traces |
| `openserp` | `karust/openserp:latest` | 7000 | Search engine results API (Google, Bing, Yandex, Baidu, DuckDuckGo) |
| `openwebui` | `ghcr.io/open-webui/open-webui:main` | 8080 | Open WebUI chat interface for multiple LLM providers |
| `opik` | `ghcr.io/comet-ml/opik/opik-frontend:latest` + backend stack | 5173 | LLM observability and evaluation platform by Comet |
| `paddleocr` | local build | 8866 | PaddleOCR REST API supporting 80+ languages |
| `pandoc` | `pandoc/extra:latest` | 3030 | Universal document format converter (Markdown, DOCX, EPUB, HTML, LaTeX) |
| `paperless` | `ghcr.io/paperless-ngx/paperless-ngx:latest` + Tika + Gotenberg | 8000 | Document management with OCR |
| `phoenix` | `arizephoenix/phoenix:latest` + PostgreSQL | 6006 | LLM observability by Arize (tracing, evals, OpenTelemetry) |
| `prompthub` | `ghcr.io/legeling/prompthub-web:latest` | 3871 | PromptHub self-hosted web — prompt/skill/agent management (SQLite, local login) |
| `promptregistry-mcp` | `supercorp/supergateway` (wraps `mcp-promptregistry`) | 8000 | Simple MCP prompt registry (stdio→SSE) |
| `promptschat` | `ghcr.io/f/prompts.chat:latest` + PostgreSQL | 4444 | Self-hosted prompts.chat prompt library (Next.js) with local credential login |
| `qdrant` | `qdrant/qdrant:latest` | 6333 (HTTP), 6334 (gRPC) | High-performance vector database |
| `searxng` | `searxng/searxng:latest` + Valkey | 8080 | Self-hosted meta-search engine with JSON API |
| `seonaut` | `ghcr.io/stjudewashere/seonaut:latest` + MySQL | 9000 | SEO auditing tool — crawls sites for ranking issues |
| `serpbear` | `towfiqi/serpbear:latest` | 3000 | Search engine keyword position tracking |
| `skillnote` | `ghcr.io/luna-prompts/skillnote-{api,web}:0.5.4` + PostgreSQL | 3000 (web), 8082 (API) | Open-source skill registry for AI coding agents (SKILL.md create/version/distribute) |
| `skyvern` | `public.ecr.aws/skyvern/skyvern:latest` + PostgreSQL | 8000 (API), 8080 (UI), 9222 (CDP) | AI-powered browser automation with PostgreSQL |
| `squid` | local build | 3128 | Squid forward proxy server |
| `stirling-pdf` | `frooodle/s-pdf:latest` | 8080 | PDF toolkit (merge, split, OCR, convert) |
| `supabase` | `supabase/studio` + Kong + GoTrue + PostgREST + Realtime + Storage + Logflare + Supavisor | 8000 (API/Studio), 5432 (Postgres direct), 6543 (pooler) | Self-hosted Supabase backend platform |
| `supergateway` | `supercorp/supergateway:latest` | 8000 | Transport bridge — stdio MCP to SSE/WebSocket/HTTP |
| `terraform-r2` | — (Terraform only) | — | Terraform config for Cloudflare R2 storage buckets |
| `thumbor` | `ghcr.io/minimalcompact/thumbor:latest` | 8888 | On-demand image processing and resizing |
| `tika` | `apache/tika:latest` | 9998 | Content detection and extraction (1000+ file formats) |
| `traceloop` | `traceloop/hub` + PostgreSQL | 3030 | LLM observability on OpenTelemetry |
| `unlighthouse` | `ghcr.io/indykoning/unlighthouse-docker:master` | 5678 | Full-site Google Lighthouse scanning with web dashboard |
| `uptime-kuma` | `louislam/uptime-kuma:2.4.0` | 3001 | Self-hosted uptime monitoring dashboard with status pages and notifications |
| `weaviate` | `semitechnologies/weaviate:1.38.2` | 8080 (REST/GraphQL), 50051 (gRPC) | Open-source vector database with hybrid vector + BM25 search |
| `webtop-browser` | `lscr.io/linuxserver/webtop:latest` | 3000 | Web-accessible Linux desktop environment |
| `windmill` | `ghcr.io/windmill-labs/windmill` (via `$WM_IMAGE`) + Caddy + PostgreSQL | 8000 | Workflow engine with Caddy reverse proxy |
| `yellowlabtools` | `ousamabenyounes/yellowlabtools:latest` | 8383 | Web page performance and front-end quality analysis |
| `youtube-downloader` | `ghcr.io/kieraneglin/pinchflat:latest` + `ghcr.io/alexta69/metube` | 8945 (Pinchflat), 8081 (MeTube) | YouTube media downloader (Pinchflat + MeTube) |

---

## Rules for Agents

1. **Each service is independent.** Do not modify one service's `docker-compose.yml` to satisfy another service's needs. Port conflicts between services are expected when running multiple stacks simultaneously.

2. **Never commit `.docker/` directories.** They contain runtime state and secrets. They are gitignored by convention.

3. **Never commit `.env` files.** Services that require secrets use `.env` (loaded via `env_file:` directive) or embed sandbox-safe defaults in `docker-compose.yml`.

4. **Hardcoded credentials are sandbox-only.** Passwords and keys in `docker-compose.yml` (e.g. `supabase-sandbox`, `sk-1234`) are intentional defaults for local testing. Do not treat them as production patterns.

5. **`.docker/` is the only place state lives.** When a service needs to be reset, delete `.docker/` and recreate containers. Named Docker volumes (e.g. in `supabase`) are the exception — use `docker compose down -v` to also remove those.

6. **Makefile target is always `docker-up`.** When a `Makefile` exists, the standard target is `make docker-up` which runs `docker compose up`. Do not add other targets unless there is a specific need.

7. **Services with `build:` directives** (`nginx-php`, `open-interpreter`, `paddleocr`, `squid`, `franken`) require `docker compose build` before first run, or pass `--build` flag.

8. **`terraform-r2` is not a Docker stack.** Use `terraform init && terraform apply` — not `docker compose`.

9. **Port numbers in this repo are not globally unique.** Different services reuse the same host ports (e.g. 8080, 3000). Never run two stacks with the same host port simultaneously.

10. **Adding a new service** follows the pattern: create a subdirectory with `docker-compose.yml`, `Makefile` (with `docker-up` target), and `README.md`. Persist data under `.docker/`. Update the root `README.md` service list **and** the Service Catalog table above.

11. **Screenshots live in `<service>/docs/*.png`.** For stacks with a web UI, capture a FullHD (1920×1080) screenshot of the running dashboard and reference it near the top of the `README.md` (e.g. `![MCPHub dashboard](docs/dashboard.png)`). The `agent-browser` skill (see root `.claude/skills/agent-browser`) is the tool for this — set `set viewport 1920 1080` and use absolute paths for `screenshot`.

12. **Local `docker-compose.override.yml` is gitignored.** Use a throwaway `docker-compose.override.yml` to remap host ports when you need two stacks to coexist during testing (Compose auto-loads it). Replace a whole list with the `!override` tag: `ports: !override` then the new list (a bare list *merges/appends*, it does not replace). Never commit these overrides.

---

## MCP gateway / wrapper stacks — patterns & lessons

The `mcphub`, `mcpjungle`, `metamcp`, `mcp-proxy`, `mcp-gateway-registry`,
`agentregistry`, `supergateway`, `mcpo`, `dify-mcp-server`, `langflow-mcp`, and
`promptregistry-mcp` stacks are MCP hubs/aggregators/wrappers. Hard-won notes:

- **Wrap stdio-only MCP servers to get a testable HTTP endpoint.** Many MCP
  servers speak stdio only and ship no image. Run them via `npx`/`uvx` inside a
  bridge:
  - `supercorp/supergateway` — stdio → SSE/WS/Streamable-HTTP (SSE on `/sse`,
    health `/healthz`). Used by `supergateway`, `langflow-mcp`, `promptregistry-mcp`.
  - `ghcr.io/open-webui/mcpo` — stdio → OpenAPI/REST (docs at `/docs`). Used by
    `mcpo`, `dify-mcp-server`.
  These bridge images ship `npx`/`uvx`, so the wrapped server is fetched at
  container **start** — first boot needs outbound internet and takes a few seconds.

- **Verify the npm/PyPI package name, not the repo name.** They differ:
  `promptregistry-mcp` (repo) is published as **`mcp-promptregistry`** on npm.
  Confirm with `npm view <pkg> version` / PyPI before wiring `npx -y <pkg>`.

- **Pin versions; `:latest` drifts and breaks stale compose.** The pre-existing
  `agenta` stack targeted an old schema and no longer booted against `:latest`
  (renamed env vars `DATABASE_URL`→`POSTGRES_URI_{CORE,TRACING,SUPERTOKENS}`,
  renamed worker modules `oss.entrypoints.*`→`entrypoints.*`, `api`/`services`
  needed explicit gunicorn commands the old image supplied by default). Pin app
  images to a known release and re-check against upstream's current
  `docker-compose` + `.env.example` when reviving a stack. For `langflow-mcp`,
  npm `latest` (3.1.1) targets a different Langflow API than the repo's newest
  git tag — pin the npm version explicitly.

- **Healthcheck binaries must exist in the image.** Alpine/scratch images often
  lack `curl` *and* `wget`. If a stack reports perpetual `unhealthy`, the probe
  binary is missing. Fallbacks that worked: `wget` (busybox images), `python -c`
  urllib (python images, e.g. `mcpo`), a `node` TCP probe (`mcp-proxy`), or a
  bash `/dev/tcp` probe. Confirm before relying on a healthcheck, especially
  when another service `depends_on: { condition: service_healthy }`.

- **Public vs internal URLs for browser-facing auth.** A frontend served through
  a reverse proxy must be told the **public** URL it's reachable at, not the
  internal service hostname. `agenta`'s web entrypoint bakes `AGENTA_API_URL`
  (default `http://localhost/api`) into a browser-loaded `/__env.js`; setting it
  to `http://traefik:80/api` made the browser call the wrong host and auth failed
  with "Unable to connect to the authentication service". Fix: point the
  public URL vars at `http://localhost:<published-port>/...`. When you change a
  proxy's published host port, update these public URLs too.

- **Postgres host-port clashes.** Several stacks publish Postgres on
  `127.0.0.1:5432`. To run two at once (e.g. `mcpjungle` + `agentregistry`), add
  a gitignored `docker-compose.override.yml` remapping one with `ports: !override`.

- **Docker-socket mounts = host-root-equivalent.** `agentregistry` and
  `mcp-gateway-registry` mount `/var/run/docker.sock` so the server can launch
  MCP/agent containers. Flag this clearly in the README; `:ro` does not make it safe.
