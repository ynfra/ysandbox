# LobeChat

![lobechat](docs/dashboard.png)

Client-side AI chat UI supporting multiple LLM providers (OpenAI, Anthropic, Google, Mistral, and more).

## Services

- **lobechat**: LobeChat web application

## Ports

- `3210`: LobeChat web UI

## Usage

```bash
make docker-up
```

## Configuration

Set API keys in `docker-compose.yml` environment section:

- `OPENAI_API_KEY`: OpenAI API key
- `ANTHROPIC_API_KEY`: Anthropic API key
- `GOOGLE_API_KEY`: Google AI API key
- `ACCESS_CODE`: Optional password to protect the instance

Access the UI at http://localhost:3210
