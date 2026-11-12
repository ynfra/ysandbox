import { appHost, registry } from "./ops";
import { canView, identify } from "./auth";
import { HttpError, type AppRow, type Env } from "./types";

const TYPES: Record<string, string> = {
  html: "text/html; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  json: "application/json; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  ico: "image/x-icon",
  woff2: "font/woff2",
  txt: "text/plain; charset=utf-8",
  map: "application/json",
  wasm: "application/wasm",
};

const ext = (path: string) => (path.match(/\.([a-z0-9]+)$/i)?.[1] ?? "").toLowerCase();

const page = (status: number, title: string, body: string) =>
  new Response(
    `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{font:16px system-ui;display:grid;place-items:center;min-height:100vh;margin:0;background:#fafafa;color:#222}
@media(prefers-color-scheme:dark){body{background:#111;color:#eee}}main{max-width:32rem;padding:1rem}</style><main>${body}</main>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );

const CLIENT_JS = `// Data helper for this app's private SQLite database.
async function call(path, init) {
  const res = await fetch(path, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}
export async function sql(query, params = []) {
  return call("/_api/sql", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sql: query, params }) });
}
export async function schema() {
  return call("/_api/schema");
}
`;

export async function serveApp(request: Request, env: Env, slug: string): Promise<Response> {
  const app = (await registry(env).findApp(slug)) as AppRow | null;
  if (!app) return page(404, "App not found", `<h1>No app "${slug}"</h1><p>This address is not registered.</p>`);
  if (!canView(await identify(request, env), app, env)) return page(403, "Forbidden", "<h1>Forbidden</h1>");

  const url = new URL(request.url);
  let path = decodeURIComponent(url.pathname);

  if (path.startsWith("/_api/")) {
    try {
      if (path === "/_api/client.js") return new Response(CLIENT_JS, { headers: { "content-type": TYPES.js } });
      const host = appHost(env, app.id);
      if (path === "/_api/schema" && request.method === "GET") return Response.json({ tables: await host.schema() });
      if (path === "/_api/sql" && request.method === "POST") {
        const { sql, params } = (await request.json()) as { sql?: string; params?: unknown[] };
        if (!sql) throw new HttpError(400, "sql is required");
        return Response.json(await host.sql(sql, params ?? []));
      }
      throw new HttpError(404, "unknown API route");
    } catch (e) {
      const status = e instanceof HttpError ? e.status : (e as any)?.status ?? 400;
      return Response.json({ error: (e as Error).message }, { status });
    }
  }

  if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
  if (app.current_version == null) {
    return page(200, app.name, `<h1>${app.name.replace(/</g, "&lt;")}</h1><p>This app has been created but nothing is deployed yet.</p>`);
  }

  const prefix = `apps/${app.id}/v${app.current_version}/`;
  if (path.endsWith("/")) path += "index.html";
  path = path.replace(/^\/+/, "");
  let obj = await env.FILES.get(prefix + path);
  // Extensionless misses are client-side routes (SPA fallback); asset misses are real 404s.
  if (!obj && !ext(path)) {
    path = "index.html";
    obj = await env.FILES.get(prefix + path);
  }
  if (!obj) return new Response("Not found", { status: 404 });

  const type = ext(path);
  const headers: Record<string, string> = { "content-type": TYPES[type] ?? "application/octet-stream" };
  if (type === "html") headers["cache-control"] = "no-cache";
  return new Response(request.method === "HEAD" ? null : obj.body, { headers });
}
