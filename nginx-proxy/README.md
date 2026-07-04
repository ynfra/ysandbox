# Nginx + Proxy

![nginx-proxy](docs/dashboard.png)

- Nginx on [`http://localhost:8080`](http://localhost:8080)
- App1 on [`http://localhost:3001`](http://localhost:3001)
- App2 on [`http://localhost:3002`](http://localhost:3002)

## Usage

```
docker compose up
```

## Running

```
docker compose up -d
```

- Nginx reverse proxy: [`http://localhost:8080`](http://localhost:8080)
- Demo path (proxied + rewritten to the Bun app):
  [`http://localhost:8080/foo/bar/xx/image.png`](http://localhost:8080/foo/bar/xx/image.png)

The root `/` returns `404` by design (`@handle_404`); hit a demo path with one
or more segments to exercise the proxy.

## Notes

This stack demonstrates an Nginx reverse proxy in front of two round-robined
Bun.js app instances (`app1`, `app2`):

- **Path rewrite** — incoming multi-segment paths are collapsed into a
  Swift-style object path before `proxy_pass`, e.g.
  `foo/bar/xx/image.png` → `/v1/AUTH_myaccount/foo-bar-xx/image.png`.
- **Forwarded client headers** — the proxy sets `X-Real-IP`,
  `X-Forwarded-For`, and `X-Forwarded-Proto` (visible in the JSON echoed by
  the Bun app).
- **Upstream identification** — the response includes an `X-Host` header set
  to `$upstream_addr` (the actual backend `ip:port` that served the request),
  useful for seeing which app instance handled a given call.

> The `X-Host` header uses the built-in `$upstream_addr` variable. An earlier
> version used the undefined `$upstream_server`, which made nginx fail to start
> with `[emerg] unknown "upstream_server" variable` (port 8080 never came up).

## Configuration

**Proxy**

```
# nginx.conf
server {
    listen 80;

    # Index
    location / {
        proxy_pass http://app;
    }
}
```

## Architecture

![](.docs/arch.png)

## Examples

```
❯ curl localhost:8080/foo/bar/xx/image.png
{"url":"http://localhost/v1/AUTH_myaccount/foo-bar-xx/image.png","headers":{"host":"localhost","connection":"close","user-agent":"curl/8.7.1","accept":"*/*","x-real-ip":"192.168.147.1","x-forwarded-for":"192.168.147.1","x-forwarded-proto":"http"},"method":"GET"}
```
