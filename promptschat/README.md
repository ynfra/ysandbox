# prompts.chat

Self-hosted [prompts.chat](https://prompts.chat) — a curated prompt library with
community-tested prompts, custom branding, multiple auth providers, and optional
AI-powered semantic search. Next.js app backed by PostgreSQL.

Based on the upstream [`compose.yml`](https://github.com/f/prompts.chat/blob/main/compose.yml)
and [self-hosting docs](https://prompts.chat/docs/self-hosting), using the pre-built
`ghcr.io/f/prompts.chat:latest` image.

## Services

- **app**: prompts.chat Next.js server
- **db**: PostgreSQL 17

## Ports

- `4444`: web UI and API (override with `PORT`)

## Usage

```bash
make docker-up
```

Then open http://localhost:4444.

> First startup runs Prisma migrations against the freshly created database and
> may take a minute — watch `docker compose logs -f app` until the health check
> passes at `http://localhost:4444/api/health`.

### Seed example prompts

```bash
docker compose exec app npx prisma db seed
```

### Admin account

Registration always creates a plain `USER` — there is **no admin account by
default** and no "first user becomes admin" logic. Grant admin to an account
you registered by flipping its role in the database:

```bash
docker compose exec db psql -U prompts -d prompts \
  -c "UPDATE users SET role='ADMIN' WHERE username='<your-username>';"
```

Log out and back in (the role is baked into the JWT at login), then open
http://localhost:4444/admin.

## Sandbox defaults

This stack is preconfigured for a clean, private local instance:

- **No upstream marketing.** `PCHAT_NAME` is set, which flips the app into
  `useCloneBranding` mode — hiding the announcement banner, the App Store
  banner, the hero marketing headlines, the achievements strip, and the
  sponsors / "CLIENTS" block.
- **Local login.** Only the `credentials` provider is enabled and public
  registration is open, so you can sign up with an email + password directly
  (no GitHub/Google/Apple OAuth). Create the first account via **Register**.
- **Auth.js URL handling.** By default Auth.js derives its base URL from the
  container bind address (`0.0.0.0:3000`) — it rejects the forwarded host with
  `UntrustedHost` and sends login/logout redirects to the wrong port. This
  stack fixes that by pinning `AUTH_URL=http://localhost:4444`, setting
  `AUTH_TRUST_HOST=true`, and running the app on the **same** port it publishes
  (`PORT=4444`, mapped `4444:4444`) so external, internal and auth URLs all
  agree. If you browse via a different host/port, set `AUTH_URL` and `PORT` to
  match.
- **Telemetry off.** Google Analytics, AdSense and Sentry only activate when
  their env vars are present; none are set here. (The bottom "cookies for
  analytics" consent bar still renders — it's hardcoded in the app with no env
  toggle — but nothing is tracked behind it.)

## Configuration

All branding/theme/feature options are set at runtime via `PCHAT_*` environment
variables (no rebuild needed) — see the commented block in `docker-compose.yml`
and the [full table in the upstream docs](https://github.com/f/prompts.chat/blob/main/DOCKER.md#configuration-variables).

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Host port | `4444` |
| `POSTGRES_PASSWORD` | Database password | `prompts` |
| `AUTH_SECRET` | Auth token secret — **set explicitly for anything but local** | sandbox placeholder |
| `AUTH_URL` | Public base URL Auth.js uses for redirects | `http://localhost:4444` |
| `PCHAT_NAME` | App name; setting it also disables upstream branding | `prompts.chat` |
| `PCHAT_AUTH_PROVIDERS` | `github,google,credentials` | `credentials` |
| `PCHAT_ALLOW_REGISTRATION` | Allow public sign-up (credentials only) | `true` |
| `PCHAT_FEATURE_AI_SEARCH` | Enable AI search (needs `OPENAI_API_KEY`) | `false` |

Generate a real secret for non-local use:

```bash
export AUTH_SECRET=$(openssl rand -base64 32)
docker compose up -d
```

Database data is persisted in `.docker/db/` (gitignored).
