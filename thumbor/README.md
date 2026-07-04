# Thumbor

![thumbor](docs/dashboard.png)

On-demand image processing server. Resize, crop, flip, and apply filters to images via URL parameters.

## Services

- **thumbor**: Thumbor image processing server

## Ports

- `8888`: Thumbor API endpoint

## Running

```bash
docker compose up -d          # or: make docker-up
```

Wait a few seconds, then verify:

```bash
curl http://localhost:8888/healthcheck   # -> WORKING
```

Thumbor is **API-only** — there is no dashboard. `/` returns 404; the only
plain endpoint is `/healthcheck`. You interact with it purely via processing
URLs. Example (also what the screenshot above shows — a 1000px-wide grayscale
render of the public thumbor sample image):

```
http://localhost:8888/unsafe/1000x0/filters:grayscale()/https://raw.githubusercontent.com/thumbor/thumbor/master/example.jpg
```

Generic form: `/unsafe/WxH/filters:.../<image-url>`.

## Notes

- **Container port:** the `minimalcompact/thumbor` image defaults
  `THUMBOR_PORT` to `80`. The compose publishes `8888:8888`, so
  `THUMBOR_PORT: "8888"` is set explicitly to make thumbor listen on the
  published port — without it nothing binds on 8888 and the stack appears
  dead.
- **Remote loader:** `ALLOW_UNSAFE_URL: "True"` enables unsigned `/unsafe/`
  URLs and the default HTTP loader fetches remote images, so the processing
  examples work against any public image URL.
- **Port clash:** host port `8888` is shared with other sandbox stacks. If it
  is taken, add a gitignored `docker-compose.override.yml` remapping the host
  port (`ports: !override`).

## Examples

Resize an image to 300x200:

```bash
curl "http://localhost:8888/unsafe/300x200/https://example.com/image.jpg" -o resized.jpg
```

Smart crop (face detection):

```bash
curl "http://localhost:8888/unsafe/300x200/smart/https://example.com/photo.jpg" -o cropped.jpg
```

## Configuration

- `THUMBOR_SECURITY_KEY`: Key for generating signed URLs (default: `thumbor-sandbox-key`)
- `ALLOW_UNSAFE_URL`: Allow unsigned `/unsafe/` URLs (default: `True`)
- Image cache is persisted in `.docker/data/`
