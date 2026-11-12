# OpenDeepWiki (DeepWiki-style wiki + chat + MCP)

[AIDotNet/OpenDeepWiki](https://github.com/AIDotNet/OpenDeepWiki) v2.0.6
(2026-09-08, MIT). Clones a repo, has an LLM write a structured wiki
(catalog, then one page per catalog item), and serves it through a Next.js UI,
a chat assistant and repo-scoped MCP endpoints. SQLite, .NET 10 backend.

**Status in this lab: wiring works, wiki generation does NOT complete on the
default `qwen2.5-coder:3b` / 2048-token Ollama.** See "Observed" and "Gotchas".

## Usage

```bash
# from the lab root (codebase-lab/); first build ~2.5 min (backend + web)
docker compose --profile opendeepwiki up -d --build --wait opendeepwiki opendeepwiki-web
tools/opendeepwiki/odw.sh add zustand        # submit lab/zustand from Forgejo
tools/opendeepwiki/odw.sh status zustand     # Processing | Completed | Failed
# stop (by name, never by profile: that would also stop forgejo/litellm/ollama)
docker compose stop opendeepwiki opendeepwiki-web
```

| What | Where |
|---|---|
| Web UI | http://localhost:4371 (admin: `admin@routin.ai` / `Admin@123`, seeded; sandbox only) |
| API + MCP | http://localhost:4370 (`/health`, `/api/...`, `/api/mcp/...`) |
| State | `.docker/opendeepwiki/` (SQLite `opendeepwiki.db` + clones under `<org>/<repo>/branches/<branch>/tree`) |

## Adding a repo

UI: sign in, "Add repository", Git URL `http://forgejo:3000/lab/<name>.git`,
org `lab`, repo `<name>`, branch `main`, language `en`, public.

API (what `odw.sh add` does; the Forgejo repos are public, so no git creds):

```bash
TOK=$(curl -s -X POST localhost:4370/api/auth/login -H 'content-type: application/json' \
  -d '{"email":"admin@routin.ai","password":"Admin@123"}' | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
curl -X POST localhost:4370/api/v1/repositories/submit -H "authorization: Bearer $TOK" \
  -H 'content-type: application/json' -d '{"gitUrl":"http://forgejo:3000/lab/zustand.git",
  "orgName":"lab","repoName":"zustand","branchName":"main","languageCode":"en","isPublic":true,"generateSkill":false}'
curl 'localhost:4370/api/v1/repositories/list?page=1&pageSize=50'   # public; statusName
```

Statuses: `Pending` -> `Processing` -> `Completed` | `Failed`. A failed repo can
be regenerated from the UI (`POST /api/v1/repositories/regenerate`).

`react` was deliberately NOT added. Cost estimate: zustand has ~90 tracked
files in the catalog prompt; react has thousands. Expect a catalog of 20-40
pages, each page being 6-14 LLM turns with tool calls, so hundreds of calls
at 5-20 s each on the 3B model: many hours, and the 2048-token context would
truncate every prompt. Not viable without a hosted or GPU model.

## MCP

Streamable HTTP, **stateful** (`Mcp-Session-Id` header after `initialize`).

- Repo-scoped: `http://localhost:4370/api/mcp/{owner}/{repo}`, e.g. `/api/mcp/lab/zustand`
  (also `/api/mcp?owner=lab&name=zustand`)
- Unscoped: `http://localhost:4370/api/mcp`
- No auth needed in the lab (OAuth only if `GOOGLE_CLIENT_ID` is set); `MCP_ENABLED=false` turns it off.

Tools (verified with `tools/list`): scoped adds `search_doc` (substring search
over wiki pages, then an LLM summary), `read_file`, `get_repo_structure`;
both: `search_docs`, `search_repositories`, `read_doc`, `list_repositories`.
`search_doc` is the "answer a question" tool, but its retrieval is a SQL
`LIKE %whole query%` over generated pages, so a natural-language sentence
rarely matches; short keywords work better. It returns `matchCount: 0` until a
wiki exists.

## Auto-update

Built in, no git-sync hook needed. The `IncrementalUpdateWorker` polls every
30 s (`IncrementalUpdate__PollingIntervalSeconds`) and re-checks each
**Completed** repo every `OPENDEEPWIKI_UPDATE_MINUTES` (default 5; upstream
default 60, hard floor `MinUpdateIntervalMinutes`, set to 1 here). On a new
commit on the cloned branch it re-fetches from Forgejo and regenerates only
changed pages. Manual trigger:
`POST /api/v1/repositories/{repoId}/branches/{branchId}/incremental-update`.
Not verified end to end here, because no wiki reached Completed.

## LLM wiring

LiteLLM `chat` (`http://litellm:4000/v1`, key `sk-codebase-lab`) for catalog,
content and chat, set through `WIKI_CATALOG_*`, `WIKI_CONTENT_*`, `ENDPOINT`.
Env seeds a provider row in SQLite on first boot; after that the DB wins, so
change models in the admin UI (Settings) or `PUT /api/admin/settings`. Some
options (e.g. `WIKI_PARALLEL_COUNT`, default 5) are DB-only and ignore env;
this lab sets it to 1 through that PUT (not persisted in compose). No embeddings
are used (`embed` is not needed). `WIKI_LANGUAGES=en` avoids 12x translation.

## Observed (zustand, qwen2.5-coder:3b on shared CPU Ollama)

- Build: 2m35s (backend 1.3 GB image incl. python graphifyy, web 1.9 GB).
- RAM idle: backend ~125-145 MB, web ~8-45 MB. Ollama dominates (2.5 GB, ~800% CPU).
- Wiki generation: catalog step ran 35 min, then **Failed**: "Catalog generation
  completed without producing any catalog items". 0 pages. Ollama logged
  `truncating input prompt limit=2050 prompt=6814`: the catalog prompt (~6.8k
  tokens) is cut to 2k, and the 3B model never emits the expected tool calls.
  Ollama was also shared with other tools' embed jobs (4-9 min each), which
  queued our requests (one model slot).
- UI and MCP otherwise respond (UI 200, MCP tools list, `search_doc` returns an
  empty result).

## Gotchas

- Needs a context window of at least ~8k and a model that follows tool calls.
  Set `OLLAMA_CONTEXT_LENGTH=16384` on the lab `ollama` service (root change)
  and use a bigger chat model, or point LiteLLM `chat` at a hosted model.
- Upstream images exist only on an Aliyun registry (floating tag), so both are
  built from git tag `v2.0.6`. The upstream web Dockerfile fails
  (`npm install` arborist error, no lockfile); `web.Dockerfile` here installs
  with pinned bun from the repo's `bun.lock` instead.
- Default admin password and JWT secret are lab-only values.
- Backend runs as root in the container (upstream default) to write `/data`.
- Compose `include` fails everywhere if any sibling tool's compose.yml is
  mid-edit; `docker compose -p codebase-lab -f tools/opendeepwiki/compose.yml --profile opendeepwiki ...`
  works standalone on the same network.

## Licence

OpenDeepWiki: MIT. Pulls Python `graphifyy` into the backend image (optional
Graphify artifacts, off unless configured). Enterprise tier is a paid upsell,
the open code has no feature gate relevant here.
