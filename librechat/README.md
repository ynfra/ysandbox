# LibreChat

![librechat](docs/dashboard.png)

Multi-model AI chat platform with conversation history, search, and plugin support. Supports OpenAI, Anthropic, Google, Azure, and custom endpoints.

## Services

- **api**: LibreChat web application
- **mongodb**: MongoDB (pinned `8.0.4`) for conversation storage
- **meilisearch**: Meilisearch for full-text conversation search

## Ports

- `3080`: LibreChat web UI

## Running

```bash
docker compose up -d      # or: make docker-up
```

Open **http://localhost:3080**. On first run, registration is enabled — click
**Sign up** and create the first account (e.g. an `admin` user); this becomes
your login for subsequent visits.

Companion services (started automatically, not published to the host):

- **mongodb** — conversation / user storage (port `27017`, internal only)
- **meilisearch** — full-text conversation search (port `7700`, internal only)

The `api` container waits for both to report healthy before starting.

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

## Notes

### MongoDB AVX / SERVER-121912 gotcha

The `mongo:8.0` tag is **pinned to `mongo:8.0.4`** in `docker-compose.yml`.
Newer MongoDB 8.0.x patches trip [SERVER-121912](https://jira.mongodb.org/browse/SERVER-121912):
they require the AVX CPU instruction set and additionally refuse to boot on
Linux kernels `>= 6.19`, crash-looping as `unhealthy` (either `Illegal
instruction` or a fatal `Linux kernel versions 6.19 and newer has a known
incompatibility with this version of MongoDB` message). This was reproduced on
OrbStack kernel `7.0.11` with the unpinned `mongo:8.0` — MongoDB crash-looped
and the stack never came up. Pinning to `mongo:8.0.4` (which predates the kernel
check) boots healthy and LibreChat serves on `http://localhost:3080`.
