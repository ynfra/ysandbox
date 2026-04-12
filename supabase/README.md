# Supabase

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
