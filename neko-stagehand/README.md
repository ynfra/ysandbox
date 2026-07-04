# Neko + Stagehand

![neko-stagehand](docs/dashboard.png)

Browser automation setup using Neko (remote browser) with Stagehand for testing and automation.

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

2. Install Stagehand dependencies:
   ```bash
   make install
   # npm install
   ```

3. Run tests:
   ```bash
   make test
   # tsx index.ts
   ```

## Access

- Neko Browser: http://localhost:8080
- Admin: `neko` / `admin`

## Running

```bash
docker compose up -d
```

- Open http://localhost:8080 and connect with a display name plus a password:
  - **User:** `neko` (from `NEKO_MEMBER_MULTIUSER_USER_PASSWORD`)
  - **Admin:** `admin` (from `NEKO_MEMBER_MULTIUSER_ADMIN_PASSWORD`)
- The room UI streams a live Chromium desktop over WebRTC; the bottom bar
  exposes keyboard/control-lock, media playback and volume.

### How Stagehand connects

Stagehand runs on the host (`tsx index.ts`) in `LOCAL` env and attaches to the
Neko-managed Chromium over the Chrome DevTools Protocol at
`http://0.0.0.0:9223` (published container port `9223`). It drives the same
browser you see streamed in the web UI, recording video to `./videos`. Provide
`OPENAI_API_KEY` / `OPENAI_BASE_URL` (or `GOOGLE_API_KEY`) via `.env` before
running the tests.

## Notes

- **Boot fix:** `dockette/neko:chromium`'s supervisord config references
  `%(ENV_NEKO_CHROME_FLAGS)s`. When that variable is unset, supervisord fails to
  expand it and the container crash-loops (`Restarting`), leaving port 8080
  unbound. The compose sets `NEKO_CHROME_FLAGS: ""` (empty) to satisfy the
  interpolation and let Chromium start.
- Port 8080 is shared with the other `neko-*` sandbox stacks — only run one at a
  time. To coexist during testing, add a gitignored
  `docker-compose.override.yml` remapping the host port (`ports: !override`).
- Bring the stack down with `docker compose down` (state under `.docker/` is
  gitignored).
