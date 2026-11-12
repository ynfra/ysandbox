import { statusOf } from "./errors";
import * as ops from "./ops";
import { tools } from "./tools";
import type { Env } from "./types";

const VERSIONS = ["2025-03-26", "2025-06-18", "2025-11-25"];

const INSTRUCTIONS = `Hosts small web apps for people in the organization. Create an app, then deploy static files (index.html plus assets; absolute paths like /assets/app.js work because each app has its own subdomain).
Tiers: (1) static only: just deploy files. (2) app with data: each app has a private SQLite database; seed it with seed.sql or seed_sql on deploy (runs only while the database is empty), bulk-load with db_import, or inspect with db_query / db_schema. The browser code reads and writes the same database through the ES module at /_api/client.js (import { sql, schema } from "/_api/client.js"; await sql("select * from t where id = ?", [1])).
Deploys are versioned and atomic; use rollback to go back. For bundles too large for one tool call use get_upload_url.`;

type Json = Record<string, any>;
const rpcResult = (id: unknown, result: unknown) => ({ jsonrpc: "2.0", id, result });
const rpcError = (id: unknown, code: number, message: string) => ({ jsonrpc: "2.0", id, error: { code, message } });

async function handle(msg: Json, env: Env): Promise<Json | null> {
  const { id, method, params } = msg;
  if (typeof method !== "string") return rpcError(id ?? null, -32600, "Invalid request");
  if (method.startsWith("notifications/")) return null;
  switch (method) {
    case "initialize":
      return rpcResult(id, {
        protocolVersion: VERSIONS.includes(params?.protocolVersion) ? params.protocolVersion : "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: "celld-apps", version: "0.1.0" },
        instructions: INSTRUCTIONS,
      });
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, { tools: tools.map(({ name, title, description, inputSchema, annotations }) => ({ name, title, description, inputSchema, annotations })) });
    case "tools/call": {
      const tool = tools.find((t) => t.name === params?.name);
      if (!tool) return rpcError(id, -32602, `Unknown tool: ${params?.name}`);
      try {
        const out = await tool.run(env, params.arguments ?? {});
        return rpcResult(id, { content: [{ type: "text", text: JSON.stringify(out, null, 2) }], structuredContent: out });
      } catch (e) {
        // Tool failures are results the model can read and act on, not protocol errors.
        return rpcResult(id, { isError: true, content: [{ type: "text", text: (e as Error).message }] });
      }
    }
    default:
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

export async function handleMcp(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { allow: "POST" } });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(rpcError(null, -32700, "Parse error"), { status: 400 });
  }
  try {
    if (Array.isArray(body)) {
      const out = (await Promise.all(body.map((m) => handle(m, env)))).filter(Boolean);
      return out.length ? Response.json(out) : new Response(null, { status: 202 });
    }
    const out = await handle(body as Json, env);
    return out ? Response.json(out) : new Response(null, { status: 202 });
  } catch (e) {
    return Response.json(rpcError((body as Json)?.id ?? null, -32603, (e as Error).message), { status: statusOf(e) >= 500 ? 500 : 200 });
  }
}
