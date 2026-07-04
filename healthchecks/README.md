# Healthchecks

![healthchecks](docs/dashboard.png)

Cron job and uptime monitoring service. Create checks, receive pings from your jobs, and get alerted when something stops reporting.

## Running

```bash
docker compose up -d
```

- Open [`http://localhost:8000`](http://localhost:8000) and sign in at
  [`/accounts/login/`](http://localhost:8000/accounts/login/).
- A superuser is **created automatically on first startup** from the
  `SUPERUSER_EMAIL` / `SUPERUSER_PASSWORD` env vars in `docker-compose.yml`:
  - Email: `admin@localhost`
  - Password: `admin`
- After login, create a check to get a ping URL, then `curl` it from your job
  (`/ping/<uuid>`, or `/ping/<uuid>/fail` to signal failure).
- Backed by PostgreSQL 16; database persists in `.docker/db/`. If you need to
  create an admin manually instead, run
  `docker compose exec healthchecks python manage.py createsuperuser`.

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
