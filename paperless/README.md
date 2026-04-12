# Paperless-NGX

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
```

## Access

- Web UI: http://localhost:8000
- Default login: `admin` / `admin`

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
