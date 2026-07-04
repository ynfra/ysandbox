# MinIO

![minio console](docs/dashboard.png)

S3-compatible object storage server. Drop-in replacement for Amazon S3 with a web console for bucket management.

## Services

- **minio**: MinIO object storage server

## Ports

- `9000`: S3 API endpoint
- `9001`: MinIO web console

## Usage

```bash
make docker-up
```

## Access

- Console: http://localhost:9001
- S3 API: http://localhost:9000
- Default credentials: `minioadmin` / `minioadmin`

## Examples

Using the MinIO client:

```bash
mc alias set local http://localhost:9000 minioadmin minioadmin
mc mb local/my-bucket
mc cp myfile.txt local/my-bucket/
```

## Configuration

Environment variables in `docker-compose.yml`:

- `MINIO_ROOT_USER`: Admin username (default: `minioadmin`)
- `MINIO_ROOT_PASSWORD`: Admin password (default: `minioadmin`)

Object data is persisted in `.docker/data/`
