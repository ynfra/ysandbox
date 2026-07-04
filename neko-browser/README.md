# Neko Browser

![neko-browser](docs/dashboard.png)

Browser automation setup using Neko (remote browser) with Playwright for testing and automation.

## Services

- **neko**: Remote Chrome browser with WebRTC streaming capabilities

## Ports

- `8080`: Neko browser interface
- `9223`: Chrome DevTools Protocol
- `56000-56100/udp`: WebRTC streaming

## Setup

1. Start the services:
   ```bash
   make docker-up
   # docker compose up -d
   ```

2. Install Playwright dependencies:
   ```bash
   make install
   # npm install
   # npx playwright install
   ```

3. Run tests:
   ```bash
   make test
   # npx playwright test
   ```

## Access

- Neko Browser: http://localhost:8080
- Admin: `neko` / `admin`

## Running

```bash
docker compose up -d
```

- Web UI: http://localhost:8080 — enter a display name and connect.
- User password: `neko` (`NEKO_MEMBER_MULTIUSER_USER_PASSWORD`)
- Admin password: `admin` (`NEKO_MEMBER_MULTIUSER_ADMIN_PASSWORD`)
- The desktop and Chromium stream to the browser over WebRTC; first frame
  appears a few seconds after connecting.

Bring the stack down with `docker compose down`.

## Notes

- **WebRTC transport.** `NEKO_WEBRTC_EPR=56000-56100` publishes the UDP media
  port range (mapped `56000-56100:56000-56100/udp`), and
  `NEKO_WEBRTC_NAT1TO1=127.0.0.1` advertises the local host as the ICE
  candidate for local access. `NEKO_WEBRTC_ICELITE=1` runs Neko as an
  ICE-lite peer. For remote access, set `NEKO_WEBRTC_NAT1TO1` to the host's
  reachable IP and open the UDP range.
- **`NEKO_CHROME_FLAGS` is required.** The image's supervisord `chromium.conf`
  interpolates `%(ENV_NEKO_CHROME_FLAGS)s` into the Chromium launch command.
  If the variable is unset, supervisord fails to expand the format string and
  Chromium crash-loops (the container stays in `Restarting` and port 8080
  never binds). It is defined (empty) in `docker-compose.yml`; append extra
  Chromium flags there if needed.
- **Port clash.** Host port 8080 is shared with other ysandbox stacks. To run
  two at once, add a gitignored `docker-compose.override.yml` remapping the
  published port with `ports: !override` — do not commit it.
