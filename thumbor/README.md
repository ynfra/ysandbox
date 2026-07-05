# Thumbor

On-demand image processing server. Resize, crop, flip, and apply filters to
images via URL parameters. API-only — there is no dashboard; you interact with
it purely through processing URLs.

![thumbor](docs/dashboard.png)

## Usage

```bash
make docker-up
```

Wait a few seconds, then verify:

```bash
curl http://localhost:8888/healthcheck   # -> WORKING
```

Process an image by URL — generic form `/unsafe/WxH/filters:.../<image-url>`:

```
http://localhost:8888/unsafe/1000x0/filters:grayscale()/https://raw.githubusercontent.com/thumbor/thumbor/master/example.jpg
```

> **Container port:** the `minimalcompact/thumbor` image defaults `THUMBOR_PORT`
> to `80`, so the compose sets `THUMBOR_PORT: "8888"` explicitly to match the
> published port — without it nothing binds on 8888 and the stack appears dead.
> `ALLOW_UNSAFE_URL: "True"` enables unsigned `/unsafe/` URLs and the default
> HTTP loader fetches remote images. Host port `8888` is shared with other
> sandbox stacks — remap via a gitignored `docker-compose.override.yml`
> (`ports: !override`) if it clashes.

<details><summary>API examples</summary>

Resize an image to 300x200:

```bash
curl "http://localhost:8888/unsafe/300x200/https://example.com/image.jpg" -o resized.jpg
```

Smart crop (face/feature detection):

```bash
curl "http://localhost:8888/unsafe/300x200/smart/https://example.com/photo.jpg" -o cropped.jpg
```

</details>

## Services

| Container | Port(s) | Description |
|-----------|---------|-------------|
| **thumbor** | `8888` | Thumbor image processing server |

## Configuration

Environment variables in `docker-compose.yml` (sandbox-safe defaults):

| Variable | Default | Notes |
|----------|---------|-------|
| `THUMBOR_SECURITY_KEY` | `thumbor-sandbox-key` | Key for signing URLs — **change** for real use |
| `ALLOW_UNSAFE_URL` | `True` | Allow unsigned `/unsafe/` processing URLs |
| `THUMBOR_PORT` | `8888` | Port thumbor listens on (must match published port) |

## Volumes

| Path | Contents |
|------|----------|
| `.docker/data/` | Image cache (`/data`) |

## Observability

| Check | Endpoint / Command |
|-------|--------------------|
| Health | `curl http://localhost:8888/healthcheck` |
| Logs | `docker compose logs -f thumbor` |

## Resources

- GitHub: https://github.com/minimalcompact/thumbor
- Docs: https://thumbor.readthedocs.io
