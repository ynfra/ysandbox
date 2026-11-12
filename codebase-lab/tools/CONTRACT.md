# Tool contract

Every indexer under `tools/<tool>/` follows this, so `make tool-up`, the
benchmark and the README treat them all the same.

## Files

```
tools/<tool>/
  compose.yml    # services, all behind `profiles: ["<tool>"]`
  Dockerfile     # only if upstream ships no usable image
  bench.json     # how the benchmark indexes, queries and measures it
  README.md      # what it is, CLI usage, MCP endpoint and tools, auto-update, gotchas
```

Rules:

- **Edit only your own `tools/<tool>/`.** The root `docker-compose.yml`
  already includes your `compose.yml`.
- **Paths in `compose.yml` are relative to `tools/<tool>/`**, not the lab
  root (Compose `include` semantics). Runtime state goes under
  `../../.docker/<tool>/`. Repos are at `../../.docker/repos/<name>`; mount
  them at `/repos` read-only unless the tool must write there.
- **Pin every image and every upstream git ref.** No `latest`, no `main`.
- **Service names start with `<tool>`**; every service has
  `profiles: ["<tool>"]`.
- **No Docker socket mounts.**
- **Stop by service name, never by profile.** `docker compose --profile
  <tool> stop` also stops the core (forgejo, litellm, ollama, git-sync),
  because services without a profile are always active.

## Shared services (default compose network)

| What | Inside the network | From the host |
|---|---|---|
| Forgejo (git provider) | `http://forgejo:3000`, org `lab` | `http://localhost:4310`, `labadmin` / `labpassword123` |
| Forgejo API token | file `.docker/forgejo-token` (lab root) | same |
| Synced working copies | `/repos/<name>` via your mount | `.docker/repos/<name>` |
| git-sync | `http://git-sync:8080/status`, `NOTIFY_URLS` env | `http://localhost:4311/status` |
| LiteLLM (OpenAI-compatible) | `http://litellm:4000/v1`, key `sk-codebase-lab`, models `chat`, `embed` (768 dims) | `http://localhost:4320/v1` |
| Ollama native API (only if the tool cannot speak OpenAI) | `${OLLAMA_BASE_URL:-http://ollama:11434}`, models `${CHAT_MODEL:-qwen2.5-coder:3b}`, `${EMBED_MODEL:-nomic-embed-text}` | `http://localhost:4322` |

Repos: `zustand` (small, use it to verify) and `react` (large, benchmark only).

## MCP

Expose **Streamable HTTP** on your assigned host port. Stdio-only servers are
wrapped with supergateway (`--outputTransport streamableHttp`), pinned.

## Auto-update

A push to Forgejo must reach your index without a manual step. Use, in order
of preference: the tool's own git sync from Forgejo, its own file/git watcher
on `/repos/<name>`, or an HTTP endpoint that git-sync can call (document the
URL to add to `SYNC_NOTIFY_URLS`).

## bench.json

Commands run with `sh -c` from the lab root. `{repo}` is replaced by the repo
name, `{query}` by the question text.

```json
{
  "tool": "<tool>",
  "profile": "<tool>",
  "llm_at_index": false,
  "serve": "docker compose --profile <tool> up -d --wait <tool>",
  "index": {
    "mode": "oneshot",
    "cmd": "docker compose --profile <tool> run --rm <tool>-index /repos/{repo}",
    "ready": null,
    "timeout_s": 7200
  },
  "mcp": { "url": "http://localhost:<port>/mcp", "headers": {} },
  "search": { "tool": "<mcp tool name>", "args": { "query": "{query}" } },
  "containers": ["codebase-lab-<tool>-1"],
  "disk": [".docker/<tool>"],
  "stop": "docker compose stop <tool> <tool>-db"
}
```

`index.mode` is `oneshot` (the benchmark times `cmd`) or `server` (the
benchmark runs `cmd` if set, then polls `ready` until it exits 0). `search`
is the single tool call that best answers "where in the code is X"; the
benchmark checks whether the expected files appear in its result.
