# Iconify + SWR

![iconify-swr](docs/dashboard.png)

- Nginx on [`http://localhost:8080`](http://localhost:8080)
- Iconify on [`http://localhost:3000`](http://localhost:3000)

## Usage

```
docker compose up
```

## Running

```sh
docker compose up -d
```

- Nginx cache/proxy: [`http://localhost:8080`](http://localhost:8080) (host port `8080` → container `80`)
- Iconify API direct: [`http://localhost:3000`](http://localhost:3000)

Fetch a rendered icon through the cache (any Iconify icon set, e.g. `mdi`, `bi`):

```sh
# Material Design Icons "home", 200px tall
curl "http://localhost:8080/mdi/home.svg?height=200"

# Sized + tinted (URL-encode the leading # as %23)
curl "http://localhost:8080/mdi/home.svg?height=400&color=%234f46e5"
```

`GET /` on the API 301-redirects to the upstream Iconify docs; request a
concrete `/<prefix>/<icon>.svg` to get an actual image back.

### How the SWR proxy-cache works

Nginx sits in front of `iconify/api` and caches every icon response in the
`cache` zone (`/srv/cache`, 10 GB max, 5 min inactive). Each response carries
an `X-Cache-Status` header showing the cache decision:

1. **MISS** — first request, fetched from the Iconify API and stored.
2. **HIT** — served straight from cache while still fresh (`proxy_cache_valid 1m`).
3. **STALE** — after expiry, the cached copy is returned *immediately* while
   `proxy_cache_background_update` refreshes it in the background
   (stale-while-revalidate). `proxy_cache_lock` ensures only one request does
   the refresh; the rest keep getting the fast stale copy.
4. **HIT** again — subsequent requests serve the freshly revalidated copy.

Watch it live:

```sh
curl -i "http://localhost:8080/bi/bell-fill.svg?width=256" | grep X-Cache-Status
```

## Notes

- No boot gotchas — the stack pulls `nginx:1.27` and `iconify/api:latest`
  (forced `linux/amd64` under OrbStack) and serves immediately.
- Host port clash: if `8080` is taken by another sandbox stack, drop a
  gitignored `docker-compose.override.yml` remapping the nginx port with
  `ports: !override` and use that instead — do not commit it.
- Bring the stack down with `docker compose down` (state lives in `.docker/`,
  gitignored).

## Configuration

**Cache zone**

```
# nginx.conf
proxy_cache_path /srv/cache levels=1:2 keys_zone=cache:10m max_size=10g inactive=5m use_temp_path=off;
```

- [`proxy_cache_path`](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_cache_path) - cache zone
  - `/srv/cache` - cache directory
  - `levels=1:2` - cache directory levels
  - `keys_zone=cache:10m` - cache name and cache size
  - `max_size=10g` - cache max size
  - `inactive=5m` - cache inactive time
  - `use_temp_path=off` - use cache directory

**Proxy**

```
# nginx.conf
location / {
    proxy_pass http://app:3000;

    proxy_cache cache;
    proxy_cache_revalidate on;
    proxy_cache_min_uses 1;
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
    proxy_cache_background_update on;
    proxy_cache_lock on;
    proxy_cache_valid 1m;

    add_header X-Cache-Status $upstream_cache_status;
}
```

- [`proxy_cache`](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_cache) - use defined cache zone by name
- [`proxy_cache_revalidate`](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_cache_revalidate) - enable cache revalidation
- [`proxy_cache_min_uses`](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_cache_min_uses) - minimum number of requests to cache
- [`proxy_cache_use_stale`](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_cache_use_stale) - cases when stale cache can be used
- [`proxy_cache_background_update`](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_cache_background_update) - update background cache invalidation
- [`proxy_cache_lock`](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_cache_lock) - only one request can update cache at a time
- [`proxy_cache_valid`](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_cache_valid) - cache valid for a time

## Architecture

![](.docs/arch.png)

## Examples

1. Request 1 - cache miss

```sh
❯ curl -i http://localhost:8080/bi/bell-fill.svg?width=256
HTTP/1.1 200 OK
Server: nginx
Date: Sun, 23 Feb 2025 21:38:37 GMT
Content-Type: text/plain;charset=utf-8
Content-Length: 34
Connection: keep-alive
X-Cache-Status: MISS

Now: Sun, 23 Feb 2025 21:38:37 GMT
```

2. Request 2 - cache hit

```sh
➜ curl -i http://localhost:8080/bi/bell-fill.svg?width=256
HTTP/1.1 200 OK
Server: nginx
Date: Sun, 23 Feb 2025 21:39:10 GMT
Content-Type: text/plain;charset=utf-8
Content-Length: 34
Connection: keep-alive
X-Cache-Status: HIT

Now: Sun, 23 Feb 2025 21:38:37 GMT
```

3. Request 3 - cache stale (update in background)

```sh
➜ curl -i http://localhost:8080/bi/bell-fill.svg?width=256
HTTP/1.1 200 OK
Server: nginx
Date: Sun, 23 Feb 2025 21:41:30 GMT
Content-Type: text/plain;charset=utf-8
Content-Length: 34
Connection: keep-alive
X-Cache-Status: STALE

Now: Sun, 23 Feb 2025 21:38:37 GMT
```

4. Request 4 - cache hit

```sh
➜ curl -i http://localhost:8080/bi/bell-fill.svg?width=256
HTTP/1.1 200 OK
Server: nginx
Date: Sun, 23 Feb 2025 21:41:35 GMT
Content-Type: text/plain;charset=utf-8
Content-Length: 34
Connection: keep-alive
X-Cache-Status: HIT

Now: Sun, 23 Feb 2025 21:41:30 GMT
```
