# code-graph-rag

[vitali87/code-graph-rag](https://github.com/vitali87/code-graph-rag) (MIT, Python, CLI `cgr`),
PyPI `code-graph-rag==0.3.13` (released 2026-10-25; 0.4.5 from 2026-10-30 skipped as too fresh).
Tree-sitter parse into a code graph stored in **embedded SQLite** (no Memgraph/Qdrant),
deterministic graph queries without an LLM, plus NL-to-Cypher tools that need one.

## Usage

All from the lab root. Profile `code-graph-rag`; start/stop services BY NAME.

```bash
# index (tree-sitter only, no LLM; ~7 s for zustand). --project-name must be the repo name.
docker compose --profile code-graph-rag run --rm code-graph-rag-index start --repo-path /repos/zustand --project-name zustand --update-graph
# deterministic CLI queries (JSON, no LLM). Always pass -p <project>
docker compose --profile code-graph-rag run --rm -T code-graph-rag-index graph resolve createStore -p zustand
docker compose --profile code-graph-rag run --rm -T code-graph-rag-index stats
# serve MCP + auto-update hook
docker compose --profile code-graph-rag up -d --wait code-graph-rag code-graph-rag-hook
# stop (never `--profile ... stop`, that kills the core)
docker compose stop code-graph-rag code-graph-rag-hook
```

Other CLI: `graph callers|callees|definition|importers|implementors|overrides`, `context`,
`dead-code`, `duplicates`, `check`. `cgr status` looks for Memgraph and reports "stopped"; ignore.

## MCP

`http://localhost:4350/mcp/` (Streamable HTTP, native in `cgr mcp-server --transport http`, no
supergateway). Header `Authorization: Bearer lab-cgr` (upstream refuses a non-loopback bind
without a token; override with `CGR_MCP_TOKEN`). `/mcp` answers 307 to `/mcp/`; use the slash.

Tools (32). **No LLM (pure graph):** `list_projects`, `resolve` (exact name, dotted suffix or
`path:line` to qualified names), `definition`, `callers`, `callees`, `implementors`, `overrides`,
`importers`, `tests_reaching`, `endpoints`, `context`, `get_code_snippet`, `read_file`,
`list_directory`, `find_duplicate_code`, `structural_search`. **Need an LLM:** `query_code_graph`
(NL to Cypher), `ask_agent`. **Need embeddings:** `semantic_search`. Mutating tools
(`write_file`, `rename`, ...) exist but `/repos` is mounted read-only.
Graph tools take `qualified_name` (e.g. `zustand.src.vanilla.createStore`) plus `project`. `resolve` is NOT a keyword search: `persist` or a sentence returns `[]`; use real identifiers.

## Auto-update

`code-graph-rag-hook` (internal :8080) takes git-sync's POST and re-runs the incremental
`cgr start --update-graph` (hash cache, changed files only) for `CGR_REPO` (default zustand).
Add `http://code-graph-rag-hook:8080/` to `SYNC_NOTIFY_URLS` (root change). `cgr watch` is not used:
inotify does not fire through the host bind mount. Verified: POST returns 202, no-op sync rc 0.

## LLM wiring

Native Ollama (`ollama:11434`, `qwen2.5-coder:3b`) for both roles. `litellm_proxy` was tried and
fails: the provider probes LiteLLM `/health`, which pings every backend and times out when Ollama
is busy ("proxy not responding"). Embeddings (`CGR_SKIP_EMBEDDINGS=false`) use LiteLLM `embed`
(768 dims) but are OFF by default so indexing is LLM-free.

## Resources

Idle server ~115 MB RAM; index run is a short Python process. zustand: 2116 nodes, 8124 edges,
~3 MB `graph.sqlite` under `.docker/code-graph-rag`; index 6.7 s sync (~11 s with container start).

## Gotchas

- Index with `--project-name <repo>` and query with `-p <repo>`; otherwise the name is `repo__<pathhash>`.
- One SQLite DB holds all projects; `CGR_REPO` only picks the hook's repo and the server's cwd.
- An NL tool call (`query_code_graph`) blocks the MCP server while the CPU LLM runs; other calls
  queue behind it. Under shared-Ollama load, calls took minutes (a single embed took 8 min).
- Embedding at index timed out (60 s batches); lower `OPENAI_EMBEDDING_BATCH_SIZE` and raise
  `OPENAI_EMBEDDING_TIMEOUT` if you enable it.
- Image builds `python:3.12-slim` + `[treesitter-full,sqlite-vec]` extras (JS/TS grammars need them).
