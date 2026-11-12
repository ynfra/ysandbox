# ygitbox — Agent Guide

POC of the ygitbox MCP server (Bun + TypeScript in `app/`) plus a local Forgejo.
Read `../AGENTS.md` for ysandbox rules. Design rationale is in the proposal
artifact; this file is procedure.

## Golden rules

- **One write path.** Every content change goes through `writeFiles()` in
  `changes.ts`: policy decision, path/size/secret checks, compare-and-swap on
  the parent commit, push, retry. New tools build `WriteOp[]` and call it; never
  push from anywhere else. Merges and reverts are the only other writers.
- **Git is plain git; the provider is bookkeeping.** `git.ts` works on any
  remote. `providers/` only opens/updates PRs, comments, statuses and reads
  native reviews. A new forge = implement `GitProvider` (mapping table at the
  top of `providers/types.ts`) and add it to `providerFor`.
- **We merge, the forge records.** `mergeChange` squashes with
  `git merge-tree` + `commit-tree` so the commit author is the change author,
  pushes to main, then calls `markMerged` (Forgejo: `manually-merged`). Repos
  therefore need "allow manual merge" on and the bot on the push allowlist.
- **Identity never comes from tool input.** Users come from IdP userinfo or the
  admin CLI. Effective scope = role (`repos.yaml`) ∩ token scopes ∩ token repos.
  Tools a caller cannot use are not registered at all.
- **Server floor beats repo policy.** `FLOOR_READONLY` in `policy.ts` (policy
  file, CI config, CODEOWNERS, .gitmodules, .gitattributes) is never writable.
- **Repo content is untrusted.** Read results are wrapped by `fence()` in
  `tools.ts`; keep that for any new tool that returns repo text.
- **Every read honours `deny`.** Any tool that returns paths, content or diffs
  filters through `readable()` / `assertReadable()` first (diffs pass only the
  allowed paths to git). Drafts are private to their author: reach a change
  only through `loadChange`, never by branch name or raw sha.
- **Approvals are per rule.** `combine()` returns one `ReviewGroup` per policy
  rule a change touches; `progress()` requires each group on its own. Never
  merge reviewer lists.
- **Policy fails closed.** `normalise()` throws on anything malformed;
  `loadPolicy` then keeps the last good policy, or locks the repo (`deny`).

## Layout

| File | Role |
|---|---|
| `src/server.ts` | HTTP routes, stateless MCP per request, 401 + OAuth discovery, rate limit |
| `src/oauth.ts` | OAuth 2.1 AS (DCR, PKCE, consent with repo choice, refresh rotation), `/tokens` page |
| `src/auth.ts` | Roles, scopes, token issue/lookup |
| `src/changes.ts` | Change lifecycle, `writeFiles`, approvals, merge, revert, draft expiry |
| `src/git.ts` | Bare mirror, plumbing commits (temp index), `merge-tree`, non-forced push |
| `src/policy.ts` | `.ygitbox/policy.yaml` parsing, path decisions, strictest-wins combine |
| `src/validators.ts` | Path, size, secret scan, SKILL.md lint |
| `src/skills.ts` | Skills pack on top of `writeFiles` |
| `src/tools.ts` | Tool catalog, groups, `X-MCP-Tools-Only/Except`, audit wrapper |
| `src/cli.ts` | `token`, `revoke`, `audit` |
| `scripts/bootstrap.sh` | Seeds Forgejo; writes `.docker/ygitbox.env` |

## Working here

```bash
cd app && bun install && bunx tsc --noEmit      # typecheck (includes tests)
YGITBOX_DATA_DIR=$(mktemp -d) bun test test/unit.test.ts   # never point unit tests at .docker/
docker compose up -d --build ygitbox            # after code changes
make e2e && (cd app && bun run test/oauth.ts)   # both must pass
docker compose exec ygitbox bun src/cli.ts audit --limit 20
```

## Gotchas

- **Native reviews need an explicit mapping.** Only forge logins listed under
  `native_reviewers` in `repos.yaml` count; forge emails are not verified.
- **Paths are strict:** no control characters, backslashes or segments starting
  with `-`. Git plumbing input is NUL-terminated; keep it that way.
- **git ≥ 2.40 in the image** (`merge-tree --merge-base` for revert). Bun image
  version must match the host Bun that wrote `bun.lock` (currently 1.4.4).
- **Bare repo, no work tree:** deletions use `update-index -z --index-info`
  with mode 0; `--force-remove` fails without a work tree.
- **Implicit drafts:** a write without `change_id` goes into the caller's most
  recently updated open draft in that repo, including one opened with
  `start_change`. Pass `change_id` to keep edits apart.
- **Re-submitting** an already submitted change is allowed and refreshes checks
  and the PR. An author push after approval resets approvals to zero.
- **Two URLs for the IdP:** the browser uses `localhost:3300`, the container
  uses `forgejo:3000`; see the `YGITBOX_OIDC_*` env in `docker-compose.yml`.
- **Single process holds the write lock.** Replicas are safe for correctness
  (pushes are compare-and-swap) but will retry more; the SQLite DB is
  per-instance, so real multi-replica needs Postgres first.
