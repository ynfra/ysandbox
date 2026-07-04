# Skyvern

![skyvern](docs/dashboard.png)

Skyvern is an AI-powered browser automation platform that allows you to automate complex workflows on any website using natural language instructions.

## Services

- **postgres**: PostgreSQL 14 database for storing Skyvern data
- **skyvern**: Main Skyvern application with browser automation capabilities
- **skyvern-ui**: Web interface for managing and monitoring Skyvern workflows

## Ports

- `5432`: PostgreSQL database
- `8000`: Skyvern API server
- `8080`: Skyvern web UI
- `9090`: Artifact server

## Setup

1. Set your Gemini API key in the docker-compose.yml:
   ```yaml
   GEMINI_API_KEY=YOUR_GEMINI_KEY
   ```

2. Set your Skyvern API key in the UI environment:
   ```yaml
   VITE_SKYVERN_API_KEY=YOUR_API_KEY
   ```

3. Start the services:
   ```bash
   docker compose up -d
   ```

## Access

- Skyvern UI: http://localhost:8080
- Skyvern API: http://localhost:8000
- PostgreSQL: localhost:5432

## Running

```bash
docker compose up -d
```

Ports:

- `8080`: Skyvern web UI (the target dashboard, `/discover`)
- `8000`: Skyvern API server (`GET /api/v1/heartbeat` → `Server is running.`)
- `9222`: Chrome DevTools Protocol (CDP) for browser forwarding
- `9090`: Artifact server
- `5432`: PostgreSQL

## Notes

- Boots cleanly with plain `docker compose up -d` — no config changes needed.
  On first boot Postgres initialises and the `skyvern` container runs DB
  migrations; the `skyvern` healthcheck waits for `/app/.streamlit/secrets.toml`
  (mounted from `.streamlit/`, which ships a pre-seeded org + backend API key),
  so the whole stack is usually healthy within ~30s.
- The UI is served immediately (HTTP 200 on :8080); allow a few extra seconds
  for the API heartbeat to turn 200 while the app finishes starting.
- The `.streamlit/secrets.toml` in this stack already contains a seeded
  organization (`Skyvern`) and JWT credential, so no manual org bootstrap is
  needed.
- First load may show a **"Frontend API key missing"** notice — the compose
  ships a placeholder `VITE_SKYVERN_API_KEY=YOUR_API_KEY`. Click **Regenerate
  API key** in the UI and it persists a working key automatically. Set a real
  `GEMINI_API_KEY` (and `VITE_SKYVERN_API_KEY`) in `docker-compose.yml` before
  running actual automation tasks with an LLM.
