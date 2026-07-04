# AnythingLLM

![anythingllm](docs/dashboard.png)

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

## Running

```bash
docker compose up -d
```

- **UI:** http://localhost:3001

First run launches the **onboarding wizard**: pick an LLM provider (and enter
its API key), accept the embedding / vector-DB defaults (native embeddings +
LanceDB), create a workspace, then land in the workspace chat. Upload documents
to a workspace to chat over them (RAG).

## Notes

- The LLM provider is left unset in `.env` — either uncomment `LLM_PROVIDER`
  plus its API key there, or configure it entirely from the onboarding wizard /
  Settings.
- Workspaces, vectors, and uploads persist under `.docker/storage/`.

## Configuration

Key settings in `.env`:

- `LLM_PROVIDER` + API key: Choose your LLM backend (openai, anthropic, etc.)
- `EMBEDDING_ENGINE`: Embedding provider (default: `native`)
- `VECTOR_DB`: Vector store (default: `lancedb`)
- Documents and data are persisted in `.docker/storage/`
