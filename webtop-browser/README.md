# Webtop Browser

![webtop-browser](docs/dashboard.png)

A containerized Linux desktop environment accessible via web browser using LinuxServer.io's Webtop image, providing a full desktop experience for browser-based computing.

## Services

- **webtop**: Linux desktop environment with web-based access

## Ports

- `3000`: HTTP web interface for desktop access
- `3001`: HTTPS web interface for desktop access

## Running

```bash
docker compose up -d
# or: make up
```

Then open the web desktop:

- HTTP:  http://localhost:3000
- HTTPS: https://localhost:3001 (self-signed cert — accept the warning)

No password is set by default (the image ships without auth for local use).
The rendered UI is a full XFCE desktop (Selkies/KasmVNC) drawn on a `<canvas>`
in the browser, with a control sidebar for clipboard, files, audio and video
settings.

## Notes

- Boots cleanly on OrbStack/macOS with a plain `docker compose up -d`; no
  `platform:` override or GPU flags are required (`amd64`/`arm64` are both
  published).
- First run pulls a large multi-hundred-MB image; allow a few minutes.
- The desktop needs a few seconds after the container is `Up` to paint
  selkies — if the browser shows a black canvas, wait and reload.
- Port clash: if host port `3000`/`3001` is taken by another stack, add a
  gitignored `docker-compose.override.yml` with `ports: !override` remapping
  to free host ports (do not commit it).

## Configuration

Key environment variables:
- `PUID=1000`: User ID for file permissions
- `PGID=1000`: Group ID for file permissions
- `TZ=Etc/UTC`: Timezone setting
- `SUBFOLDER=/`: Web subfolder path
- `TITLE=Ynfra`: Browser title for the interface

Desktop configuration is persisted in `.docker/config`. The service provides a full Linux desktop environment accessible through your web browser, ideal for running applications in an isolated environment.