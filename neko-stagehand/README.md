# Neko + Stagehand

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
