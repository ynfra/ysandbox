# Chromium Browser

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