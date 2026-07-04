# OpenObserve

![openobserve](docs/dashboard.png)

Open-source observability platform for logs, metrics, and traces. Provides a Grafana-compatible UI and supports OTLP, FluentBit, Vector, and other ingestion formats.

## Running

```bash
docker compose up -d
```

- Open [`http://localhost:5080`](http://localhost:5080) and log in as the root
  user. Credentials come from `ZO_ROOT_USER_EMAIL` / `ZO_ROOT_USER_PASSWORD`,
  which Compose reads from the `.env` file in this directory:
  - Email: `admin@example.com`
  - Password: `Complexpass#123`

  (If `.env` is absent, the `docker-compose.yml` defaults `admin@example.com` /
  `admin123` apply instead.)
- Once logged in, explore **Logs**, **Metrics**, and **Traces**, and grab
  ingestion snippets from the UI. Data persists in `.docker/openobserve/`.

## Services

- **openobserve**: OpenObserve server with web UI and ingestion endpoints

## Ports

- `5080`: Web UI and REST API (HTTP)
- `5081`: gRPC ingestion endpoint (OTLP)

## Usage

```bash
make docker-up
```

Access the UI at http://localhost:5080

Login with the credentials from `.env`:
- Email: `admin@example.com`
- Password: `Complexpass#123`

## Sending Data

### OTLP (traces / metrics / logs)

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:5080/api/default/
OTEL_EXPORTER_OTLP_HEADERS="Authorization=Basic $(echo -n 'admin@example.com:Complexpass#123' | base64)"
```

### Logs via API

```bash
curl -u admin@example.com:Complexpass#123 \
  -X POST http://localhost:5080/api/default/my-stream/_json \
  -H "Content-Type: application/json" \
  -d '[{"level":"info","message":"hello openobserve"}]'
```

## Configuration

Key settings in `.env`:

- `ZO_ROOT_USER_EMAIL` / `ZO_ROOT_USER_PASSWORD`: Admin credentials
- `ZO_DATA_DIR`: Path for persisted data (default: `/data`)
- `ZO_TELEMETRY`: Opt out of usage telemetry (set to `false`)
- Data is persisted in `.docker/data/`
