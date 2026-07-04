# Stirling-PDF

![stirling-pdf](docs/dashboard.png)

Self-hosted PDF manipulation toolkit. Merge, split, convert, OCR, compress, and watermark PDF files through a web UI.

## Running

```bash
docker compose up -d
```

- Open [`http://localhost:8080`](http://localhost:8080) — the PDF toolkit UI
  opens directly with no login prompt.
- **No authentication:** `docker-compose.yml` sets
  `DOCKER_ENABLE_SECURITY: "false"`, so the login/user system is disabled. To
  enable the built-in login (default `admin` / `stirling`, which forces a
  password change on first sign-in), set `DOCKER_ENABLE_SECURITY: "true"`.
- Config and logs persist in `.docker/configs/` and `.docker/logs/`.

## Services

- **stirling-pdf**: Stirling-PDF web application

## Ports

- `8080`: Stirling-PDF web UI

## Usage

```bash
make docker-up
```

Access the web UI at http://localhost:8080

## Configuration

- `DOCKER_ENABLE_SECURITY`: Set to `true` to enable authentication (default: `false`)
- Config is persisted in `.docker/configs/`
- Logs are persisted in `.docker/logs/`
