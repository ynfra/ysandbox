# codebase-memory-mcp

[DeusData/codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp)
(MIT, C, single static binary, pinned v0.12.1). Builds a persistent code
knowledge graph (SQLite, tree-sitter, 160+ languages) with call graph, BM25
and optional semantic search. Port **4340** (MCP). No LLM at index time.

## Usage

```bash
docker compose --profile codebase-memory-mcp up -d --build codebase-memory-mcp
docker compose --profile codebase-memory-mcp run --rm codebase-memory-mcp-index /repos/zustand
# project name is "repos-<repo>" (derived from the path)
docker compose run --rm --entrypoint codebase-memory-mcp codebase-memory-mcp \
  cli search_graph --project repos-zustand --query "create store"
docker compose stop codebase-memory-mcp    # never `--profile ... stop`: that stops core too
```

Index state: `.docker/codebase-memory-mcp` (about 5 MB for zustand).

## MCP

`http://localhost:4340/mcp` (Streamable HTTP via supergateway 4.2.1, stateless:
one stdio child per request). Every graph tool needs `project` (`repos-zustand`).

Tools: `index_repository`, `search_graph`, `query_graph` (Cypher), `trace_path`,
`get_code_snippet`, `get_file_outline`, `get_graph_schema`, `compare_graphs`,
`get_architecture`, `search_code`, `list_projects`, `delete_project`,
`index_status`, `check_index_coverage`, `detect_changes`, `manage_adr`,
`ingest_traces`.

## Auto-update

The tool's own watcher only follows live MCP sessions (project = session cwd),
which a stateless gateway never keeps. So `watch.sh` (container entrypoint)
polls git HEAD of every repo indexed once (`/data/heads/<name>`) every
`WATCH_INTERVAL` (60 s) and re-runs `index.sh`. Verified by forcing a HEAD
mismatch. Repos never indexed are ignored (react is not indexed by default).

## Models

No external model. Semantic search (`semantic_query`) uses a nomic-embed-code
embedding compiled into the binary; no Ollama or LiteLLM needed.

## Observed

zustand full index: about 2-5 s (1025 nodes, 1731 edges), idle container
about 72 MiB RAM.

## Gotchas

- `project` is required on all queries; name is `repos-<dir>`.
- Image uses the `-portable` linux release (static); asset chosen per `TARGETARCH`, checksums pinned.
- Raw-JSON CLI args are deprecated; `index.sh` uses `--repo-path`.
- Built-in graph UI (port 9749) is not exposed: it needs a long-lived daemon.
- Some zustand .ts files report partial parses (best-effort, still indexed).
