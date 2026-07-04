# SerpBear

![serpbear](docs/dashboard.png)

Open-source search engine position tracking app. Monitors Google keyword rankings and sends notifications on position changes.

## Running

```bash
docker compose up -d
```

- Open [`http://localhost:3000`](http://localhost:3000) and log in with the
  credentials from `docker-compose.yml`:
  - Username: `admin` (`USER_NAME`)
  - Password: `admin` (`PASSWORD`)
- After logging in, add a domain and its keywords to start tracking search
  positions on the dashboard.
- Application data (SQLite) persists in `.docker/data/`.

## Services

- **serpbear**: SerpBear web application (Next.js + SQLite)

## Ports

- `3000`: SerpBear web UI

## Usage

```bash
make docker-up
```

## Configuration

- `USER_NAME`: Login username (default: `admin`)
- `PASSWORD`: Login password (default: `admin`)
- `SECRET`: Session secret key
- `APIKEY`: API key for external access
- `SESSION_DURATION`: Session duration in hours (default: `24`)

Application data (SQLite) is persisted in `.docker/data/`.
