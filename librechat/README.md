# LibreChat

![librechat](docs/dashboard.png)

Multi-model AI chat platform with conversation history, search, and plugin support. Supports OpenAI, Anthropic, Google, Azure, and custom endpoints.

## Services

- **api**: LibreChat web application
- **mongodb**: MongoDB 8.0 for conversation storage
- **meilisearch**: Meilisearch for full-text conversation search

## Ports

- `3080`: LibreChat web UI

## Usage

```bash
make docker-up
```

## Setup

1. Configure your LLM provider in `.env`:
   ```
   OPENAI_API_KEY=sk-...
   ```

2. Optionally configure model endpoints in `librechat.yaml`

3. Start the service and access http://localhost:3080

4. Create your account on first visit

## Configuration

Key settings in `.env`:

- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GOOGLE_KEY`: LLM provider keys
- `ALLOW_REGISTRATION`: Allow new user signups (default: `true`)

Model endpoints can be customized in `librechat.yaml`.

Data is persisted in `.docker/` subdirectories (mongodb, meilisearch, images, logs).
