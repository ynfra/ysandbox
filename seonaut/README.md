# SEOnaut

Open-source SEO auditing tool that crawls websites and identifies issues affecting search engine rankings, including broken links, redirect problems, duplicate meta tags, and heading structure errors.

## Services

- **seonaut**: SEOnaut web application
- **db**: MySQL 8.4 database

## Ports

- `9000`: SEOnaut web UI

## Usage

```bash
make docker-up
```

## Configuration

Database credentials:

- Database: `seonaut`
- User: `seonaut`
- Password: `seonaut`

Database data is persisted in `.docker/mysql/`.
