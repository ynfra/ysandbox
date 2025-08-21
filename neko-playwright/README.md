# Neko + Playwright

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
