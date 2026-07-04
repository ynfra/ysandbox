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

## Configuration

Key settings in `.env`:

- `OPENAI_API_BASE_URL` / `OPENAI_API_KEY`: LLM provider endpoint and key
- `WEBUI_AUTH`: Enable/disable authentication (default: `true`)
- `ENABLE_OLLAMA_API`: Connect to local Ollama (default: `false`)
- Data is persisted in `.docker/data/`
