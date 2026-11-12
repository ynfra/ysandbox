# graphify (baseline graph tool)

Tree-sitter code knowledge graph served over MCP. **No LLM at index time**
(`graphify update`), no embeddings. Same tool as production
(`ydocker/graphify`), adapted to the lab. Build pinned to **v0.9.99**
(2026-10-30; v0.9.35 from ydocker is from 2026-08-06, and the `v1.0.0` tag is
older than both, so pick by release date, not number).

## Usage (from the lab root)

```bash
# index (LLM-free, incremental). zustand: ~2 s, 1182 nodes / 1484 edges
GRAPHIFY_REPO=zustand docker compose --profile graphify run --rm graphify-index update /repos/zustand
# serve that repo
GRAPHIFY_REPO=zustand docker compose --profile graphify up -d --wait graphify graphify-hook
docker compose stop graphify graphify-hook   # by name: --profile stop also stops the core
```

One `graph.json` per server, so one repo is served at a time: `GRAPHIFY_REPO`
(default `zustand`) selects `.docker/graphify/<repo>/`. To switch, index the
other repo with `GRAPHIFY_REPO=react ...` and recreate the server with the same
variable (the hook only follows the same variable). Output (`graph.json`,
`graph.html`, `GRAPH_REPORT.md`, `cache/`) lives there; delete to reset.

## MCP

- URL `http://localhost:4390/mcp`, Streamable HTTP, header `Authorization: Bearer lab-graphify`
  (fixed lab key, override with `GRAPHIFY_API_KEY`). Needs `initialize` and the `mcp-session-id` header.
- Tools: `query_graph` (arg `question`; BFS subgraph, ~2000-token budget, raise `token_budget`
  or use `context_filter`), `get_node`, `get_neighbors`, `get_community`, `god_nodes`,
  `graph_stats`, `shortest_path`, `list_prs`, `get_pr_impact`, `triage_prs`.
- Best search: `query_graph`. It returns graph nodes with `src=path`, not prose.

## Auto-update

graphify has no watcher. `graphify-hook` (`hook.py`, stdlib, internal port 8080)
accepts git-sync's `POST {"repo": ...}` and, when the repo equals `GRAPHIFY_REPO`,
re-runs the incremental `graphify update`. Enable it by starting the lab with:

```bash
SYNC_NOTIFY_URLS=http://graphify-hook:8080/ docker compose up -d git-sync
```

`GET` on the hook shows the last run. Not verified: whether the running server picks up
the rewritten `graph.json`; if it serves stale data, `docker compose --profile graphify restart graphify`.

## Differences from ydocker/graphify

- Serves one selectable repo (`GRAPHIFY_REPO`), not a single fixed `/data`.
- Fixed key `lab-graphify` in compose; no `.env`.
- Tag v0.9.99 instead of v0.9.35.
- Added `graphify-hook` for auto-update; production has none.
- Repos come from git-sync (`.docker/repos`), not `graphify/repos`.
- Semantic (LLM) pass not configured; only `update` is used.
