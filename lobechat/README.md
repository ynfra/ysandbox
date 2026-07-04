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

## Running

```bash
docker compose up -d
```

- **Chat UI:** http://localhost:3210

The UI opens straight into a new chat — no login or onboarding step. LLM
provider keys are configured **client-side** in the app (Settings → language
model / provider), so nothing needs to be set in the compose just to start
chatting.

## Notes

- No auth gate by default: `ACCESS_CODE` is commented out in
  `docker-compose.yml`. Set it there (alongside provider keys) to
  password-protect the instance and preconfigure server-side keys.

## Configuration

Set API keys in `docker-compose.yml` environment section:

- `OPENAI_API_KEY`: OpenAI API key
- `ANTHROPIC_API_KEY`: Anthropic API key
- `GOOGLE_API_KEY`: Google AI API key
- `ACCESS_CODE`: Optional password to protect the instance

Access the UI at http://localhost:3210
