# ynfra / codebase-lab

Test bench for `ycodebase`: seven open-source code indexers (search, code
graph, wiki) run side by side over the same Git repos and are measured against
plain `git grep`. Everything is self-hosted. Models go only through LiteLLM to
Ollama, and every tool is reachable over MCP.

## Prerequisites

- Docker with about 8 GB free RAM; one tool runs at a time during a benchmark.
- Node 20+ on the host, used for `bench/run.mjs`.
- Optional: Ollama on the Mac. The bundled CPU Ollama only works for small
  models (see Notes).
- Optional, paid: the `claude` CLI, logged in, for `make bench-agent`.

## Usage

```bash
make up                         # Forgejo, Ollama, LiteLLM, git-sync
make seed                       # push repos.txt (zustand, react) into Forgejo org `lab`
make models                     # pull CHAT_MODEL + EMBED_MODEL into Ollama
make tool-up T=codebase-memory-mcp
make bench T=codebase-memory-mcp REPO=react   # index + retrieval; writes bench/results/react/REPORT.md
make bench-all REPO=react       # grep baseline + every tool in BENCH_TOOLS, one by one
```

`make tool-down T=<tool>` stops only that tool's services. Never use
`docker compose --profile <tool> stop`, which also stops the core. Copy
`.env.example` to `.env` to switch models or point at another Ollama.

## Services

| Service | Host port | Index / LLM | Auto-update | Description |
|---|---|---|---|---|
| forgejo | 4310 | — | — | Git provider; `labadmin` / `labpassword123`, org `lab` |
| git-sync | 4311 | — | poll + webhook | Mirrors the `lab` org into `.docker/repos`, then notifies tool hooks; `GET /status` |
| litellm | 4320 | — | — | OpenAI-compatible gateway with models `chat` and `embed`; key `sk-codebase-lab` |
| ollama | 4322 | CPU | — | Fallback; `qwen2.5-coder:3b` + `nomic-embed-text` |
| [sourcebot](tools/sourcebot) | 4330 | zoekt, no LLM | own Forgejo sync | Trigram code search plus web UI; MCP at `/mcp`. v5.1.16 |
| [codebase-memory-mcp](tools/codebase-memory-mcp) | 4340 | tree-sitter + built-in embeddings | `watch.sh` | Single binary that builds a code graph in SQLite; 17 MCP tools |
| [code-graph-rag](tools/code-graph-rag) | 4350 | tree-sitter; LLM only for NL→Cypher | hook | Code graph in SQLite; MCP at `/mcp/` |
| [codegraphcontext](tools/codegraphcontext) | 4360 | tree-sitter + FalkorDB | `cgc watch --poll` | Code graph with 29 MCP tools |
| [opendeepwiki](tools/opendeepwiki) | 4370 / 4371 | LLM-generated wiki | own repo sync | DeepWiki clone; UI on 4371, `admin@routin.ai` / `Admin@123` |
| [codewiki](tools/codewiki) | 4380 | LLM-generated wiki | hook | Architecture docs generator; MCP has no search tool |
| [graphify](tools/graphify) | 4390 | tree-sitter, no LLM | hook | Same tool as `ydocker/graphify`; serves one repo per server |

Each `tools/<tool>/README.md` covers CLI usage, MCP tools and gotchas.
[tools/CONTRACT.md](tools/CONTRACT.md) is how to add another tool.

## Benchmark

`bench/questions.json` holds 20 questions about React v19.3.1, each with its
expected files verified by `git grep`. They come in four groups: lookup, call
graph, architecture and impact. The benchmark has three levels:

- **index**: wall time, peak RAM and disk.
- **retrieval** (free): one MCP search call per identifier (`symbol`) or per
  whole question (`--nl`). It records whether the expected file appears,
  recall, latency and tokens returned.
- **agent** (costs money): `claude -p` answers with Read/Grep/Glob alone, then
  again with the tool's MCP added; Sonnet scores each answer 0–2. Each run is
  capped by `BENCH_MAX_USD`.

Results are in `bench/results/<repo>/REPORT.md`, with grep as the baseline row.

## What is not automated

- **A GPU model.** The CPU Ollama runs a 3B model at about 5 tokens/s, so the
  wiki tools (OpenDeepWiki, CodeWiki) produced 0 pages. Install Ollama on the Mac and run:
  `OLLAMA_CONTEXT_LENGTH=16384 ollama serve`, then
  `ollama pull qwen2.5-coder:14b` (or `qwen3-coder:30b`), and set `OLLAMA_BASE_URL=http://host.docker.internal:11434`
  and `CHAT_MODEL` in `.env`.
- **A Sourcebot licence.** Ask, the built-in MCP and v6 all need activation. The
  lab uses v5.1.16 with the standalone `@sourcebot/mcp`.
- **Claude CLI credentials**, needed only for `make bench-agent`.

## Notes

- Licences: OpenDeepWiki is MIT; Sourcebot core is FSL (Apache 2.0 after two years) and its EE features are paid. GitNexus (PolyForm NC) and Serena (GPL-3.0) were left out.
- CodeGraphContext's JS parser drops Flow-typed functions, such as `function f<S, A>(`, so React lookups miss.
- Stopping by profile also stops the core. The Makefile stops by service name for this reason.
- `bench/results/react-wave1/` is the first run, made under CPU contention; its index times are inflated.

See [tools/CONTRACT.md](tools/CONTRACT.md) for conventions and internals.
