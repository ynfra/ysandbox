<h1 align=center>Nginx Cookbook</h1>

![nginx-php](docs/dashboard.png)

<p align=center>
   Example of Nginx configurations with Docker.
</p>

<p align=center>
🕹 <a href="https://f3l1x.io">f3l1x.io</a> | 💻 <a href="https://github.com/f3l1x">f3l1x</a> | 🐦 <a href="https://twitter.com/xf3l1x">@xf3l1x</a>
</p>

<p align=center>
  <a href="https://bit.ly/ctteg"><img src="https://badgen.net/badge/support/gitter/cyan"></a>
  <a href="https://github.com/sponsors/f3l1x"><img src="https://badgen.net/badge/sponsor/donations/F96854"></a>
</p>

-----

## Cookbooks

- 01-app - example app + Nginx caching

-----

## Running

This stack is **build-based** — there is no `docker-compose.yml`. Build the
image from the `Dockerfile` (custom Nginx 1.22 + PHP-FPM 8.1) and run it,
publishing the app server on host port `8080`:

```bash
docker build -t nginx-php .
docker run --rm -p 8080:80 nginx-php
```

- Open [`http://localhost:8080`](http://localhost:8080) — Nginx passes `.php`
  requests to PHP-FPM over a unix socket and serves `app/index.php`, which
  returns a JSON payload (`{"date": "...", "timestamp": ...}`).
- No authentication.

## Notes

- The container listens on **two** ports internally (see `nginx/site.conf`):
  - `80` — the application (PHP-FPM via `try_files … /index.php`).
  - `81` — a caching reverse proxy in front of `:80` (proxy cache with
    stale-while-revalidate, adds an `x-cache-status` header). Publish it too
    with an extra `-p 8081:81` if you want to exercise the cache layer.
- The bundled `Makefile` targets (`build-app` / `up-app`) reference an old
  `01-app/` layout and do not match the current single-app structure — build
  the `Dockerfile` directly as shown above.

-----

Consider to [support](https://github.com/sponsors/f3l1x) **f3l1x**. Also thank you for using this package.
