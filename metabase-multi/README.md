# Metabase Multi

![metabase-multi](docs/dashboard.png)

A multi-instance Metabase setup with two independent Metabase instances, each backed by its own PostgreSQL database for testing and development scenarios.

## Services

- **metabase1**: First Metabase instance connected to postgres1
- **postgres1**: PostgreSQL database for metabase1
- **metabase2**: Second Metabase instance connected to postgres2  
- **postgres2**: PostgreSQL database for metabase2

## Ports

- `3001`: Metabase instance 1 web interface
- `3002`: Metabase instance 2 web interface

## Running

```bash
docker compose up -d
```

Each Metabase instance is a Clojure application that runs database migrations on
first boot, so give it up to a few minutes to become healthy. Poll readiness with:

```bash
curl -sf -o /dev/null -w '%{http_code}' http://localhost:3001/api/health   # 200 when ready
```

- Instance 1: <http://localhost:3001>
- Instance 2: <http://localhost:3002>

Each instance has its **own dedicated PostgreSQL** database (`postgres1` /
`postgres2`) for storing its application metadata — they are fully independent.

### First-run setup wizard

On first launch, each Metabase instance shows an interactive setup wizard that
must be completed in the browser: choose a language, create the admin account,
and either connect a database or continue with the bundled sample data. The
screenshot above shows the Home page of instance 1 after completing the wizard
(admin `admin@metabase.local`, using the built-in sample data). Instance 2 is
independent and needs its own wizard run at <http://localhost:3002>.

## Configuration

Each Metabase instance has its own database configuration:

**Instance 1:**
- Database: `metabase1`
- User: `metabase1`
- Password: `metabase1`

**Instance 2:**
- Database: `metabase2`
- User: `metabase2` 
- Password: `metabase2`

Both instances include health checks and are accessible at their respective ports for independent testing and development.