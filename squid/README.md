# OpenResty S3 Proxy Cache

This project implements a proxy cache webserver using OpenResty that forwards requests to target websites and stores responses in an S3-compatible storage system (MinIO).

## Features

- **Website Proxy**: Forwards requests to any website.
- **Caching**: Stores responses in an S3 bucket for faster future access.
- **HTTP Proxy Support**: Uses a configured HTTP proxy for outbound requests.
- **Docker Deployment**: Easy setup with Docker Compose.

## Setup & Usage

### Prerequisites

- Docker and Docker Compose installed on your system

### Running the Service

1. Clone this repository
2. Start the services:

```bash
docker compose up -d
```

3. Access the proxy at http://localhost:8080

### How It Works

1. When a request arrives, OpenResty checks if the content is already cached in the S3 bucket.
2. If cached, the content is served directly from S3.
3. If not cached, the request is forwarded to the target website through the configured HTTP proxy.
4. The response is stored in S3 for future requests and served to the client.

### Configuration

The default configuration uses:

- HTTP Proxy: http://moderntv:password@webshare.io:80
- S3 Bucket: "www"
- MinIO credentials: minioadmin/minioadmin

To change these settings, modify the `_G.s3_config` and `_G.http_proxy` variables in the `nginx.conf` file.

### Example Usage

To fetch and cache a website through the proxy:

```bash
curl http://localhost:8080/https://example.com
```

### MinIO Console

Access the MinIO console at http://localhost:9001 with credentials:
- Username: minioadmin
- Password: minioadmin

## Architecture

The system consists of three components:

1. **OpenResty**: Nginx with Lua extensions that handles the request processing logic
2. **MinIO**: S3-compatible object storage for caching responses
3. **HTTP Proxy**: External proxy service for forwarding requests to target websites

## Troubleshooting

- If you're having issues with the proxy connection, check your HTTP proxy credentials and settings.
- Verify that the MinIO server is running correctly by accessing the web console.
- Check OpenResty logs with `docker compose logs openresty`.
