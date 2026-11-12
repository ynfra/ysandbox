# Sourcebot

Self-hosted code search (Zoekt trigram index) with repo sync from a code host,
a REST API, "Ask" (LLM answers) and an MCP server. Pinned to **v5.1.16**.

## Usage

```bash
# from the lab root
docker compose --profile sourcebot up -d sourcebot sourcebot-postgres sourcebot-redis sourcebot-mcp sourcebot-proxy
open http://localhost:4330                       # web UI, anonymous access
curl -s http://localhost:4330/api/repos | python3 -m json.tool | grep -E 'repoName|indexedAt'
curl -s http://localhost:4330/api/search -X POST -H 'content-type: application/json' \
  -d '{"query":"create repo:zustand","matches":5}'
docker compose stop sourcebot sourcebot-mcp sourcebot-proxy sourcebot-postgres sourcebot-redis
```

## MCP

`http://localhost:4330/mcp`, Streamable HTTP, **no auth** (anonymous access).
Tools: `search_code` (args `query`, `useRegex`, `filterByRepos`, ...), `list_repos`,
`read_file`, `list_tree`, `list_commits`, `list_language_models`, `ask_codebase`.
Repo names look like `forgejo:3000/lab/zustand`.

```bash
curl -s localhost:4330/mcp -X POST -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_code","arguments":{"query":"create","filterByRepos":["forgejo:3000/lab/zustand"]}}}'
```

## Services

| Service | Port | Description |
|---|---|---|
| `sourcebot` | internal 3000 | web + backend + Zoekt (one image) |
| `sourcebot-postgres`, `sourcebot-redis` | internal | required state and job queue |
| `sourcebot-mcp` | internal 8000 | `@sourcebot/mcp@1.0.18` (stdio) wrapped by supergateway 4.2.1 |
| `sourcebot-proxy` | **4330** | nginx: `/mcp` to the gateway, everything else to Sourcebot |

## Auto-update

`config.json` has a `gitea` connection (`http://forgejo:3000`, org `lab`; repos
are public so no token) and `settings.resyncConnectionIntervalMs` /
`reindexIntervalMs` = 60 s. Sourcebot fetches from Forgejo itself, so a push
reaches the index within about a minute; no git-sync notify URL is needed.

## Language model

`config.json` `models`: provider `openai-compatible`, `http://litellm:4000/v1`,
model `chat`, key from `LAB_KEY` (default `sk-codebase-lab`). Listed by
`GET /api/models`.

## Licence and plan gotchas (verified 2026-11)

- Core is MIT-style open source (`ee/` directories carry a separate licence).
  v6 free "Basic" plan: max 5 active users, needs an **emailed activation code**.
- **v6.0.x is not usable unattended:** without activation, search, Ask, REST and
  MCP all return 403 `DEPLOYMENT_RESTRICTED`, and anonymous access was removed.
  Hence the v5 pin.
- **v5.1.16 unlicensed:** web search, REST `/api/search`, `/api/repos` work
  anonymously (`FORCE_ENABLE_ANONYMOUS_ACCESS`). The built-in `/api/mcp` and
  **Ask are blocked** ("requires a paid subscription" / "not available in your
  current plan"), so the lab uses the standalone `@sourcebot/mcp` wrapper, whose
  `ask_codebase` tool therefore returns 403. Ask is not testable locally without a licence.
- To try v6: bump the image tag, drop `FORCE_ENABLE_ANONYMOUS_ACCESS`, sign up at
  `/signup`, activate under Settings > License, create an API key, and use
  `http://localhost:4330/api/mcp` with `Authorization: Bearer <key>`.
- `SOURCEBOT_ENCRYPTION_KEY` must be exactly 32 characters.
- First start of `sourcebot-mcp` downloads npm packages (needs internet).

## Resources observed

Idle with zustand + react syncing: sourcebot ~0.8 GB, mcp ~0.1 GB, postgres
~40 MB, redis/nginx ~10 MB each. zustand indexed within about 2 minutes of start.

See [../../AGENTS.md](../../AGENTS.md) for lab conventions.
