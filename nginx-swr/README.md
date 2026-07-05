# Nginx + SWR

Nginx reverse-proxy cache demo with stale-while-revalidate in front of a small
Bun origin. Nginx caches the upstream response and serves stale content while it
refreshes in the background, so repeated requests show `MISS` / `HIT` / `STALE` /
`UPDATING` cache states. No authentication — this is a caching reference only.

![nginx-swr](docs/dashboard.png)

## Usage

```bash
make docker-up
```

- Open [`http://localhost:8080`](http://localhost:8080) — Nginx serves the Bun
  app (`app:3000`) through its proxy cache. The body is a timestamp
  (`Now: <date>`) so repeated requests reveal the caching behaviour.
- [`http://localhost:3000`](http://localhost:3000) hits the Bun origin directly
  (uncached) for comparison.
- The `X-Cache-Status` response header reports `MISS` / `HIT` / `STALE` /
  `UPDATING`.

Load-test the cache with the bundled script:

```bash
./tester.sh        # ./tester.sh 10s | 60s
```

<details><summary>API examples</summary>

```sh
# Request 1 — cache miss
❯ curl -i http://localhost:8080/
X-Cache-Status: MISS
Now: Sun, 23 Feb 2025 21:38:37 GMT

# Request 2 — cache hit
❯ curl -i http://localhost:8080/
X-Cache-Status: HIT
Now: Sun, 23 Feb 2025 21:38:37 GMT

# After proxy_cache_valid expires — served stale, refreshed in background
❯ curl -i http://localhost:8080/
X-Cache-Status: STALE
Now: Sun, 23 Feb 2025 21:38:37 GMT
```

</details>

## Services

| Container | Port(s) | Description |
|-----------|---------|-------------|
| **nginx** | `8080` | Nginx 1.27 proxy cache with stale-while-revalidate in front of `app` |
| **app** | `3000` | Bun origin returning a `Now: <timestamp>` body (also reachable directly) |

## Configuration

No `.env` — behaviour is defined entirely in `nginx/nginx.conf`:

| Directive | Value | Notes |
|-----------|-------|-------|
| `proxy_cache_path` | `/srv/cache levels=1:2 keys_zone=cache:10m max_size=10g inactive=5m` | In-container cache zone (not persisted) |
| `proxy_cache_valid` | `1m` | Fresh window before a cached entry goes stale |
| `proxy_cache_use_stale` | `error timeout updating http_500..504` | When stale content may still be served |
| `proxy_cache_background_update` | `on` | Refresh stale entries in the background |
| `proxy_cache_lock` | `on` | Only one request populates a given key at a time |

## Volumes

None — stateless. The cache lives in `/srv/cache` inside the Nginx container and
is discarded on `docker compose down`. `nginx/nginx.conf` and `app/server.js` are
read-only config bind mounts, not persisted state.

## Observability

| Check | Endpoint / Command |
|-------|--------------------|
| Cache status | `curl -i http://localhost:8080/` (read `X-Cache-Status`) |
| Origin (uncached) | `curl -i http://localhost:3000/` |
| Logs | `docker compose logs -f nginx` |

## Resources

- Nginx `ngx_http_proxy_module`: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Bun: https://github.com/oven-sh/bun
