# Supabase

![supabase studio](docs/dashboard.png)

Self-hosted Supabase backend platform with PostgreSQL, authentication, storage, real-time subscriptions, edge functions, and a dashboard UI.

## Services

- **studio**: Supabase dashboard UI
- **kong**: API gateway (routes all client requests)
- **auth**: GoTrue authentication server
- **rest**: PostgREST API (auto-generated REST from Postgres schema)
- **realtime**: Real-time WebSocket subscriptions
- **storage**: File storage service
- **imgproxy**: Image transformation proxy
- **meta**: Postgres metadata API
- **functions**: Deno edge functions runtime
- **analytics**: Logflare log analytics
- **db**: PostgreSQL 15 database
- **vector**: Log aggregation agent
- **supavisor**: Connection pooler

## Ports

- `8000`: Supabase API (HTTP via Kong)
- `8443`: Supabase API (HTTPS via Kong)
- `5432`: PostgreSQL direct access (via Supavisor pooler)
- `6543`: PostgreSQL transaction pooler

## Running

```bash
docker compose up -d      # or: make docker-up
```

This is a large stack (13 containers). First boot pulls several GB of images
and can take a few minutes before Kong/Studio answer on port 8000. Poll with:

```bash
curl -sf -o /dev/null -w '%{http_code}\n' http://localhost:8000   # 401 = Kong up
```

Studio is served through Kong behind HTTP basic auth. Open
<http://localhost:8000> and log in with the dashboard credentials
(`DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD`, default `supabase` / `supabase`).

Ports:

- `8000` — Supabase API + Studio (HTTP via Kong)
- `5432` — PostgreSQL direct (via Supavisor)
- `6543` — PostgreSQL transaction pooler

### Reset

This stack uses **named Docker volumes** (`db-config`, `deno-cache`) in
addition to `.docker/`. A full reset therefore needs `-v`:

```bash
docker compose down -v     # remove containers AND named volumes
docker compose up -d
```

## Notes

- **`VAULT_ENC_KEY` must be exactly 32 bytes.** Supavisor encrypts tenant
  secrets with AES-256-GCM, which rejects any other key length with
  `Unknown cipher or invalid key size` and crash-loops. The sandbox default
  (`.env` and the compose fallback) is a 32-char key for this reason.
- **`functions` (edge runtime) crash-loops in the default sandbox** because
  no `main` edge function is mounted under `.docker/functions/main`. It is
  independent — nothing depends on it, and Studio/API work without it. Drop a
  `main/index.ts` into `.docker/functions/` if you need edge functions.

## Usage

```bash
make docker-up
```

## Access

- Dashboard: http://localhost:8000 (login: `supabase` / `supabase`)
- REST API: http://localhost:8000/rest/v1/
- Auth API: http://localhost:8000/auth/v1/
- Storage API: http://localhost:8000/storage/v1/

## Configuration

Key settings in `.env`:

- `POSTGRES_PASSWORD`: Database password
- `JWT_SECRET`: JWT signing secret (min 32 chars)
- `ANON_KEY` / `SERVICE_ROLE_KEY`: API keys (JWTs signed with JWT_SECRET)
- `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD`: Dashboard login credentials

The default `.env` includes working demo JWT keys from the Supabase documentation. For production use, generate new keys following the [self-hosting guide](https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys).

Data is persisted in `.docker/` subdirectories (db, storage, functions, snippets).
