# n8n

![n8n](docs/dashboard.png)

n8n is a powerful workflow automation tool that enables you to connect various applications and services together to create complex automation workflows.

## Services

- **n8n**: Main n8n application server with web UI
- **n8n-worker**: Background worker for processing queue-based executions
- **postgres**: PostgreSQL 16 database for storing n8n data
- **redis**: Redis cache and queue management for distributed execution
- **qdrant**: Vector database for AI and embedding operations
- **adminer**: Database management interface

## Ports

- `5678`: n8n web interface and API
- `5433`: PostgreSQL database
- `6380`: Redis
- `6333`: Qdrant REST API
- `6334`: Qdrant gRPC API
- `8000`: Adminer database UI

## Usage

1. Start the services:
   ```bash
   docker compose up -d
   ```

2. Access n8n at http://localhost:5678

3. Create your account on first access and start building workflows

## Running

```bash
docker compose up -d
```

- **n8n editor:** http://localhost:5678
- **Adminer (DB UI):** http://localhost:8000
- **Qdrant REST:** http://localhost:6333

First run is the **owner-account setup** — enter email, name, and a password
(min 8 characters, must include a number) to create the owner, then you land on
the Workflows overview and can start building.

## Notes

- Queue mode: the `n8n` editor and a separate `n8n-worker` share Postgres +
  Redis; manual/heavy executions are offloaded to the worker.
- Basic auth is disabled (`N8N_BASIC_AUTH_ACTIVE=false`) — the owner account is
  the only gate.
- Host ports are remapped to avoid clashes: Postgres on `5433`, Redis on `6380`
  (services still use the standard ports inside the compose network).

## Architecture

The setup uses:
- Queue-based execution mode for scalability
- PostgreSQL for persistent data storage
- Redis for queue management and caching
- Qdrant for vector operations (AI workflows)
- Separate worker container for processing executions

## Data Persistence

All data is persisted in the `.docker` directory:
- `.docker/n8n`: n8n configuration and files
- `.docker/postgres`: PostgreSQL database
- `.docker/redis`: Redis data
- `.docker/qdrant`: Vector database storage
