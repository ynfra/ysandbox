# Open Interpreter

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
