# SEOnaut

![seonaut](docs/dashboard.png)

Open-source SEO auditing tool that crawls websites and identifies issues affecting search engine rankings, including broken links, redirect problems, duplicate meta tags, and heading structure errors.

## Services

- **seonaut**: SEOnaut web application
- **db**: MySQL 8.4 database

## Ports

- `9000`: SEOnaut web UI

## Running

```bash
docker compose up -d       # or: make docker-up
```

Open the UI at http://localhost:9000. On first run there are no accounts —
click **Sign up**, register with an email + password (e.g.
`admin@seonaut.local` / `Passw0rd!`), then sign in. You land on the projects
dashboard where you can **Add Project** (any URL) and **Crawl Now** to run an
audit.

## Notes

- The `seonaut` container `depends_on` the MySQL `db` with
  `condition: service_healthy`, so it only starts once MySQL passes its
  `mysqladmin ping` healthcheck. First boot waits ~15–20s for MySQL to
  initialize before the web UI (port 9000) responds.
- MySQL runs `linux/amd64` under emulation on Apple Silicon; the initial
  `mysql:8.4` data-dir setup is the slowest part of a cold start.
- Boots cleanly with a plain `docker compose up -d` — no config changes
  required on OrbStack.
- To fully reset (accounts, projects, crawl data), stop the stack and delete
  `.docker/mysql/`.

## Configuration

Database credentials:

- Database: `seonaut`
- User: `seonaut`
- Password: `seonaut`

Database data is persisted in `.docker/mysql/`.
