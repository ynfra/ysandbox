# Benchmark: react

Generated 2026-11-02T07:57:50.901Z. `grep` is the baseline: git grep for retrieval, Claude with only Read/Grep/Glob for the agent run. Brackets show the difference from grep.

| Tool | Index | Peak RAM | Disk | Hit (symbol query) | Hit (NL question) | Recall | p50 search | Tokens/answer | Agent score (0–2) | Agent p50 | Turns | Cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **grep (baseline)** | 0 s | — | — | 95 % | 75 % | 90 % | 49 ms | 86 | — | — | — | — |
| codebase-memory-mcp | 12 s | 255 MiB | 152 MiB | 50 % (-45 %) | 50 % (-25 %) | 35 % | 206 ms | 735 | — | — | — | — |
| sourcebot | 1192 s | 1334 MiB | 146 MiB | 25 % (-70 %) | 0 % (-75 %) | 20 % | 759 ms | 3038 | — | — | — | — |
