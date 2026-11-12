#!/usr/bin/env node
// Benchmark every tool against the same questions, with plain grep as the
// baseline everything must beat. Three levels, cheapest first:
//
//   index      time, peak RAM and disk to build the index      (free)
//   retrieval  one search call per question: did the right files come back,
//              how fast, how much text                         (free)
//   agent      Claude answers each question with only Read/Grep/Glob
//              (baseline) or with the tool's MCP added; a judge scores the
//              answer against the reference                    (COSTS MONEY)
//
// Usage (from the lab root):
//   node bench/run.mjs index     <tool>       [repo]
//   node bench/run.mjs retrieval <tool|grep>  [repo] [--nl]
//   node bench/run.mjs agent     <tool|grep>  [repo] --yes [--limit N]
//   node bench/run.mjs report    [repo]

import { execSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const LAB = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const QUESTIONS = JSON.parse(readFileSync(join(LAB, "bench/questions.json"), "utf8"));
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name, def) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : def);
const positional = argv.filter((a, i) => !a.startsWith("--") && !(argv[i - 1] || "").startsWith("--limit"));
const [cmd, toolArg, repoArg] = positional;
// --nl sends the full natural-language question instead of the symbol-laden
// `query`. Symbol queries favour grep; NL queries are where semantic and graph
// indexes should earn their keep.
const NL = flag("--nl");

const sh = (c, opts = {}) => execSync(c, { cwd: LAB, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 28, ...opts });
const now = () => performance.now();
const shAsync = (c, timeoutMs) => new Promise((res, rej) => {
  const p = spawn("sh", ["-c", c], { cwd: LAB, stdio: "inherit" });
  const t = setTimeout(() => { p.kill("SIGKILL"); rej(new Error("timeout")); }, timeoutMs);
  p.on("close", (code) => { clearTimeout(t); code === 0 ? res() : rej(new Error(`exit ${code}: ${c}`)); });
});
const loadTool = (t) => JSON.parse(readFileSync(join(LAB, "tools", t, "bench.json"), "utf8"));
const fill = (v, vars) =>
  typeof v === "string" ? v.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m))
  : Array.isArray(v) ? v.map((x) => fill(x, vars))
  : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x, vars)]))
  : v;
const resultsDir = (repo) => { const d = join(LAB, "bench/results", repo); mkdirSync(d, { recursive: true }); return d; };
const save = (repo, tool, kind, data) => {
  const file = join(resultsDir(repo), `${tool}.${kind}.json`);
  writeFileSync(file, JSON.stringify({ tool, repo, kind, at: new Date().toISOString(), ...data }, null, 2));
  console.log(`→ ${file}`);
};
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };

// ---------- RAM / disk ----------

const toMiB = (s) => {
  const m = /([\d.]+)\s*([KMG]i?B|B)/.exec(s);
  if (!m) return 0;
  const f = { B: 1 / 1048576, KiB: 1 / 1024, KB: 1 / 1024, MiB: 1, MB: 1, GiB: 1024, GB: 1024 }[m[2]] ?? 1;
  return parseFloat(m[1]) * f;
};

function sampleMem(prefix) {
  try {
    const out = sh(`docker stats --no-stream --format '{{.Name}}\t{{.MemUsage}}'`);
    return out.split("\n").filter((l) => l.startsWith(prefix))
      .reduce((sum, l) => sum + toMiB(l.split("\t")[1].split("/")[0]), 0);
  } catch { return 0; }
}

function memSampler(prefix) {
  let peak = 0, stop = false;
  const loop = async () => {
    while (!stop) { peak = Math.max(peak, sampleMem(prefix)); await new Promise((r) => setTimeout(r, 2000)); }
  };
  const p = loop();
  return async () => { stop = true; await p; return Math.round(peak); };
}

function diskMiB(paths) {
  let total = 0;
  for (const p of paths) {
    const abs = resolve(LAB, p);
    if (!existsSync(abs)) continue;
    let bytes;
    try { bytes = parseInt(sh(`du -sb '${abs}' 2>/dev/null | cut -f1`)); } catch { bytes = NaN; }
    if (!Number.isFinite(bytes)) // root-owned files written by containers
      bytes = parseInt(sh(`docker run --rm -v '${abs}:/d:ro' alpine:3.22 du -sb /d | cut -f1`));
    total += bytes;
  }
  return Math.round(total / 1048576);
}

// ---------- MCP ----------

async function mcpClient(spec) {
  const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
  const { StreamableHTTPClientTransport } = await import("@modelcontextprotocol/sdk/client/streamableHttp.js");
  // Servers started with `up -d` may still be booting; retry for up to 3 min.
  for (let attempt = 0; ; attempt++) {
    const client = new Client({ name: "codebase-lab-bench", version: "1.0.0" });
    try {
      await client.connect(new StreamableHTTPClientTransport(new URL(spec.url), { requestInit: { headers: spec.headers || {} } }));
      return client;
    } catch (e) {
      if (attempt >= 36) throw e;
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

const resultText = (res) =>
  (res?.content || []).map((c) => (c.type === "text" ? c.text : JSON.stringify(c))).join("\n")
  + (res?.structuredContent ? "\n" + JSON.stringify(res.structuredContent) : "");

// ---------- grep baseline ----------

// "useState mountState dispatchSetState" -> each camelCase / snake / quoted
// identifier; falls back to the whole string when there is none.
function identifiers(query) {
  const ids = query.split(/[\s'"]+/).filter((t) => t.length >= 4 && /[A-Z_]|^[a-z]+[A-Z]/.test(t));
  return ids.length ? [...new Set(ids)] : [query];
}

const STOP = new Set(["from", "import", "callers", "usages", "react", "with", "function", "component", "root", "client"]);
function grepSearch(repo, query) {
  const dir = join(LAB, ".docker/repos", repo);
  const terms = [...new Set(query.split(/[^\w$]+/).filter((t) => t.length >= 4 && !STOP.has(t.toLowerCase())))];
  const score = new Map();
  for (const t of terms) {
    let files = [];
    try { files = sh(`git -C '${dir}' grep -l -I -F -e '${t}' -- packages ':!*__tests__*' ':!*/npm/*'`).split("\n").filter(Boolean); } catch {}
    for (const f of files) score.set(f, (score.get(f) || 0) + 1);
  }
  return [...score.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length).slice(0, 10).map(([f]) => f).join("\n");
}

// ---------- commands ----------

async function runIndex(tool, repo) {
  const b = loadTool(tool);
  const idx = fill(b.index, { repo });
  const stopMem = memSampler(`codebase-lab-${tool}`);
  const t0 = now();
  let ok = true, error = null;
  try {
    // Async on purpose: a blocking execSync would freeze the RAM sampler for
    // the whole index run and report 0 MiB.
    // A server-mode tool indexes inside its own server, so starting it is the
    // index step; without this the ready check waits out the whole timeout.
    if (idx.mode === "server" && !idx.cmd && b.serve) await shAsync(fill(b.serve, { repo }), 600000);
    if (idx.cmd) await shAsync(idx.cmd, (idx.timeout_s || 7200) * 1000);
    if (idx.mode === "server" && idx.ready) {
      const deadline = Date.now() + (idx.timeout_s || 7200) * 1000;
      for (;;) {
        try { sh(idx.ready, { timeout: 60000 }); break; } catch {}
        if (Date.now() > deadline) throw new Error("ready check timed out");
        await new Promise((r) => setTimeout(r, 10000));
      }
    }
  } catch (e) { ok = false; error = String(e.message || e).slice(0, 500); }
  const seconds = Math.round((now() - t0) / 1000);
  const peak_mib = await stopMem();
  const disk_mib = diskMiB(fill(b.disk || [], { repo }));
  console.log({ tool, repo, ok, seconds, peak_mib, disk_mib, error });
  save(repo, tool, "index", { ok, seconds, peak_mib, disk_mib, error });
}

async function runRetrieval(tool, repo) {
  const rows = [];
  let client = null, b = null;
  if (tool !== "grep") {
    b = loadTool(tool);
    if (!b.search) { console.log(`${tool}: no search tool in bench.json, skipping retrieval`); return; }
    if (b.serve) sh(fill(b.serve, { repo }), { stdio: "inherit" });
    client = await mcpClient(fill(b.mcp, { repo }));
  }
  for (const q of QUESTIONS.questions) {
    const t0 = now();
    let text = "", error = null;
    try {
      if (client) {
        // Symbol mode calls search once per identifier, the way an agent uses
        // a name-lookup tool; NL mode sends the whole question once.
        const queries = NL ? [q.question] : identifiers(q.query);
        for (const query of queries) {
          const s = fill(b.search, { repo, query });
          text += resultText(await client.callTool({ name: s.tool, arguments: s.args }, undefined, { timeout: 300000 })) + "\n";
        }
      } else text = grepSearch(repo, NL ? q.question : q.query);
    } catch (e) { error = String(e.message || e).slice(0, 300); }
    const ms = Math.round(now() - t0);
    const found = q.expect.filter((e) => text.includes(e));
    rows.push({ id: q.id, category: q.category, ms, chars: text.length, recall: found.length / q.expect.length, hit: found.length > 0, error, sample: text.slice(0, 400) });
    console.log(`${q.id} ${found.length}/${q.expect.length} ${ms}ms ${text.length}ch${error ? " ERR " + error : ""}`);
  }
  if (client) await client.close();
  const summary = {
    hit_rate: rows.filter((r) => r.hit).length / rows.length,
    recall: rows.reduce((s, r) => s + r.recall, 0) / rows.length,
    p50_ms: median(rows.map((r) => r.ms)),
    avg_tokens: Math.round(rows.reduce((s, r) => s + r.chars, 0) / rows.length / 4),
    errors: rows.filter((r) => r.error).length,
  };
  console.log(summary);
  save(repo, tool, NL ? "retrieval-nl" : "retrieval", { summary, rows });
}

function claude(args, cwd, timeoutMs = 600000) {
  return new Promise((res) => {
    const p = spawn("claude", args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    const timer = setTimeout(() => p.kill("SIGKILL"), timeoutMs);
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("close", () => { clearTimeout(timer); try { res(JSON.parse(out)); } catch { res({ is_error: true, result: (out + err).slice(-800) }); } });
  });
}

async function runAgent(tool, repo) {
  if (!flag("--yes")) {
    console.error("agent mode runs `claude -p` twice per question (answer + judge) and costs money. Re-run with --yes.");
    process.exit(2);
  }
  const model = process.env.BENCH_MODEL || "sonnet";
  const judgeModel = process.env.BENCH_JUDGE_MODEL || "sonnet";
  const limit = parseInt(opt("--limit", "0")) || QUESTIONS.questions.length;
  const cwd = join(LAB, ".docker/repos", repo);
  // Prompt goes right after -p: --allowedTools/--disallowedTools are variadic
  // and would swallow a trailing positional prompt.
  const base = ["--output-format", "json", "--model", model, "--max-budget-usd", process.env.BENCH_MAX_USD || "0.50",
    "--disallowedTools", "Bash,Edit,Write,NotebookEdit,WebFetch,WebSearch,Task,Agent"];
  let mcpArgs = [], allowed = "Read,Grep,Glob", hint = "";
  if (tool !== "grep") {
    const b = loadTool(tool);
    if (b.serve) sh(fill(b.serve, { repo }), { stdio: "inherit" });
    const m = fill(b.mcp, { repo });
    mcpArgs = ["--strict-mcp-config", "--mcp-config", JSON.stringify({ mcpServers: { [tool]: { type: "http", url: m.url, headers: m.headers || {} } } })];
    allowed += `,mcp__${tool}`;
    hint = `\nA code index of this repository is available as the "${tool}" MCP server. Use it when it helps.`;
  } else mcpArgs = ["--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}'];

  const rows = [];
  for (const q of QUESTIONS.questions.slice(0, limit)) {
    const prompt = `Answer this question about the React repository in the current directory. Cite file paths. Be concise.${hint}\n\nQuestion: ${q.question}`;
    const t0 = now();
    const r = await claude(["-p", prompt, ...base, ...mcpArgs, "--allowedTools", allowed], cwd);
    const ms = Math.round(now() - t0);
    const judgePrompt = `You grade answers about the React codebase. Compare the ANSWER to the REFERENCE.
Score 2 = correct and names the right files/functions; 1 = partly correct; 0 = wrong or no answer.
Reply with only JSON: {"score": 0|1|2, "reason": "<one sentence>"}

QUESTION: ${q.question}
REFERENCE: ${q.reference}
ANSWER: ${r.result || "(none)"}`;
    const j = await claude(["-p", judgePrompt, "--output-format", "json", "--model", judgeModel, "--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}', "--tools", ""], LAB, 180000);
    let verdict = { score: 0, reason: "judge output unparsable" };
    try { verdict = JSON.parse(/\{[\s\S]*\}/.exec(j.result)[0]); } catch {}
    const row = {
      id: q.id, category: q.category, ms, turns: r.num_turns ?? null, cost_usd: r.total_cost_usd ?? null,
      input_tokens: (r.usage?.input_tokens || 0) + (r.usage?.cache_read_input_tokens || 0) + (r.usage?.cache_creation_input_tokens || 0),
      output_tokens: r.usage?.output_tokens ?? null, error: r.is_error ? String(r.result).slice(0, 300) : null,
      score: verdict.score, reason: verdict.reason, answer: (r.result || "").slice(0, 4000),
    };
    rows.push(row);
    console.log(`${q.id} score=${row.score} ${Math.round(ms / 1000)}s turns=${row.turns} $${row.cost_usd?.toFixed?.(3)}`);
  }
  const n = rows.length;
  const summary = {
    model, judge: judgeModel, n,
    avg_score: rows.reduce((s, r) => s + (r.score || 0), 0) / n,
    p50_s: Math.round(median(rows.map((r) => r.ms)) / 1000),
    avg_turns: rows.reduce((s, r) => s + (r.turns || 0), 0) / n,
    total_cost_usd: rows.reduce((s, r) => s + (r.cost_usd || 0), 0),
    avg_input_tokens: Math.round(rows.reduce((s, r) => s + r.input_tokens, 0) / n),
  };
  console.log(summary);
  save(repo, tool, "agent", { summary, rows });
}

function report(repo) {
  const dir = resultsDir(repo);
  const load = (f) => JSON.parse(readFileSync(join(dir, f), "utf8"));
  const byTool = {};
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const d = load(f);
    (byTool[d.tool] ||= {})[d.kind] = d;
  }
  const tools = ["grep", ...Object.keys(byTool).filter((t) => t !== "grep").sort()];
  const g = byTool.grep || {};
  const pct = (x) => (x == null ? "—" : `${Math.round(x * 100)} %`);
  const delta = (x, b, f = (v) => v.toFixed(2)) => (x == null ? "—" : b == null || x === b ? f(x) : `${f(x)} (${x > b ? "+" : ""}${f(x - b)})`);
  const lines = [
    `# Benchmark: ${repo}`, "",
    `Generated ${new Date().toISOString()}. \`grep\` is the baseline: git grep for retrieval, Claude with only Read/Grep/Glob for the agent run. Brackets show the difference from grep.`, "",
    "| Tool | Index | Peak RAM | Disk | Hit (symbol query) | Hit (NL question) | Recall | p50 search | Tokens/answer | Agent score (0–2) | Agent p50 | Turns | Cost |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|",
  ];
  for (const t of tools) {
    const r = byTool[t] || {}, i = r.index, rt = r.retrieval?.summary, nl = r["retrieval-nl"]?.summary, a = r.agent?.summary;
    lines.push(`| ${t === "grep" ? "**grep (baseline)**" : t} | ${i ? (i.ok ? `${i.seconds} s` : "failed") : t === "grep" ? "0 s" : "—"} | ${i ? `${i.peak_mib} MiB` : "—"} | ${i ? `${i.disk_mib} MiB` : "—"} | ${rt ? delta(rt.hit_rate, g.retrieval?.summary.hit_rate, (v) => pct(v)) : "—"} | ${nl ? delta(nl.hit_rate, g["retrieval-nl"]?.summary.hit_rate, (v) => pct(v)) : "—"} | ${rt ? pct(rt.recall) : "—"} | ${rt ? `${rt.p50_ms} ms` : "—"} | ${rt ? rt.avg_tokens : "—"} | ${a ? delta(a.avg_score, g.agent?.summary.avg_score) : "—"} | ${a ? `${a.p50_s} s` : "—"} | ${a ? a.avg_turns.toFixed(1) : "—"} | ${a ? `$${a.total_cost_usd.toFixed(2)}` : "—"} |`);
  }
  const out = join(dir, "REPORT.md");
  writeFileSync(out, lines.join("\n") + "\n");
  console.log(lines.join("\n"));
  console.log(`→ ${out}`);
}

const repo = (cmd === "report" ? toolArg : repoArg) || QUESTIONS.repo;
if (cmd === "index" && toolArg) await runIndex(toolArg, repo);
else if (cmd === "retrieval" && toolArg) await runRetrieval(toolArg, repo);
else if (cmd === "agent" && toolArg) await runAgent(toolArg, repo);
else if (cmd === "report") report(repo);
else { console.error("usage: node bench/run.mjs index|retrieval|agent <tool|grep> [repo] | report [repo]"); process.exit(2); }
