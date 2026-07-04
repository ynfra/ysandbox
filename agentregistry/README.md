# agentregistry

One registry for MCP servers, agents, skills, and prompts. agentregistry is an
open-source (Apache 2.0) platform to publish, curate, discover, and deploy AI
building blocks — MCP servers, agents, skills, and prompts — from a single
catalog with a web UI, REST API, and the `arctl` CLI. Pairs with agentgateway
for secured MCP routing.

This stack reproduces the upstream local (`docker` platform-mode) deployment:
the Go server + a bundled PostgreSQL. The server manages deployed MCP/agent
containers on the host via the mounted Docker socket.

![agentregistry catalog](docs/dashboard.png)

## Services

| Service | Image | Description |
|---------|-------|-------------|
| **agentregistry** | `ghcr.io/agentregistry-dev/agentregistry/server:v0.3.3` | Registry server — serves the web UI, REST API (`/v0`), and MCP endpoint |
| **postgres** | `postgres:16` | PostgreSQL backing store for registry metadata |

## Ports

| Port | Service |
|------|---------|
| `12121` | Web UI + REST API (`http://localhost:12121`, API under `/v0`) |
| `31313` | MCP endpoint |
| `5432` | PostgreSQL (bound to `127.0.0.1`) |

## Usage

```bash
make docker-up
```

Open http://localhost:12121 for the web UI. The REST API is under
`http://localhost:12121/v0`.

To drive it from the CLI instead, install `arctl`:

```bash
curl -fsSL https://raw.githubusercontent.com/agentregistry-dev/agentregistry/main/scripts/get-arctl | bash
```

> Note: upstream normally starts this same stack for you via `arctl daemon start`
> (which manages its own Docker Compose project). This folder runs the identical
> server + Postgres pair directly so it is copy-pasteable and self-contained.

## Configuration

Environment variables (see `.env`, all have sandbox-safe defaults):

| Variable | Default | Description |
|----------|---------|-------------|
| `DOCKER_REGISTRY` | `ghcr.io` | Registry hosting the server image |
| `VERSION` | `v0.3.3` | Server image tag (upstream publishes no `latest`) |
| `POSTGRES_DB` | `agentregistry` | PostgreSQL database name |
| `POSTGRES_USER` | `agentregistry` | PostgreSQL user |
| `POSTGRES_PASSWORD` | `agentregistry` | PostgreSQL password (sandbox only) |
| `AGENT_REGISTRY_JWT_PRIVATE_KEY` | all-zeros | JWT signing key. Generate a real one with `openssl rand -hex 32` |

PostgreSQL data persists to `.docker/postgres/` (gitignored).

### Notes / deviations from upstream

- **Docker platform mode.** `AGENT_REGISTRY_PLATFORM_MODE=docker` and the mounted
  Docker socket let the server launch MCP/agent containers on the host. There is
  no separate agentgateway service — the server spawns the gateway on demand.
- **No Kubernetes wiring.** The upstream daemon compose also mounts `~/.kube/config`
  and rewrites it for a local kind/minikube cluster. That k8s-specific plumbing is
  omitted here to keep the stack self-contained; for the full Kubernetes path use
  the upstream Helm chart (`charts/agentregistry`).
- **Image tag is pinned.** Upstream publishes versioned tags only (no `latest`),
  so the image is pinned to `v0.3.3`. Bump `VERSION` in `.env` to upgrade.

## Links

- GitHub: https://github.com/agentregistry-dev/agentregistry
