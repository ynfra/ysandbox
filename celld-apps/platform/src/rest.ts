import { dashboard } from "./dashboard";
import { statusOf } from "./errors";
import { handleMcp } from "./mcp";
import * as ops from "./ops";
import { HttpError, type Env } from "./types";

const json = (data: unknown, status = 200) => Response.json(data, { status });

export async function handleRoot(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  try {
    if (path === "/mcp") return await handleMcp(request, env);
    if (path === "/" && request.method === "GET") return await dashboard(env);
    if (path.startsWith("/api/")) return await api(request, env, path.slice(5).split("/").filter(Boolean));
    return new Response("Not found", { status: 404 });
  } catch (e) {
    return json({ error: (e as Error).message }, statusOf(e));
  }
}

async function api(request: Request, env: Env, seg: string[]): Promise<Response> {
  const m = request.method;
  const reg = ops.registry(env);
  if (seg[0] !== "apps") throw new HttpError(404, "unknown API route");

  if (seg.length === 1) {
    if (m === "GET") return json({ apps: await Promise.all((await reg.listApps()).map((a) => ops.withUrl(env, a))) });
    if (m === "POST") {
      const b = (await request.json()) as { name: string; slug?: string; visibility?: string };
      return json(await ops.withUrl(env, await reg.createApp(b.name, b.slug, b.visibility)), 201);
    }
  }

  const slug = seg[1];
  const action = seg[2];
  if (seg.length === 2) {
    if (m === "GET") return json(await ops.withUrl(env, await reg.getApp(slug)));
    if (m === "DELETE") return json(await ops.deleteApp(env, slug));
  }

  if (m === "POST" && seg.length === 3) {
    const app = await reg.getApp(slug);
    if (action === "deploy") {
      if ((request.headers.get("content-type") ?? "").includes("application/zip")) {
        const note = request.headers.get("x-note") ?? undefined;
        return json(await ops.deploy(env, slug, ops.unzipFiles(new Uint8Array(await request.arrayBuffer())), { note }));
      }
      const b = (await request.json()) as { files: Record<string, string>; encoding?: "utf8" | "base64"; seed_sql?: string; note?: string };
      return json(await ops.deploy(env, slug, ops.decodeFiles(b.files, b.encoding), { seed_sql: b.seed_sql, note: b.note }));
    }
    const b = (await request.json()) as any;
    if (action === "rollback") return json(await ops.withUrl(env, await reg.rollback(slug, Number(b.version))));
    if (action === "sql") return json(await ops.appHost(env, app.id).sql(b.sql, b.params ?? []));
    if (action === "import") return json(await ops.appHost(env, app.id).importRows(b.table, b.rows, b.mode));
  }
  throw new HttpError(404, "unknown API route");
}
