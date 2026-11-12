import * as ops from "./ops";
import type { Env } from "./types";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export async function dashboard(env: Env): Promise<Response> {
  const apps = await ops.registry(env).listApps();
  const mcp = `${ops.rootUrl(env)}/mcp`;
  const rows = apps
    .map(
      (a) => `<tr><td>${esc(a.name)}</td><td><a href="${esc(ops.appUrl(env, a.slug))}">${esc(a.slug)}</a></td>
<td>${a.current_version == null ? "-" : "v" + a.current_version}</td><td>${esc(a.visibility)}</td><td>${esc(a.updated_at.slice(0, 16).replace("T", " "))}</td></tr>`,
    )
    .join("");
  const html = `<!doctype html><html lang=en><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>celld apps</title>
<style>
:root{--bg:#fafafa;--fg:#1c1c1e;--mut:#6b6b70;--card:#fff;--line:#e4e4e7;--acc:#2563eb}
@media(prefers-color-scheme:dark){:root{--bg:#111113;--fg:#ececee;--mut:#9a9aa0;--card:#1a1a1d;--line:#2c2c30;--acc:#7aa2ff}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif}
main{max-width:52rem;margin:0 auto;padding:2rem 1rem}
h1{font-size:1.5rem;margin:0 0 1.5rem}h2{font-size:1rem;margin:2rem 0 .5rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:1rem;overflow-x:auto}
table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:.45rem .6rem;border-bottom:1px solid var(--line);white-space:nowrap}
th{color:var(--mut);font-weight:500;font-size:.85rem}tr:last-child td{border-bottom:0}
a{color:var(--acc)}code,pre{font:13px ui-monospace,monospace}pre{margin:.4rem 0 0;padding:.6rem;background:var(--bg);border-radius:6px;overflow-x:auto}
.empty{color:var(--mut)}
</style>
<main>
<h1>celld apps</h1>
<div class=card>${apps.length ? `<table><tr><th>Name</th><th>Slug</th><th>Version</th><th>Visibility</th><th>Updated</th></tr>${rows}</table>` : `<p class=empty>No apps yet. Connect an agent below and ask it to build one.</p>`}</div>
<h2>Connect</h2>
<div class=card>
<div>MCP endpoint: <code>${esc(mcp)}</code></div>
<pre>claude mcp add --transport http celld-apps ${esc(mcp)}</pre>
</div>
</main></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" } });
}
