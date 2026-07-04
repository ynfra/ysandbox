# Chromium Browser

![chromium-browser](docs/dashboard.png)

A containerized Chromium browser with MCP (Model Context Protocol) extensions support using LinuxServer.io's Chrome image.

## Services

- **chrome**: LinuxServer Chrome browser with pre-loaded MCP extensions and web interface access

## Ports

- `3000`: HTTP web interface (should be proxied)
- `3001`: HTTPS web interface (primary access)
- `12306`: MCP chrome-mcp extension port

## Usage

```bash
make docker-up
```

## Configuration

Key environment variables:
- `PUID=1000`: User ID for file permissions
- `PGID=1000`: Group ID for file permissions
- `TZ=Europe/Prague`: Timezone setting
- `CHROME_CLI`: Chrome launch arguments including extension loading

The browser loads extensions from the `./extensions` directory and mounts configuration to `.docker/config`. Pre-configured extensions include chrome-mcp and playwright-mcp for browser automation and MCP integration.

## Running

```bash
docker compose up -d
```

Then open the web UI:

- HTTP:  http://localhost:3000
- HTTPS: https://localhost:3001 (self-signed cert — accept the browser warning)

The page renders the full Chrome desktop over a Selkies/KasmVNC web session
(browser-in-browser). No password is configured. The desktop needs ~20–40s
after the container is up before Chrome finishes painting inside the canvas.

Bring it down with `docker compose down`.

## Notes

- **`--disable-gpu --disable-software-rasterizer --no-zygote` are required in
  `CHROME_CLI`.** The image is amd64-only (`lscr.io/linuxserver/chrome` has no
  arm64 variant), so on Apple Silicon it runs under QEMU emulation via
  `platform: linux/amd64`. Without these flags Chrome's GPU/zygote subprocesses
  hit `GPU process isn't usable. Goodbye.` (SIGTRAP) under emulation and Chrome
  exits on launch; openbox does not retry, leaving a black desktop. The flags
  force software rendering in-process and let Chrome survive. They are harmless
  on native amd64 hosts (just software rendering).
- **The `chrome-mcp` extension is not shipped in the repo.** `extensions/` is
  gitignored and empty by default, so `--load-extension=/config/extensions/chrome-mcp`
  loads nothing (Chrome shows a one-time "couldn't load extension" notice but
  still runs). Populate `extensions/chrome-mcp/` to actually enable it.
- Runtime state (the Chrome profile) lives in `.docker/config/`. Delete it to
  reset the browser to a clean profile.