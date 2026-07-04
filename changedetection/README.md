# ChangeDetection.io

![changedetection](docs/dashboard.png)

Website change monitoring and notification service. Track changes on any website and get alerted when content changes.

## Running

```bash
docker compose up -d
```

- Open [`http://localhost:5000`](http://localhost:5000) — add a URL to watch,
  set a check interval, and ChangeDetection will diff the page over time.
- No authentication by default (set the `PASSWORD` env var to protect the UI).
- Watch data persists in `.docker/datastore/`.

## Notes

- **macOS port 5000 clash.** On macOS, host port `5000` is commonly occupied
  by AirPlay Receiver / Control Center. If the UI won't bind, remap the host
  port with a **gitignored** throwaway `docker-compose.override.yml` (Compose
  auto-loads it) — do **not** commit it:

  ```yaml
  services:
    changedetection:
      ports: !override
        - "5050:5000"
  ```

  Then browse [`http://localhost:5050`](http://localhost:5050). (Alternatively,
  disable AirPlay Receiver under System Settings → General → AirDrop & Handoff.)

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
