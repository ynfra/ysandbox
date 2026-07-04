# Neko + Playwright

![neko-playwright](docs/dashboard.png)

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

- Open the web UI at http://localhost:8080 and connect with a display name.
- Passwords come from the compose env: user `neko`, admin `admin`
  (`NEKO_MEMBER_MULTIUSER_USER_PASSWORD` / `NEKO_MEMBER_MULTIUSER_ADMIN_PASSWORD`).
- The screenshot above shows the streamed Chromium session inside the Neko room
  after logging in as admin.

Bring the stack down with `docker compose down`.

### How Playwright connects

Playwright runs on the **host** (not as a compose service) and drives the neko
Chromium over the Chrome DevTools Protocol exposed on port `9223`:

```ts
const browser = await chromium.connectOverCDP('http://0.0.0.0:9223');
```

Install and run the tests locally:

```bash
make install   # npm install && npx playwright install
make test      # npx playwright test
```

## Notes

- **Chromium crash-loop fix.** The stock `dockette/neko:chromium` supervisord
  config (`/etc/neko/supervisord/chromium.conf`) references
  `%(ENV_NEKO_CHROME_FLAGS)s`. If that variable is unset, supervisord fails to
  expand the format string, chromium never starts, the container sits in
  `Restarting`, and port 8080 stays unbound. Setting `NEKO_CHROME_FLAGS: ""`
  (empty) in the neko service env resolves it — this is applied in
  `docker-compose.yml`.
- **Host port 8080** is not globally unique in ysandbox. If another stack holds
  8080, add a gitignored `docker-compose.override.yml` remapping the host port
  (`ports: !override`) before bringing this stack up.
