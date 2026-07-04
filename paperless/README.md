# Paperless-NGX

![paperless](docs/dashboard.png)

Document management system with automatic OCR, tagging, and full-text search. Bundled with Tika and Gotenberg for complete document processing.

## Services

- **paperless**: Paperless-NGX web application
- **db**: PostgreSQL 16 database
- **broker**: Valkey (Redis-compatible) task broker
- **tika**: Apache Tika for content extraction
- **gotenberg**: Gotenberg for PDF conversion

## Ports

- `8000`: Paperless web UI

## Usage

```bash
make docker-up
# or
docker compose up -d
```

## Access

- Web UI: http://localhost:8000
- Default login: `admin` / `admin`

## Running

```bash
docker compose up -d
```

- UI: http://localhost:8000 — admin credentials `admin` / `admin`
  (`PAPERLESS_ADMIN_USER` / `PAPERLESS_ADMIN_PASSWORD` in `docker-compose.yml`).
- Companion services boot alongside the app: **db** (PostgreSQL 16),
  **broker** (Valkey, Redis-compatible), **tika** (Apache Tika content
  extraction) and **gotenberg** (PDF conversion). Paperless is wired to Tika +
  Gotenberg via `PAPERLESS_TIKA_ENABLED=1`.

## Notes

- First boot is slow (~1–2 min): the app runs database migrations and creates
  the superuser before the web UI answers. `curl http://localhost:8000` returns
  a `302` redirect to `/accounts/login/` once ready.
- `paperless` waits on `db` and `broker` healthchecks (`depends_on:
  condition: service_healthy`), so the app container starts only after those
  are green.
- No config changes were needed — the stack boots as-is with a plain
  `docker compose up -d`.
- Stop with `docker compose down` (keeps data in `.docker/`); add `-v` only to
  wipe volumes.

## Features

- Automatic OCR on uploaded documents
- Full-text search across all documents
- Automatic tagging and categorization
- Drop files into `.docker/consume/` for auto-import
- Export documents via `.docker/export/`

## Configuration

Key environment variables in `docker-compose.yml`:

- `PAPERLESS_ADMIN_USER` / `PAPERLESS_ADMIN_PASSWORD`: Admin credentials
- `PAPERLESS_OCR_LANGUAGE`: OCR language (default: `eng`)
- `PAPERLESS_TIME_ZONE`: Timezone (default: `UTC`)
- `PAPERLESS_URL`: Public URL for the instance

Data is persisted in `.docker/` subdirectories (db, media, export, consume).
