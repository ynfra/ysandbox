# Traceloop Hub

![traceloop](docs/dashboard.png)

`traceloop/hub` — an open-source **LLM gateway / proxy** with built-in
OpenTelemetry observability. It exposes OpenAI-compatible routes, fans requests
out to multiple model providers (OpenAI, Anthropic, Azure, Bedrock, Vertex,
Ollama, …) via configurable pipelines, and emits traces + Prometheus metrics for
every call. It is API-first: there is **no rich web dashboard** — the browsable
surfaces are `/health` and `/metrics`.

The screenshot above is the live `/metrics` endpoint (`http://localhost:3030/metrics`),
serving Prometheus counters/histograms such as `traceloop_hub_http_requests_total`
and `traceloop_hub_http_requests_duration_seconds`.

## Services

- **hub**: `traceloop/hub` LLM gateway. Stateless — configured entirely from a
  mounted `config.yaml` (YAML mode). No database is required.

## Ports

- `3030` → container `3000`: HTTP API (`/health`, `/metrics`, OpenAI-compatible routes)

## Running

```bash
docker compose up -d
```

Verify it is up:

```bash
curl http://localhost:3030/health     # -> "Working!"  (HTTP 200)
curl http://localhost:3030/metrics    # -> Prometheus metrics
```

Bring it down:

```bash
docker compose down
```

## Sending an OpenAI-compatible request

The hub speaks the OpenAI Chat Completions API. Point any OpenAI client at
`http://localhost:3030/api/v1` (base URL) and use a model `key` declared in
`config.yaml` (e.g. `gpt-4o`, `claude-3-5-sonnet`, `llama3`):

```bash
curl http://localhost:3030/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "hello"}]
  }'
```

The gateway routes the call to the matching provider, injects that provider's
API key, and records a trace + metrics for the request.

## Configuration

`config.yaml` defines `providers`, `models`, and `pipelines`. Provider API keys
are interpolated from environment variables at startup:

- `OPENAI_API_KEY` — forwarded to the `openai` provider
- `ANTHROPIC_API_KEY` — forwarded to the `anthropic` provider

Set these in `.env` (both default to empty). The hub **boots and serves
`/health` + `/metrics` with empty keys** — real keys are only needed to proxy
live traffic to that provider. The `ollama` provider points at
`http://host.docker.internal:11434/v1` for a local Ollama instance.

To emit traces to Traceloop's hosted backend (or any OTLP endpoint), add a
`tracing` plugin to the `default` pipeline in `config.yaml` with your
`endpoint` + `api_key`.

## Notes

- **API-first, no dashboard.** The only browsable pages are `/health` (returns
  `Working!`) and `/metrics` (Prometheus text). The screenshot captures
  `/metrics`.
- **Stateless YAML mode.** `traceloop/hub` reads `/app/config.yaml` at startup;
  there is no built-in database. The compose file mounts `./config.yaml` and
  passes provider keys through as env vars — no Postgres, no `HUB_MODE`.
- **Healthcheck uses `wget`.** The image is busybox-based and ships `wget`/`nc`
  but **not** `curl`, so the compose healthcheck probes `/health` with
  `wget -qO-`.
- **Boot gotcha.** Any `${VAR}` referenced in `config.yaml` must exist in the
  environment (even if empty) or the hub aborts with
  `Environment variable '<VAR>' not found`. The compose file sets
  `OPENAI_API_KEY`/`ANTHROPIC_API_KEY` with empty defaults to guarantee a clean
  boot.
- **Port clash.** Default host port is `3030`. If it is taken, add a gitignored
  `docker-compose.override.yml` with `ports: !override` remapping to a free port.
