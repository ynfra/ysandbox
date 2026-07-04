# Open WebUI

![openwebui](docs/dashboard.png)

OpenAI-compatible chat UI supporting multiple LLM providers. Features conversation history, model management, RAG, and web search.

## Services

- **open-webui**: Open WebUI web application with built-in SQLite database

## Ports

- `8080`: Open WebUI web interface

## Usage

```bash
make docker-up
```

## Setup

1. Configure your LLM provider in `.env`:
   ```
   OPENAI_API_BASE_URL=https://api.openai.com/v1
   OPENAI_API_KEY=sk-...
   ```

2. Start the service and access http://localhost:8080

3. Create your admin account on first login

## Running

```bash
docker compose up -d
```

- **Chat UI:** http://localhost:8080

`WEBUI_AUTH=true`, so the **first account you create becomes the admin**. After
signing up you land in the chat UI (model selector + message composer) — dismiss
the "What's New" / release-notes modal shown on first login. Add provider keys
via `.env` (`OPENAI_API_BASE_URL` / `OPENAI_API_KEY`) or in Settings →
Connections.

## Notes

- Ollama is disabled (`ENABLE_OLLAMA_API=false`); this instance uses external
  OpenAI-compatible providers only.
- Account data and settings persist under `.docker/data/`.

## Configuration

Key settings in `.env`:

- `OPENAI_API_BASE_URL` / `OPENAI_API_KEY`: LLM provider endpoint and key
- `WEBUI_AUTH`: Enable/disable authentication (default: `true`)
- `ENABLE_OLLAMA_API`: Connect to local Ollama (default: `false`)
- Data is persisted in `.docker/data/`
