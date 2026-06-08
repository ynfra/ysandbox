# ysandbox — Agent Reference

Self-contained Docker Compose stacks demonstrating ynfrastructure patterns. Each subdirectory is an independent, runnable example.

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
| `agenta` | `ghcr.io/agenta-ai/agenta-web` + Traefik | 8081 | LLM engineering platform — prompt playground, evals, tracing |
| `anythingllm` | `mintplexlabs/anythingllm:latest` | 3001 | Document-aware AI chat with RAG |
| `browserless` | `ghcr.io/browserless/chromium:latest` | 3000 | Headless Chromium API for screenshots, PDFs, automation |
| `changedetection` | `ghcr.io/dgtlmoon/changedetection.io:latest` | 5000 | Website change monitoring and notifications |
| `chromium-browser` | `lscr.io/linuxserver/chrome:latest` | 3000 | LinuxServer Chrome with MCP extension support |
| `crawl4ai` | `unclecode/crawl4ai:latest` | 11235 | AI-powered web crawler with structured data extraction |
| `docling` | `ghcr.io/ds4sd/docling-serve:latest` | 5001 | PDF/DOCX → Markdown/JSON conversion |
| `docproc` | `ghcr.io/ds4sd/docling-serve:latest` + Browserless + Thumbor | 5001, 8866 | Bundled document processing stack (Docling, PaddleOCR, Browserless, Thumbor) |
| `firecrawl` | `ghcr.io/firecrawl/firecrawl:latest` | 3002 | Web scraping/crawling API with browser automation and job queues |
| `franken` | local `frankapp` build + Caddy | 8080 | FrankenPHP server with Caddy |
| `gotenberg` | `gotenberg/gotenberg:8` | 3000 | HTML, Office, and document → PDF conversion API |
| `grafana-stack` | `grafana/grafana:latest` + Prometheus + Mimir + MinIO + Nginx | 9000 (Grafana), 9090 (Prometheus), 9009 (LB), 8000/8001 (MinIO) | Grafana + Prometheus + MinIO + Mimir monitoring stack |
| `haproxy-consul` | `haproxy:3.2` + `hashicorp/consul:1.21` | 8080 (HAProxy), 8500 (Consul) | HAProxy with Consul service discovery |
| `healthchecks` | `healthchecks/healthchecks:latest` | 8000 | Cron job and uptime monitoring |
| `helicone` | `helicone/helicone-all-in-one:latest` | 3000 | LLM proxy + analytics (request logging, cost tracking, caching) |
| `iconify-swr` | `nginx:1.27` + `iconify/api:latest` | 8080 | Nginx + Iconify with proxy cache and stale-while-revalidate |
| `kasm-chromium` | `kasmweb/chromium:1.17.0` | 6901 | Kasm Workspaces Chromium with VNC web access |
| `langfuse` | `langfuse/langfuse:3` + `langfuse/langfuse-worker:3` | 3000 | LLM observability — traces, evals, prompt management |
| `librechat` | `ghcr.io/danny-avila/librechat:latest` + MongoDB + Meilisearch | 3080 | Multi-model AI chat platform |
| `litellm-proxy` | `ghcr.io/berriai/litellm:main-latest` + PostgreSQL + Prometheus | 4000 (LiteLLM), 9090 (Prometheus) | LiteLLM proxy with PostgreSQL and Prometheus |
| `lobechat` | `lobehub/lobe-chat:latest` | 3210 | Client-side AI chat UI for multiple LLM providers |
| `metabase-multi` | `metabase/metabase:v0.56.x` ×2 + PostgreSQL ×2 | 3001, 3002 | Dual Metabase instances with separate PostgreSQL databases |
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
| `qdrant` | `qdrant/qdrant:latest` | 6333 (HTTP), 6334 (gRPC) | High-performance vector database |
| `searxng` | `searxng/searxng:latest` + Valkey | 8080 | Self-hosted meta-search engine with JSON API |
| `seonaut` | `ghcr.io/stjudewashere/seonaut:latest` + MySQL | 9000 | SEO auditing tool — crawls sites for ranking issues |
| `serpbear` | `towfiqi/serpbear:latest` | 3000 | Search engine keyword position tracking |
| `skyvern` | `public.ecr.aws/skyvern/skyvern:latest` + PostgreSQL | 8000 (API), 8080 (UI), 9222 (CDP) | AI-powered browser automation with PostgreSQL |
| `squid` | local build | 3128 | Squid forward proxy server |
| `stirling-pdf` | `frooodle/s-pdf:latest` | 8080 | PDF toolkit (merge, split, OCR, convert) |
| `supabase` | `supabase/studio` + Kong + GoTrue + PostgREST + Realtime + Storage + Logflare + Supavisor | 8000 (API/Studio), 5432 (Postgres direct), 6543 (pooler) | Self-hosted Supabase backend platform |
| `terraform-r2` | — (Terraform only) | — | Terraform config for Cloudflare R2 storage buckets |
| `thumbor` | `ghcr.io/minimalcompact/thumbor:latest` | 8888 | On-demand image processing and resizing |
| `tika` | `apache/tika:latest` | 9998 | Content detection and extraction (1000+ file formats) |
| `traceloop` | `traceloop/hub` + PostgreSQL | 3030 | LLM observability on OpenTelemetry |
| `unlighthouse` | `ghcr.io/indykoning/unlighthouse-docker:master` | 5678 | Full-site Google Lighthouse scanning with web dashboard |
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

10. **Adding a new service** follows the pattern: create a subdirectory with `docker-compose.yml`, `Makefile` (with `docker-up` target), and `README.md`. Persist data under `.docker/`. Update the root `README.md` service list.
