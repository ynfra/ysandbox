# ynfra / ysandbox

A local reference library of **self-contained Docker Compose stacks** — one
folder per service, each independent and copy-pasteable. Use it to prototype,
evaluate, and learn tools before promoting the good ones to production
(`ydocker/`).

## Usage

```bash
cd <stack>
docker compose up        # or: make docker-up
```

Every stack follows the same shape: `docker-compose.yml`, a `Makefile` with a
`docker-up` target, a `README.md` with ports and notes, and runtime state
under `.docker/` (gitignored).

## Stacks

| Stack | Category | Description |
|---|---|---|
| [anythingllm](./anythingllm) | AI chat & agents | AnythingLLM document-aware AI chat with RAG |
| [librechat](./librechat) | AI chat & agents | Multi-model AI chat platform with MongoDB and Meilisearch |
| [lobechat](./lobechat) | AI chat & agents | LobeChat client-side AI chat UI for multiple LLM providers |
| [open-interpreter](./open-interpreter) | AI chat & agents | Code-executing AI agent via WebSocket and HTTP API |
| [openwebui](./openwebui) | AI chat & agents | Open WebUI chat interface for multiple LLM providers |
| [activepieces](./activepieces) | LLM app & workflow builders | No-code workflow automation (Zapier alternative) with MCP support |
| [dify](./dify) | LLM app & workflow builders | Visual LLM app/workflow builder; apps can be exposed as MCP servers |
| [flowise](./flowise) | LLM app & workflow builders | Visual drag-and-drop LLM agent/workflow builder with MCP integrations |
| [langflow](./langflow) | LLM app & workflow builders | Visual AI workflow builder; flows exposed as MCP tools |
| [n8n](./n8n) | LLM app & workflow builders | n8n workflow automation with PostgreSQL, Redis, and Qdrant |
| [windmill](./windmill) | LLM app & workflow builders | Windmill workflow engine with Caddy |
| [prompthub](./prompthub) | Prompt management | PromptHub self-hosted prompt/skill/agent management (SQLite, local login) |
| [promptschat](./promptschat) | Prompt management | Self-hosted prompts.chat prompt library (Next.js + PostgreSQL) |
| [skillnote](./skillnote) | Prompt management | SkillNote skill registry for AI coding agents — create/version/distribute SKILL.md files |
| [agenta](./agenta) | LLM engineering & observability | Agenta LLM engineering platform — prompt playground, evaluations, tracing |
| [helicone](./helicone) | LLM engineering & observability | Helicone LLM proxy and analytics — request logging, cost tracking, caching |
| [langfuse](./langfuse) | LLM engineering & observability | Langfuse LLM observability — traces, evals, prompt management |
| [litellm-proxy](./litellm-proxy) | LLM engineering & observability | LiteLLM proxy with PostgreSQL and Prometheus monitoring |
| [opik](./opik) | LLM engineering & observability | Opik LLM observability and evaluation platform by Comet |
| [phoenix](./phoenix) | LLM engineering & observability | Arize Phoenix LLM observability — tracing, evals, OpenTelemetry |
| [traceloop](./traceloop) | LLM engineering & observability | Traceloop Hub LLM observability on OpenTelemetry |
| [agentregistry](./agentregistry) | MCP gateways & bridges | Registry for MCP servers, agents, skills, and prompts |
| [dify-mcp-server](./dify-mcp-server) | MCP gateways & bridges | MCP wrapper for invoking Dify workflows (via mcpo) |
| [langflow-mcp](./langflow-mcp) | MCP gateways & bridges | MCP bridge exposing Langflow flows as MCP tools (via supergateway) |
| [mcp-gateway-registry](./mcp-gateway-registry) | MCP gateways & bridges | Governed control plane for MCP servers, agents, and skills |
| [mcp-proxy](./mcp-proxy) | MCP gateways & bridges | TBXark lightweight MCP proxy aggregating multiple MCP servers behind one HTTP server |
| [mcphub](./mcphub) | MCP gateways & bridges | Unified hub/gateway for multiple MCP servers with dashboard and Streamable HTTP/SSE |
| [mcpjungle](./mcpjungle) | MCP gateways & bridges | Self-hosted MCP gateway/registry — one endpoint for many MCP servers |
| [mcpo](./mcpo) | MCP gateways & bridges | Expose MCP tools as OpenAPI/REST (by Open WebUI) |
| [metamcp](./metamcp) | MCP gateways & bridges | MCP proxy/aggregator with middleware and namespaces |
| [promptregistry-mcp](./promptregistry-mcp) | MCP gateways & bridges | Simple MCP prompt registry (via supergateway) |
| [supergateway](./supergateway) | MCP gateways & bridges | Transport bridge — stdio MCP to SSE/WebSocket/HTTP |
| [chroma](./chroma) | Vector databases & search | Chroma AI-native vector/embedding database for LLM apps |
| [meilisearch](./meilisearch) | Vector databases & search | Lightning-fast, typo-tolerant search engine with REST API |
| [openserp](./openserp) | Vector databases & search | Search engine results API (Google, Bing, Yandex, Baidu, DuckDuckGo) |
| [qdrant](./qdrant) | Vector databases & search | Qdrant high-performance vector database for AI applications |
| [searxng](./searxng) | Vector databases & search | SearXNG self-hosted meta-search engine with JSON API |
| [weaviate](./weaviate) | Vector databases & search | Weaviate vector database with hybrid vector + BM25 search |
| [changedetection](./changedetection) | Web crawling & scraping | ChangeDetection.io website change monitoring and notifications |
| [crawl4ai](./crawl4ai) | Web crawling & scraping | AI-powered web crawler with structured data extraction |
| [firecrawl](./firecrawl) | Web crawling & scraping | Web scraping and crawling API with browser automation and job queues |
| [browserless](./browserless) | Browsers & automation | Headless Chromium API for automation, screenshots, and PDFs |
| [chromium-browser](./chromium-browser) | Browsers & automation | LinuxServer Chrome browser with MCP extensions support |
| [kasm-chromium](./kasm-chromium) | Browsers & automation | Kasm Workspaces Chromium browser with VNC web access |
| [neko-browser](./neko-browser) | Browsers & automation | Neko browser streaming with virtual display |
| [neko-playwright](./neko-playwright) | Browsers & automation | Neko + Playwright browser automation |
| [neko-stagehand](./neko-stagehand) | Browsers & automation | Neko + Stagehand browser automation |
| [skyvern](./skyvern) | Browsers & automation | Skyvern AI-powered browser automation platform |
| [webtop-browser](./webtop-browser) | Browsers & automation | LinuxServer web-accessible Linux desktop environment |
| [docling](./docling) | Documents & OCR | Document conversion service (PDF/DOCX to Markdown/JSON) |
| [docproc](./docproc) | Documents & OCR | Bundled document processing stack (Docling, PaddleOCR, Browserless, Thumbor) |
| [gotenberg](./gotenberg) | Documents & OCR | HTML, Office, and document to PDF conversion API |
| [paddleocr](./paddleocr) | Documents & OCR | PaddleOCR REST API supporting 80+ languages |
| [pandoc](./pandoc) | Documents & OCR | Pandoc universal document format converter |
| [paperless](./paperless) | Documents & OCR | Paperless-NGX document management with OCR, Tika, and Gotenberg |
| [stirling-pdf](./stirling-pdf) | Documents & OCR | Stirling-PDF toolkit for merging, splitting, OCR, and converting PDFs |
| [tika](./tika) | Documents & OCR | Apache Tika content detection and extraction (1000+ file formats) |
| [imgproxy](./imgproxy) | Media & images | Fast on-the-fly image processing powered by libvips |
| [thumbor](./thumbor) | Media & images | Thumbor on-demand image processing and resizing server |
| [youtube-downloader](./youtube-downloader) | Media & images | YouTube media downloader (Pinchflat + MeTube) |
| [seonaut](./seonaut) | SEO & web performance | SEOnaut SEO auditing tool — crawls sites for ranking issues |
| [serpbear](./serpbear) | SEO & web performance | SerpBear search engine keyword position tracking |
| [unlighthouse](./unlighthouse) | SEO & web performance | Full-site Google Lighthouse scanning with web dashboard |
| [yellowlabtools](./yellowlabtools) | SEO & web performance | Web page performance and front-end quality analysis |
| [grafana-stack](./grafana-stack) | Monitoring & observability | Grafana, Prometheus, MinIO, Mimir, Nginx monitoring stack |
| [healthchecks](./healthchecks) | Monitoring & observability | Healthchecks.io cron job and uptime monitoring |
| [openobserve](./openobserve) | Monitoring & observability | OpenObserve observability platform for logs, metrics, and traces |
| [uptime-kuma](./uptime-kuma) | Monitoring & observability | Self-hosted uptime monitoring with status pages and notifications |
| [metabase-multi](./metabase-multi) | Data & storage | Dual Metabase instances with separate PostgreSQL databases |
| [minio](./minio) | Data & storage | MinIO S3-compatible object storage with web console |
| [supabase](./supabase) | Data & storage | Self-hosted Supabase backend platform (PostgreSQL, Auth, Storage, Realtime) |
| [terraform-r2](./terraform-r2) | Data & storage | Terraform configuration for Cloudflare R2 storage (no Docker) |
| [franken](./franken) | Web servers & proxies | FrankenPHP server with Caddy |
| [haproxy-consul](./haproxy-consul) | Web servers & proxies | HAProxy with Consul service discovery |
| [iconify-swr](./iconify-swr) | Web servers & proxies | Nginx + Iconify with proxy cache and stale-while-revalidate |
| [nginx-php](./nginx-php) | Web servers & proxies | Nginx + PHP-FPM setup |
| [nginx-proxy](./nginx-proxy) | Web servers & proxies | Nginx + Bun.js app with proxy pass |
| [nginx-swr](./nginx-swr) | Web servers & proxies | Nginx + Bun.js with proxy cache and stale-while-revalidate |
| [squid](./squid) | Web servers & proxies | Squid forward proxy server |

## Notes

- Stacks don't share networks and host ports may clash between stacks — run one at a time, or remap ports in a local `docker-compose.override.yml`.
- `terraform-r2` is the one non-Docker stack — use `terraform apply` instead.
- `.docker/` holds runtime state and is gitignored — never commit it; delete it to reset a stack.

See [AGENTS.md](AGENTS.md) for conventions, internals, and gotchas.
