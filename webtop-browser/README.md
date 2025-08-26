# Webtop Browser

A containerized Linux desktop environment accessible via web browser using LinuxServer.io's Webtop image, providing a full desktop experience for browser-based computing.

## Services

- **webtop**: Linux desktop environment with web-based access

## Ports

- `3000`: HTTP web interface for desktop access
- `3001`: HTTPS web interface for desktop access

## Usage

```bash
make up
```

## Configuration

Key environment variables:
- `PUID=1000`: User ID for file permissions
- `PGID=1000`: Group ID for file permissions
- `TZ=Etc/UTC`: Timezone setting
- `SUBFOLDER=/`: Web subfolder path
- `TITLE=Ynfra`: Browser title for the interface

Desktop configuration is persisted in `.docker/config`. The service provides a full Linux desktop environment accessible through your web browser, ideal for running applications in an isolated environment.