# Open Interpreter

![open-interpreter](docs/dashboard.png)

Code-executing AI agent accessible via WebSocket and OpenAI-compatible API. Runs code in a sandboxed container.

## Services

- **open-interpreter**: Open Interpreter server (custom build)

## Ports

- `8000`: Open Interpreter API (WebSocket + HTTP)

## Setup

1. Set your LLM API key in `.env`:
   ```
   OPENAI_API_KEY=sk-...
   ```

2. Build and start:
   ```bash
   make docker-up
   ```

## Configuration

Key settings in `.env`:

- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`: LLM provider API key
- `INTERPRETER_REQUIRE_ACKNOWLEDGE`: Require confirmation before code execution (default: `True`)
- `INTERPRETER_AUTO_RUN`: Auto-run code without prompts (default: `False`)

## Running

This is a local `build:` stack, so a build is required on first run:

```bash
docker compose up -d --build
```

The image compiles the `psutil` C extension at build time, so the build takes
a minute or two. Once up, the FastAPI server listens on host port `8000`.

### Endpoints

- `GET  /` — minimal HTML chat client that talks to the WebSocket
- `WS   /` — WebSocket stream for chat messages, code approval, and auth
- `GET  /heartbeat` — liveness probe, returns `{"status":"alive"}`
- `GET  /docs` — Swagger UI (shown in the screenshot above)
- `GET  /openapi.json` — OpenAPI schema
- `POST /openai/chat/completions` — OpenAI-compatible chat completion
- `POST /settings`, `GET /settings/{setting}` — read/update interpreter settings

Quick check:

```bash
curl http://localhost:8000/heartbeat   # {"status":"alive"}
open http://localhost:8000/docs        # interactive API docs
```

The screenshot above is the `/docs` Swagger UI, listing the heartbeat, home,
settings, and OpenAI-compatible chat-completion routes plus their schemas.

## Notes

- **LLM API key required for real work.** The server boots and serves all HTTP
  routes without a key, but any actual chat/code-execution call needs
  `OPENAI_API_KEY` (or `ANTHROPIC_API_KEY`) set in `.env`. Missing key is an
  environment-config issue, not a build failure.
- **Server bind host.** Open Interpreter's server reads `INTERPRETER_HOST`
  (default `127.0.0.1`). The Dockerfile sets `INTERPRETER_HOST=0.0.0.0` so the
  published port is reachable from the host — plain `HOST` is ignored.
- **Build tools.** `python:3.11-slim` ships no compiler; the Dockerfile
  installs `gcc`/`python3-dev` to build `psutil` (no prebuilt aarch64 wheel for
  the pinned version) and purges them afterward.
- **Port clash.** If host port `8000` is taken by another stack, add a
  gitignored `docker-compose.override.yml` remapping it (`ports: !override`).
