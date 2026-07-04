# ChangeDetection.io

![changedetection](docs/dashboard.png)

Website change monitoring and notification service. Track changes on any website and get alerted when content changes.

## Services

- **changedetection**: ChangeDetection.io web application

## Ports

- `5000`: ChangeDetection web UI

## Usage

```bash
make docker-up
```

Access the web UI at http://localhost:5000

## Configuration

Optional environment variables in `docker-compose.yml`:

- `PLAYWRIGHT_DRIVER_URL`: WebSocket URL to a Browserless instance for JavaScript-rendered pages (e.g., `ws://host.docker.internal:3000`). Run the `browserless` sandbox alongside this one for JS support.
- `PASSWORD`: Protect the web UI with a password
- `BASE_URL`: Public URL used in notification links

Watch data is persisted in `.docker/datastore/`
