# Windmill

![windmill](docs/dashboard.png)

https://www.windmill.dev

## Presentation

https://slides.com/f3l1x/2024-03-23-windmill-macgyver-toolkit

## Prerequisites

- Docker

## Usage

1. Run `docker compose up`.
2. Open `http://localhost:8080`.
3. Login via `admin@windmill.dev` / `changeme`.
4. Play around!

## Running

```bash
docker compose up -d
```

- **UI:** the Windmill server is published directly on http://localhost:8000
  (the Caddy reverse proxy is also exposed on http://localhost:8080).
- **Default superadmin:** `admin@windmill.dev` / `changeme` (the login form
  pre-fills the email). Change the password from the user menu once inside.
- **First-run setup:** on first login you land on the instance "First Time
  Setup" screen — click **Skip** (or Quick setup), then **Create a new
  workspace** (used here: id `sandbox`, name `Sandbox`) before you reach the
  Home dashboard. Dismiss the tutorial banner if it appears.
- **`$WM_IMAGE`:** the app image is parameterised via `WM_IMAGE` (default
  `ghcr.io/windmill-labs/windmill:main`, set in `.env`); the same image runs
  both the `windmill_server` (`MODE=server`) and `windmill_worker`
  (`MODE=worker`) services.

## Notes

- Services: PostgreSQL (`db`), `windmill_server`, `windmill_worker`, `lsp`
  (language server) and a `caddy` reverse proxy. `DATABASE_URL` is provided by
  `.env`.
- Postgres migrations run on first boot, so the server can take a short while
  before http://localhost:8000 returns 200 on a cold start.
- The worker mounts the host Docker socket (`/var/run/docker.sock`) so it can
  run containerised jobs — host-root-equivalent, keep it local-only.
- Bring the stack down with `docker compose down` (state persists under
  `.docker/`).
