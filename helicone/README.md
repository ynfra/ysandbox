# Helicone

![helicone](docs/dashboard.png)

Open-source LLM proxy + analytics platform. Route OpenAI and Anthropic calls through Helicone to get request logging, cost tracking, user analytics, rate limiting, and caching.

> Uses the `helicone/helicone-all-in-one` image which bundles PostgreSQL, ClickHouse, MinIO, and Redis into a single container.

## Services

| Service | Description |
|---------|-------------|
| **helicone** | All-in-one: web UI + Jawn proxy + PostgreSQL + ClickHouse + MinIO + Redis |

## Ports

| Port | Service |
|------|---------|
| `3000` | Web dashboard |
| `8585` | Jawn LLM proxy (use this as your OpenAI base URL) |
| `9081` | MinIO S3 API |

## Usage

```bash
make docker-up
```

Open http://localhost:3000

**Default login:** `test@helicone.ai` / `password`

> **Security:** Set a real `BETTER_AUTH_SECRET` in `.env` before exposing to the network:
> ```bash
> openssl rand -hex 32
> ```

## Using the Proxy

Replace your OpenAI base URL with the Helicone proxy endpoint:

**Python (OpenAI):**
```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8585/v1/gateway/oai/v1",
    api_key="your-openai-api-key"
)
```

**Python (Anthropic):**
```python
import anthropic

client = anthropic.Anthropic(
    base_url="http://localhost:8585/v1/gateway/anthropic",
    api_key="your-anthropic-api-key"
)
```

## Limitations (Self-Hosted)

- Supports **OpenAI and Anthropic only** (no other providers in self-hosted mode)
- Advanced experiments and fine-tuning features require cloud version

## Configuration

Key environment variables in `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `BETTER_AUTH_SECRET` | `changeme-...` | Session signing secret — **change in production** |
| `SITE_URL` | `http://localhost:3000` | Public URL of your instance |
| `NEXT_PUBLIC_IS_ON_PREM` | `true` | Enables on-premise mode |
