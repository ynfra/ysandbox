# Traceloop Hub

`traceloop/hub` is an open-source LLM gateway/proxy with built-in OpenTelemetry
observability. It exposes OpenAI-compatible routes, fans requests out to
multiple providers (OpenAI, Anthropic, Ollama, …) via configurable pipelines,
and emits traces + Prometheus metrics for every call. API-first — the only
browsable surfaces are `/health` and `/metrics`.

![traceloop](docs/dashboard.png)

## Usage

```bash
make docker-up
```

Verify it is up:

```bash
curl http://localhost:3030/health     # -> "Working!" (HTTP 200)
curl http://localhost:3030/metrics    # -> Prometheus metrics
```

> **Stateless YAML mode.** The hub reads `/app/config.yaml` (bind-mounted
> read-only) at startup — no database. Any `${VAR}` referenced in `config.yaml`
> must exist in the environment (even if empty) or the hub aborts with
> `Environment variable '<VAR>' not found`; the compose sets
> `OPENAI_API_KEY`/`ANTHROPIC_API_KEY` with empty defaults to guarantee a clean
> boot. The healthcheck uses `wget` (the busybox image ships `wget`/`nc` but not
> `curl`). Default host port `3030` maps to container `3000`.

<details><summary>API examples</summary>

The hub speaks the OpenAI Chat Completions API. Point any OpenAI client at
`http://localhost:3030/api/v1` and use a model `key` declared in `config.yaml`
(`gpt-4o`, `claude-3-5-sonnet`, `llama3`):

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

</details>

## Services

| Container | Port(s) | Description |
|-----------|---------|-------------|
| **hub** | `3030` → `3000` | `traceloop/hub` LLM gateway; stateless, configured from mounted `config.yaml` |

## Configuration

Provider keys interpolated into `config.yaml` at startup; set in `.env`
(both default to empty):

| Variable | Default | Notes |
|----------|---------|-------|
| `OPENAI_API_KEY` | *(empty)* | Forwarded to the `openai` provider — **change** to proxy live OpenAI traffic |
| `ANTHROPIC_API_KEY` | *(empty)* | Forwarded to the `anthropic` provider — **change** to proxy live Anthropic traffic |

The `ollama` provider points at `http://host.docker.internal:11434/v1` for a
local Ollama instance. `config.yaml` defines the `providers`, `models`, and
`pipelines`; the hub boots and serves `/health` + `/metrics` even with empty
keys.

## Volumes

None — stateless (only the read-only `config.yaml` is bind-mounted).

## Observability

| Check | Endpoint / Command |
|-------|--------------------|
| Health | `curl http://localhost:3030/health` |
| Metrics | `http://localhost:3030/metrics` |
| Logs | `docker compose logs -f hub` |

## Resources

- GitHub: https://github.com/traceloop/hub
- Docs: https://www.traceloop.com/docs/hub
