# LiteLLM Proxy

![litellm-proxy](docs/dashboard.png)

A unified API proxy for multiple LLM providers with PostgreSQL persistence and Prometheus monitoring. Configured to proxy Ollama's llama3.3:70b model.

## Services

- **litellm**: LiteLLM proxy server with database persistence
- **db**: PostgreSQL database for storing models and usage data
- **prometheus**: Prometheus metrics collection for monitoring

## Ports

- `4000`: LiteLLM proxy API endpoint
- `5432`: PostgreSQL database
- `9090`: Prometheus metrics dashboard

## Usage

```bash
make up
```

## Running

```bash
docker compose up -d
```

- **Proxy API:** http://localhost:4000 (authenticate with the master key `sk-1234`)
- **Admin UI:** http://localhost:4000/ui
- **Prometheus:** http://localhost:9090

Log into the admin UI as user **`admin`** with password **`sk-1234`** (the
`LITELLM_MASTER_KEY`; no `UI_PASSWORD` is set). From there manage Virtual Keys,
Models, and Usage.

## Notes

- `STORE_MODEL_IN_DB=True` — models added in the UI persist to Postgres
  (`.docker/postgres/`).
- Proxied models come from `litellm/config.yml`; the sample config serves
  Ollama's `llama3.3:70b`.

## Configuration

Key environment variables:
- `LITELLM_MASTER_KEY=sk-1234`: Master API key for accessing the proxy
- `LITELLM_SALT_KEY=sk-1234`: Salt key for encryption
- `DATABASE_URL`: PostgreSQL connection string
- `STORE_MODEL_IN_DB=True`: Enable database storage of model configurations

The proxy is configured to serve the `llama3.3:70b` model from Ollama at `http://0.0.0.0:11434`. Access the API at `http://localhost:4000` using the master key for authentication.