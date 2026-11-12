# Benchmark: react

Generated 2026-11-02T07:22:06.578Z. `grep` is the baseline: git grep for retrieval, Claude with only Read/Grep/Glob for the agent run. Brackets show the difference from grep.

| Tool | Index | Peak RAM | Disk | Hit (symbol query) | Hit (NL question) | Recall | p50 search | Tokens/answer | Agent score (0–2) | Agent p50 | Turns | Cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **grep (baseline)** | 0 s | — | — | 95 % | 75 % | 90 % | 64 ms | 86 | — | — | — | — |
| codebase-memory-mcp | 16 s | 0 MiB | 148 MiB | — | — | — | — | — | — | — | — | — |
| codegraphcontext | 300 s | 0 MiB | 95 MiB | 5 % (-90 %) | 0 % (-75 %) | 3 % | 583 ms | 170 | — | — | — | — |
| graphify | 1748 s | 0 MiB | 75 MiB | 65 % (-30 %) | 55 % (-20 %) | 58 % | 60 ms | 1449 | — | — | — | — |
| sourcebot | failed | 0 MiB | 146 MiB | 25 % (-70 %) | 0 % (-75 %) | 20 % | 573 ms | 3038 | — | — | — | — |
