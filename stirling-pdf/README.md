# Stirling-PDF

Self-hosted PDF manipulation toolkit. Merge, split, convert, OCR, compress, and watermark PDF files through a web UI.

## Services

- **stirling-pdf**: Stirling-PDF web application

## Ports

- `8080`: Stirling-PDF web UI

## Usage

```bash
make docker-up
```

Access the web UI at http://localhost:8080

## Configuration

- `DOCKER_ENABLE_SECURITY`: Set to `true` to enable authentication (default: `false`)
- Config is persisted in `.docker/configs/`
- Logs are persisted in `.docker/logs/`
