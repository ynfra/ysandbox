# LiteLLM Proxy

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

## Configuration

Key environment variables:
- `LITELLM_MASTER_KEY=sk-1234`: Master API key for accessing the proxy
- `LITELLM_SALT_KEY=sk-1234`: Salt key for encryption
- `DATABASE_URL`: PostgreSQL connection string
- `STORE_MODEL_IN_DB=True`: Enable database storage of model configurations

The proxy is configured to serve the `llama3.3:70b` model from Ollama at `http://0.0.0.0:11434`. Access the API at `http://localhost:4000` using the master key for authentication.