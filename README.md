# Ynfra / Sandbox

Examples of ynfrastructure.

## AI chat & agents

- [ysandbox/anythingllm](./anythingllm) - AnythingLLM document-aware AI chat with RAG.
- [ysandbox/librechat](./librechat) - Multi-model AI chat platform with MongoDB and Meilisearch.
- [ysandbox/lobechat](./lobechat) - LobeChat client-side AI chat UI for multiple LLM providers.
- [ysandbox/open-interpreter](./open-interpreter) - Code-executing AI agent via WebSocket and HTTP API.
- [ysandbox/openwebui](./openwebui) - Open WebUI chat interface for multiple LLM providers.

## LLM app & workflow builders

- [ysandbox/activepieces](./activepieces) - Open-source no-code workflow automation (Zapier alternative) with MCP support, backed by PostgreSQL and Redis.
- [ysandbox/dify](./dify) - Visual LLM app/workflow builder; apps can be exposed as MCP servers.
- [ysandbox/flowise](./flowise) - Visual drag-and-drop LLM agent/workflow builder with MCP integrations.
- [ysandbox/langflow](./langflow) - Visual AI workflow builder; flows exposed as MCP tools (with PostgreSQL).
- [ysandbox/n8n](./n8n) - n8n workflow automation with PostgreSQL, Redis, and Qdrant.
- [ysandbox/windmill](./windmill) - Windmill workflow engine with Caddy.

## Prompt management

- [ysandbox/prompthub](./prompthub) - PromptHub self-hosted web edition — prompt/skill/agent management with local login (SQLite).
- [ysandbox/promptschat](./promptschat) - Self-hosted prompts.chat prompt library (Next.js + PostgreSQL) with local credential login.
- [ysandbox/skillnote](./skillnote) - SkillNote open-source skill registry for AI coding agents — create/version/distribute SKILL.md files (Next.js + FastAPI + PostgreSQL).

## LLM engineering & observability

- [ysandbox/agenta](./agenta) - Agenta LLM engineering platform — prompt playground, evaluations, and tracing.
- [ysandbox/helicone](./helicone) - Helicone LLM proxy and analytics — request logging, cost tracking, and caching.
- [ysandbox/langfuse](./langfuse) - Langfuse LLM observability — traces, evals, and prompt management.
- [ysandbox/litellm-proxy](./litellm-proxy) - LiteLLM proxy with PostgreSQL and Prometheus monitoring.
- [ysandbox/opik](./opik) - Opik LLM observability and evaluation platform by Comet.
- [ysandbox/phoenix](./phoenix) - Arize Phoenix LLM observability — tracing, evals, and OpenTelemetry support.
- [ysandbox/traceloop](./traceloop) - Traceloop Hub LLM observability on OpenTelemetry.

## MCP gateways & bridges

- [ysandbox/agentregistry](./agentregistry) - Registry for MCP servers, agents, skills, and prompts (server + PostgreSQL).
- [ysandbox/dify-mcp-server](./dify-mcp-server) - MCP wrapper for invoking Dify workflows (via mcpo).
- [ysandbox/langflow-mcp](./langflow-mcp) - MCP bridge exposing Langflow flows as MCP tools (via supergateway).
- [ysandbox/mcp-gateway-registry](./mcp-gateway-registry) - Governed control plane for MCP servers, agents, and skills.
- [ysandbox/mcp-proxy](./mcp-proxy) - TBXark lightweight MCP proxy aggregating multiple MCP servers behind one HTTP server.
- [ysandbox/mcphub](./mcphub) - Unified hub/gateway for multiple MCP servers with dashboard and Streamable HTTP/SSE.
- [ysandbox/mcpjungle](./mcpjungle) - Self-hosted MCP gateway/registry — one endpoint for many MCP servers (with PostgreSQL).
- [ysandbox/mcpo](./mcpo) - Expose MCP tools as OpenAPI/REST (by Open WebUI).
- [ysandbox/metamcp](./metamcp) - MCP proxy/aggregator with middleware and namespaces (with PostgreSQL).
- [ysandbox/promptregistry-mcp](./promptregistry-mcp) - Simple MCP prompt registry (via supergateway).
- [ysandbox/supergateway](./supergateway) - Transport bridge — stdio MCP to SSE/WebSocket/HTTP.

## Vector databases & search

- [ysandbox/chroma](./chroma) - AI-native open-source vector/embedding database for LLM apps and semantic search.
- [ysandbox/meilisearch](./meilisearch) - Lightning-fast, typo-tolerant search engine with a REST API and built-in search preview UI.
- [ysandbox/openserp](./openserp) - Search engine results API (Google, Bing, Yandex, Baidu, DuckDuckGo).
- [ysandbox/qdrant](./qdrant) - Qdrant high-performance vector database for AI applications.
- [ysandbox/searxng](./searxng) - SearXNG self-hosted meta-search engine with JSON API.
- [ysandbox/weaviate](./weaviate) - Weaviate open-source vector database with hybrid vector + BM25 search (REST, GraphQL, gRPC).

## Web crawling & scraping

- [ysandbox/changedetection](./changedetection) - ChangeDetection.io website change monitoring and notifications.
- [ysandbox/crawl4ai](./crawl4ai) - AI-powered web crawler with structured data extraction.
- [ysandbox/firecrawl](./firecrawl) - Web scraping and crawling API with browser automation and job queues.

## Browsers & browser automation

- [ysandbox/browserless](./browserless) - Headless Chromium API for browser automation, screenshots, and PDF generation.
- [ysandbox/chromium-browser](./chromium-browser) - LinuxServer Chrome browser with MCP extensions support.
- [ysandbox/kasm-chromium](./kasm-chromium) - Kasm Workspaces Chromium browser with VNC web access.
- [ysandbox/neko-browser](./neko-browser) - Neko browser streaming with virtual display.
- [ysandbox/neko-playwright](./neko-playwright) - Neko + Playwright browser automation.
- [ysandbox/neko-stagehand](./neko-stagehand) - Neko + Stagehand browser automation.
- [ysandbox/skyvern](./skyvern) - Skyvern AI-powered browser automation platform with PostgreSQL.
- [ysandbox/webtop-browser](./webtop-browser) - LinuxServer web-accessible Linux desktop environment.

## Documents & OCR

- [ysandbox/docling](./docling) - Document conversion service (PDF/DOCX to Markdown/JSON).
- [ysandbox/docproc](./docproc) - Bundled document processing stack (Docling, PaddleOCR, Browserless, Thumbor).
- [ysandbox/gotenberg](./gotenberg) - HTML, Office, and document to PDF conversion API.
- [ysandbox/paddleocr](./paddleocr) - PaddleOCR REST API service supporting 80+ languages.
- [ysandbox/pandoc](./pandoc) - Pandoc universal document format converter (Markdown, DOCX, EPUB, HTML, LaTeX).
- [ysandbox/paperless](./paperless) - Paperless-NGX document management with OCR, bundled with Tika and Gotenberg.
- [ysandbox/stirling-pdf](./stirling-pdf) - Stirling-PDF toolkit for merging, splitting, OCR, and converting PDFs.
- [ysandbox/tika](./tika) - Apache Tika content detection and extraction (1000+ file formats).

## Media & images

- [ysandbox/imgproxy](./imgproxy) - Fast on-the-fly image processing server (resize, crop, format conversion) powered by libvips.
- [ysandbox/thumbor](./thumbor) - Thumbor on-demand image processing and resizing server.
- [ysandbox/youtube-downloader](./youtube-downloader) - YouTube media downloader (Pinchflat + MeTube).

## SEO & web performance

- [ysandbox/seonaut](./seonaut) - SEOnaut SEO auditing tool — crawls sites for ranking issues.
- [ysandbox/serpbear](./serpbear) - SerpBear search engine keyword position tracking.
- [ysandbox/unlighthouse](./unlighthouse) - Full-site Google Lighthouse scanning with web dashboard.
- [ysandbox/yellowlabtools](./yellowlabtools) - YellowLabTools web page performance and front-end quality analysis.

## Monitoring & observability

- [ysandbox/grafana-stack](./grafana-stack) - Grafana, Prometheus, MinIO, Mimir, Nginx monitoring stack.
- [ysandbox/healthchecks](./healthchecks) - Healthchecks.io cron job and uptime monitoring.
- [ysandbox/openobserve](./openobserve) - OpenObserve observability platform for logs, metrics, and traces.
- [ysandbox/uptime-kuma](./uptime-kuma) - Self-hosted uptime monitoring dashboard with status pages and notifications.

## Data & storage

- [ysandbox/metabase-multi](./metabase-multi) - Dual Metabase instances with separate PostgreSQL databases.
- [ysandbox/minio](./minio) - MinIO S3-compatible object storage with web console.
- [ysandbox/supabase](./supabase) - Self-hosted Supabase backend platform (PostgreSQL, Auth, Storage, Realtime, Edge Functions).
- [ysandbox/terraform-r2](./terraform-r2) - Terraform configuration for Cloudflare R2 storage.

## Web servers & proxies

- [ysandbox/franken](./franken) - FrankenPHP server with Caddy.
- [ysandbox/haproxy-consul](./haproxy-consul) - HAProxy with Consul service discovery.
- [ysandbox/iconify-swr](./iconify-swr) - Nginx + App (Iconify) with proxy cache and stale-while-revalidate (SWR).
- [ysandbox/nginx-php](./nginx-php) - Nginx + PHP-FPM setup.
- [ysandbox/nginx-proxy](./nginx-proxy) - Nginx + App (Bun.js) with proxy pass.
- [ysandbox/nginx-swr](./nginx-swr) - Nginx + App (Bun.js) with proxy cache and stale-while-revalidate (SWR).
- [ysandbox/squid](./squid) - Squid proxy server.
