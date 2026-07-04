# Kasm Chromium

![kasm-chromium](docs/dashboard.png)

A containerized Chromium browser using Kasm Workspaces technology, providing a secure and isolated web browsing environment accessible via web interface.

## Services

- **chromium**: Kasm Chromium browser with VNC-based web access

## Ports

- `6901`: Web interface for accessing the Chromium browser via VNC

## Usage

```bash
make up
```

## Configuration

Key environment variables:
- `VNC_PW=password`: Password for accessing the VNC web interface
- `shm_size=512m`: Shared memory size for browser performance

Access the browser by navigating to `http://localhost:6901` and using the password `password`.

## Running

```bash
docker compose up -d
```

Then open **https://localhost:6901** (HTTPS with a self-signed cert — accept the
browser warning). The endpoint is protected by HTTP basic auth:

- Username: `kasm_user`
- Password: `password` (the `VNC_PW` value from `docker-compose.yml`)

First boot pulls a ~1 GB image, so the initial `docker compose up` can take a
few minutes. Bring it down with `docker compose down`.

## Notes

- **HTTPS, not HTTP.** The KasmVNC endpoint serves TLS on 6901; a plain
  `http://localhost:6901` request is rejected. The container answers `401`
  until you supply the basic-auth credentials — that is expected, not an error.
- **KasmVNC delivery.** The page loads a KasmVNC client that opens a WebSocket
  to `/websockify`; the remote Chromium desktop paints once that connection is
  established. If it shows "Failed to connect to server", click **Connect**.
- **Automated screenshots (agent-browser / Playwright) gotcha.** HTTP basic-auth
  credentials set via Playwright (`httpCredentials` / `extraHTTPHeaders`) reach
  regular HTTP requests but are **not** applied to the `/websockify` WebSocket
  upgrade, so the VNC connection fails with a `401`. Work around it by loading
  the page with credentials embedded in the URL
  (`https://kasm_user:password@localhost:6901/`) *and* injecting an init-script
  that rewrites the WebSocket URL to include the same userinfo before the client
  connects. A normal interactive browser is unaffected — it caches the
  basic-auth credentials and reuses them for the WebSocket automatically.