# Iconify + SWR

Nginx proxy-cache sitting in front of the Iconify icon API, demonstrating
stale-while-revalidate (SWR) caching. Every icon response is cached and tagged
with an `X-Cache-Status` header (`MISS` → `HIT` → `STALE` → `HIT`); expired
entries are served immediately while being refreshed in the background.

![iconify-swr](docs/dashboard.png)

## Usage

```bash
make docker-up
```

- **Nginx cache/proxy:** http://localhost:8080 (host `8080` → container `80`)
- **Iconify API direct:** http://localhost:3000

`GET /` on the API 301-redirects to the upstream Iconify docs; request a
concrete `/<prefix>/<icon>.svg` to get an actual image back.

> The `iconify/api` image is pinned to `linux/amd64` (runs under emulation on
> arm64). If host port `8080` clashes with another sandbox stack, drop a
> gitignored `docker-compose.override.yml` remapping the nginx port with
> `ports: !override` — do not commit it.

<details><summary>API examples</summary>

Fetch a rendered icon through the cache (any Iconify set, e.g. `mdi`, `bi`):

```bash
# Material Design Icons "home", 200px tall
curl "http://localhost:8080/mdi/home.svg?height=200"

# Sized + tinted (URL-encode the leading # as %23)
curl "http://localhost:8080/mdi/home.svg?height=400&color=%234f46e5"
```

Watch the cache decision live via the `X-Cache-Status` header:

```bash
curl -i "http://localhost:8080/bi/bell-fill.svg?width=256" | grep X-Cache-Status
```

The SWR behaviour is configured in `nginx/nginx.conf`: `proxy_cache_valid 1m`,
`proxy_cache_background_update on`, and `proxy_cache_lock on` mean a single
request revalidates a stale entry in the background while everyone else keeps
getting the fast cached copy.

</details>

## Services

| Container | Port(s) | Description |
|-----------|---------|-------------|
| **nginx** | `8080` (→80) | Reverse proxy with `proxy_cache` SWR configuration |
| **icons** | `3000` | Iconify API (`iconify/api`, pinned `linux/amd64`) |

## Configuration

Configuration lives in `nginx/nginx.conf` (no env vars):

| Setting | Value | Notes |
|---------|-------|-------|
| `proxy_cache_path` | `/srv/cache` `max_size=10g` `inactive=5m` | Cache zone (in-container, not persisted) |
| `proxy_cache_valid` | `1m` | Fresh window before an entry goes stale |
| `proxy_cache_background_update` | `on` | Serve stale immediately, refresh in background |
| `proxy_cache_lock` | `on` | Only one request revalidates at a time |

## Volumes

None — stateless. The nginx cache lives at `/srv/cache` inside the container and
is discarded when the stack is torn down.

## Observability

| Check | Endpoint / Command |
|-------|--------------------|
| Cache status | `curl -i http://localhost:8080/mdi/home.svg \| grep X-Cache-Status` |
| API direct | `http://localhost:3000` |
| Logs | `docker compose logs -f nginx` |

## Resources

- Iconify API: https://github.com/iconify/api — https://iconify.design/docs/api/
- Nginx caching: https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_cache
