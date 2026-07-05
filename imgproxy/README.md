# imgproxy

Fast and secure on-the-fly image processing server. Resize, crop, and convert
images via URL parameters — sibling to the `thumbor` stack, but written in Go
with libvips for much higher throughput. API-only — there is no dashboard; you
interact with it purely through processing URLs.

This sandbox runs in **insecure mode** (no `IMGPROXY_KEY`/`IMGPROXY_SALT`), so
unsigned `/insecure/` URLs work out of the box. Never expose this configuration
beyond localhost.

## Usage

```bash
make docker-up
```

Wait a few seconds, then verify:

```bash
curl http://localhost:8085/health   # -> imgproxy is running
```

Process an image by URL — generic form
`/insecure/<processing-options>/plain/<source-url>`:

```
http://localhost:8085/insecure/rs:fit:300:200/plain/local:///test.png
http://localhost:8085/insecure/rs:fit:300:200/plain/https://raw.githubusercontent.com/thumbor/thumbor/master/example.jpg
```

Local files come from `.docker/images/` (mounted at `/images`, served via
`local:///` URLs). Host port `8085` avoids clashing with other sandbox stacks —
remap via a gitignored `docker-compose.override.yml` (`ports: !override`) if
needed.

<details><summary>API examples</summary>

Resize a local file to fit 100x100:

```bash
curl "http://localhost:8085/insecure/rs:fit:100:100/plain/local:///test.png" -o resized.png
```

Fetch a remote image, crop to 300x200 with smart gravity, convert to WebP:

```bash
curl "http://localhost:8085/insecure/rs:fill:300:200/g:sm/plain/https://example.com/photo.jpg@webp" -o cropped.webp
```

</details>

## Services

| Container | Port(s) | Description |
|-----------|---------|-------------|
| **imgproxy** | `8085` (container `8080`) | imgproxy image processing server |

## Configuration

Environment variables in `docker-compose.yml` (sandbox-safe defaults):

| Variable | Default | Notes |
|----------|---------|-------|
| `IMGPROXY_KEY` / `IMGPROXY_SALT` | _(unset)_ | Unset = insecure mode, unsigned `/insecure/` URLs — **set both** (hex-encoded) for real use |
| `IMGPROXY_LOCAL_FILESYSTEM_ROOT` | `/images` | Root for `local:///` source URLs (mounted from `.docker/images/`) |
| `IMGPROXY_AUTO_WEBP` | `true` | Serve WebP automatically when the client `Accept` header allows it |
| `IMGPROXY_ALLOW_ORIGIN` | `*` | CORS header for browser use — **restrict** for real use |

## Volumes

| Path | Contents |
|------|----------|
| `.docker/images/` | Local source images served via `local:///` URLs (`/images`) |

## Observability

| Check | Endpoint / Command |
|-------|--------------------|
| Health | `curl http://localhost:8085/health` |
| Logs | `docker compose logs -f imgproxy` |

## Resources

- GitHub: https://github.com/imgproxy/imgproxy
- Docs: https://docs.imgproxy.net
