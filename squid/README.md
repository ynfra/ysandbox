# Squid Forward Proxy

![squid](docs/dashboard.png)

A [Squid](http://www.squid-cache.org/) forward proxy with SSL-Bump (HTTPS
interception) that chains all traffic to an upstream parent proxy. Built locally
from `debian:bookworm-slim` and published on host port **3128**.

## Architecture

![architecture](.docs/arch.png)

Squid listens on `3128` with `ssl-bump` enabled (peek at step 1, bump all),
generating per-host certificates on the fly from the bundled CA
(`squid/squid-ca.pem`). Every request is forwarded to a parent proxy
(`never_direct allow all`) configured via environment variables — by default
`p.webshare.io:80` with placeholder credentials.

## Running

This is a **local `build:` stack** — it must be built before first run:

```bash
docker compose up -d --build
```

The parent proxy host/port/credentials are set in `docker-compose.yml`:

```yaml
environment:
  - PROXY_HOST=p.webshare.io
  - PROXY_PORT=80
  - PROXY_USER=foo
  - PROXY_PASS=bar
```

Replace `PROXY_USER` / `PROXY_PASS` with real upstream credentials to actually
reach the internet. The defaults are placeholders.

### Using it as a proxy

```bash
# HTTP request routed through Squid
curl -x http://localhost:3128 http://example.com

# HTTPS with SSL-Bump — trust the bundled CA or skip verification
curl -x http://localhost:3128 --cacert squid/squid-ca.pem https://example.com
```

A direct browser/`curl` GET to `http://localhost:3128/` (no proxy target) returns
a Squid-generated **"ERROR: The requested URL could not be retrieved"** page —
that is the page shown in the screenshot above and confirms Squid is up.

Regenerate the CA with `make ssl` if needed.

## Notes

- **Screenshot** shows the Squid error page served on `3128` when the port is
  hit directly (no upstream target). Squid is running and answering — it just
  has nothing to proxy for a bare `GET /`.
- **SSL-Bump requires the OpenSSL build of Squid.** Debian's plain `squid`
  package is compiled without OpenSSL, so `ssl-bump` directives fail with
  `Unknown http_port option 'ssl-bump'`. The Dockerfile installs
  **`squid-openssl`** instead.
- **`security_file_certgen` lives at `/usr/lib/squid/`** on Debian (not
  `/usr/lib64/`, which is a Red Hat path) — referenced in `squid.conf.template`.
- **The `step1` ACL must be defined** (`acl step1 at_step SslBump1`) before it
  can be used in `ssl_bump peek step1`.
- **The SSL cert DB is initialized on startup** by the entrypoint
  (`security_file_certgen -c -s /var/lib/ssl_db`) before Squid launches.
- With placeholder upstream credentials, proxying to the real internet returns
  **407 Proxy Authentication Required** from the parent — expected until real
  credentials are supplied.
- Host port `3128` is the Squid default. If another stack already binds it, add a
  gitignored `docker-compose.override.yml` with `ports: !override` to remap.

## Stopping

```bash
docker compose down
```
