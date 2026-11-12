# codewiki

[CodeWiki](https://github.com/FSoft-AI4Code/CodeWiki) (FSoft-AI4Code, MIT, Python): builds a dependency
graph with tree-sitter, then has an LLM write a Markdown wiki (`overview.md`, one page per module,
`module_tree.json`). `generate --update` refreshes only what changed. Pinned to tag **v2.0.0**
(2026-09-18, the only real release; `main` moves daily). Its `pyproject` depends on a branch of
`coding-agent-wrapper`; the Dockerfile rewrites that to commit `9ec22af`.

## Usage (from the lab root)

```bash
docker compose --profile codewiki build codewiki-index
# generate docs (LLM, slow): output .docker/codewiki/<repo>/
docker compose --profile codewiki run --rm codewiki-index /gen.sh zustand
# extra codewiki flags go after the repo, e.g. a smaller, faster run
docker compose --profile codewiki run --rm codewiki-index /gen.sh zustand --max-depth 1 --max-tokens 2048
# serve MCP (one repo, CODEWIKI_REPO, default zustand) + auto-update hook
docker compose --profile codewiki up -d --wait codewiki codewiki-hook
# stop (by name, never by profile)
docker compose stop codewiki codewiki-hook
```

`codewiki generate` has no path argument: it runs in the cwd, so `gen.sh` does `cd /repos/<repo>`.

## LLM wiring

`entrypoint.sh` runs `codewiki config set --provider openai-compatible --base-url http://litellm:4000/v1
--api-key sk-codebase-lab --main-model chat --cluster-model chat --fallback-model chat` on every start
(`CODEWIKI_NO_KEYRING=1`, config in the container's `~/.codewiki`). Override the model with `CODEWIKI_MODEL`.

## MCP

`http://localhost:4380/mcp`, Streamable HTTP, no auth. `codewiki mcp` is stdio, wrapped by supergateway 4.2.1
with `--stateful` (required: without it every request spawns a fresh process and `session_id`s from
`analyze_repo` are lost). Send `initialize` first and echo the `Mcp-Session-Id` header.

Upstream's MCP mode is **IDE-driven**: the tools use no LLM, the calling agent writes the docs.
Tools: `analyze_repo(repo_path, output_dir?)`, `read_code_components(session_id, component_ids)`,
`get_prompt(prompt_type)`, `save_module_tree`, `get_processing_order`, `write_doc_file`, `edit_doc_file`,
`close_session`, plus legacy `generate_docs(repo_path, output_dir?)` (runs the LLM pipeline, blocks) and
`get_module_tree(repo_path, output_dir?)`. **There is no search or question tool**, so this tool does not
answer "where is X" over MCP. bench.json points `search` at `analyze_repo` only as a placeholder; its result
is a component summary, not a ranking.

Verified: `analyze_repo` on `/repos/zustand` returns in ~1.5 s (144 components, 85 leaf nodes); `read_code_components`
and `close_session` work in the same session. Paths in tool args are container paths (`/repos/<name>`).

## Auto-update

`codewiki-hook` (`hook.py`, internal port 8080) takes git-sync's `POST {"repo": ...}`; when the repo equals
`CODEWIKI_REPO` it runs `codewiki generate --update` (a full build if no `metadata.json` exists yet).
Enable with `SYNC_NOTIFY_URLS=http://codewiki-hook:8080/ docker compose up -d git-sync`. `GET` shows the last
run. The hook path was only checked for health (`GET`), not end to end, because no build finished.

## Observed (zustand, 144 components, ~15.6k prompt tokens)

- Image build ~4 min, 439 MB. RAM: codewiki MCP 197 MB, hook 11 MB, generator 160 MB (the model lives in Ollama, ~2.5 GB).
- Dependency analysis 1.1 s. 85 leaf nodes fit the 36 369-token threshold, so no clustering: **whole-repo mode**,
  one agent run that writes the single page.
- **Generation did not finish in 45 min** (aborted, 0 pages written; only `module_tree.json` and `temp/`).
  The 3B CPU model got one huge agent request. Ollama's `n_ctx` is 2048 here, so a 15k-token prompt is truncated,
  and the output budget (`--max-tokens` 32768) lets it ramble. Ollama was also shared with other tools indexing.
- Quality: not measurable (no page). Expect poor results from a 3B model with a 2k context.
- React estimate: CodeWiki scales with module count (clustering, one agent per leaf module plus parents). React has
  thousands of components, so tens to hundreds of LLM calls each far larger than zustand's; at zustand's observed
  pace (>45 min for one call) this is days on CPU. Not run. Use a GPU/hosted `chat` model, raise Ollama `num_ctx`.

## Gotchas

- `codewiki mcp` writes `<repo>/.codewiki/sessions/` into the repo, so the MCP service mounts `/repos` read-write
  and dirties the git-sync clone (`git status` shows `.codewiki/`). `close_session` removes the session, not the folder.
- One MCP/hook repo at a time (`CODEWIKI_REPO`).
- Needs `git config safe.directory '*'` (done in the entrypoint) since repos are owned by another uid.
- Lab Ollama context (2048) is far below CodeWiki's design (tens of thousands of tokens).
