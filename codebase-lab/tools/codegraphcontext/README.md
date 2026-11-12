# CodeGraphContext

[CodeGraphContext](https://github.com/CodeGraphContext/CodeGraphContext) (MIT,
Python, PyPI `codegraphcontext` 0.6.13) parses code with tree-sitter into a
graph (functions, classes, CALLS, imports) stored in FalkorDB. No LLM is
needed to index. MCP on `http://localhost:4360/mcp` (Streamable HTTP).

## Services (profile `codegraphcontext`)

| Service | Role |
|---|---|
| `codegraphcontext-db` | `falkordb/falkordb:v4.14.10`, AOF persistence in `.docker/codegraphcontext/db` |
| `codegraphcontext` | supergateway 4.2.1 wrapping `cgc mcp start` (stdio), port 4360 |
| `codegraphcontext-index` | one-shot `cgc index` |
| `codegraphcontext-watch` | `cgc watch --poll` on `WATCH_REPOS` (`CGC_WATCH_REPOS`, default `zustand`) |

Backend choice: the default embedded FalkorDB Lite / Kuzu allow one process, but
index, watch and MCP run as separate containers, so a shared FalkorDB server
(`DEFAULT_DATABASE=falkordb-remote`) is the simplest thing that works.
Upstream has no usable Docker Hub image (`codegraphcontext/codegraphcontext`
does not exist), so `Dockerfile` pins the PyPI release; first build is slow (~6 min, large deps).

## Usage

```bash
docker compose --profile codegraphcontext up -d --wait codegraphcontext
docker compose --profile codegraphcontext run --rm codegraphcontext-index /repos/zustand
# CLI queries
C="docker compose --profile codegraphcontext run --rm --entrypoint cgc codegraphcontext-index"
$C list
$C find name createStore
$C analyze callers <function>
$C query "MATCH (f:Function) RETURN f.name LIMIT 5"
# keep it fresh
docker compose --profile codegraphcontext up -d codegraphcontext-watch
# stop (never `--profile ... stop`: that also stops the core services)
docker compose stop codegraphcontext codegraphcontext-db codegraphcontext-watch
```

## MCP

`http://localhost:4360/mcp`, no auth. Tools: `find_code` (best "where is X":
name and content match, returns source), `analyze_code_relationships`,
`execute_cypher_query`, `add_code_to_graph`, `watch_directory`,
`unwatch_directory`, `list_watched_paths`, `list_indexed_repositories`,
`get_repository_stats`, `check_job_status`, `list_jobs`, `find_dead_code`,
`calculate_cyclomatic_complexity`, `find_most_complex_functions`,
`generate_report`, `delete_repository`, `visualize_graph_query`, `load_bundle`,
`search_registry_bundles`, `discover_codegraph_contexts`, `switch_context`,
`list_graphs`, `add_package_to_graph`, `simulate_metrics`,
`simulate_architectural_change`, `analyze_architectural_evolution`,
`find_java_spring_*`, `find_datasource_nodes`.

## Auto-update

`codegraphcontext-watch` polls `/repos/<name>` (git-sync pulls into it), so a
push to Forgejo reaches the graph without a manual step. It only attaches to
repos listed in `CGC_WATCH_REPOS`; a watched path that is not yet indexed gets
indexed on start. Watch starts "attach only": changes made while it was down
need `cgc watch --sync-on-start` or a re-index. Polling interval was not
tuned; deletion/move handling is upstream's.

## Observed (zustand, 125 files)

- Index: 11.9 s in-tool (13.5 s wall), 331 functions, 3199 CALLS edges.
- RAM idle after zustand: db ~120 MB, MCP ~78 MB, watch ~88 MB. React will
  grow the db; index process memory not measured on React.
- Disk: small (MBs).

## Gotchas

- `--profile codegraphcontext stop` also stops core services; name services.
- `analyze callers create` returned nothing; name must match a Function node
  exactly (`find name` first). CALLS are resolved heuristically (the index
  reports `ambiguous_function_target` warnings).
- `find name` mixes Import and Variable nodes with functions.
- Index CLI prints a long warning table on stdout; harmless.
- Indexing the markdown/yaml files counts as scanned "generic" files.
