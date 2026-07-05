# Kasm Chromium

A containerized Chromium browser built on Kasm Workspaces, delivering a secure,
isolated desktop browsing session over KasmVNC in the browser — useful for
throwaway browsing, testing, or handing an agent a real GUI browser.

![kasm-chromium](docs/dashboard.png)

## Usage

```bash
make docker-up
```

Open **https://localhost:6901** — HTTPS with a self-signed cert (accept the
browser warning). The endpoint is protected by HTTP basic auth:

- Username: `kasm_user`
- Password: `password` (the `VNC_PW` value from `docker-compose.yml`)

First boot pulls a ~1 GB image, so the initial `docker compose up` can take a
few minutes.

> **HTTPS, not HTTP.** KasmVNC serves TLS on 6901; a plain `http://localhost:6901`
> request is rejected, and the container answers `401` until you supply the
> basic-auth credentials — that is expected, not an error. The page loads a
> KasmVNC client that opens a WebSocket to `/websockify`; the remote desktop
> paints once that connection is established.

> **Automated-screenshot gotcha.** Playwright `httpCredentials` /
> `extraHTTPHeaders` reach normal HTTP requests but are **not** applied to the
> `/websockify` WebSocket upgrade, so the VNC connection fails with `401`. Work
> around it by embedding credentials in the URL
> (`https://kasm_user:password@localhost:6901/`) *and* injecting an init-script
> that rewrites the WebSocket URL to include the same userinfo before the client
> connects. Interactive browsers are unaffected (they cache and reuse the creds).

## Services

| Container | Port(s) | Description |
|-----------|---------|-------------|
| **chromium** | `6901` | Kasm Chromium desktop over KasmVNC (HTTPS), `shm_size: 512m` |

## Configuration

Environment variables in `docker-compose.yml` (sandbox-safe defaults):

| Variable | Default | Notes |
|----------|---------|-------|
| `VNC_PW` | `password` | Basic-auth / VNC password for `kasm_user` — **change** for real use |

## Volumes

None — stateless. Session state lives in the container and is discarded on
teardown.

## Observability

| Check | Endpoint / Command |
|-------|--------------------|
| Web access | `https://localhost:6901` (basic auth `kasm_user` / `password`) |
| Logs | `docker compose logs -f chromium` |

## Resources

- GitHub: https://github.com/kasmtech/workspaces-images
- Docs: https://www.kasmweb.com/docs/latest/index.html
