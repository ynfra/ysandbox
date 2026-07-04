# Healthchecks

![healthchecks](docs/dashboard.png)

Cron job and uptime monitoring service. Create checks, receive pings from your jobs, and get alerted when something stops reporting.

## Services

- **healthchecks**: Healthchecks.io web application
- **db**: PostgreSQL 16 database

## Ports

- `8000`: Healthchecks web UI

## Usage

```bash
make docker-up
```

## Access

- Web UI: http://localhost:8000
- Default login: `admin@localhost` / `admin`

## Examples

Ping a check (signal success):

```bash
curl http://localhost:8000/ping/<uuid>
```

Signal failure:

```bash
curl http://localhost:8000/ping/<uuid>/fail
```

## Configuration

Key environment variables in `docker-compose.yml`:

- `SUPERUSER_EMAIL` / `SUPERUSER_PASSWORD`: Admin credentials
- `SITE_ROOT`: Public URL for notification links
- `SECRET_KEY`: Django secret key

Database is persisted in `.docker/db/`
