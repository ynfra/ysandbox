# AnythingLLM

Document-aware AI chat with RAG (Retrieval-Augmented Generation). Upload documents, create workspaces, and chat with your data using any LLM provider.

## Services

- **anythingllm**: AnythingLLM application with built-in vector database

## Ports

- `3001`: AnythingLLM web UI

## Usage

```bash
make docker-up
```

## Setup

1. Configure your LLM provider in `.env`:
   ```
   LLM_PROVIDER=openai
   OPENAI_API_KEY=sk-...
   ```

2. Start the service and access http://localhost:3001

3. Complete the setup wizard on first launch

## Configuration

Key settings in `.env`:

- `LLM_PROVIDER` + API key: Choose your LLM backend (openai, anthropic, etc.)
- `EMBEDDING_ENGINE`: Embedding provider (default: `native`)
- `VECTOR_DB`: Vector store (default: `lancedb`)
- Documents and data are persisted in `.docker/storage/`
