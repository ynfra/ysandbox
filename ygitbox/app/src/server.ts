import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { config, oidcEnabled, repos } from "./config.ts";
import { callerFrom } from "./auth.ts";
import { gitFor } from "./git.ts";
import { instructions, registerTools } from "./tools.ts";
import { sweepDrafts } from "./changes.ts";
import * as oauth from "./oauth.ts";
import { log } from "./log.ts";

const ready = new Map<string, boolean>();

/** Clone/fetch every repo; retry in the background until the forge is reachable. */
async function initRepos(): Promise<void> {
  await Promise.all(
    repos.map(async (r) => {
      for (let attempt = 1; ; attempt++) {
        try {
          await gitFor(r).init();
          ready.set(r.id, true);
          log.info(`repo ${r.id}: mirror ready (${r.cloneUrl})`);
          return;
        } catch (e) {
          ready.set(r.id, false);
          if (attempt === 1 || attempt % 10 === 0) log.warn(`repo ${r.id}: not reachable yet (${(e as Error).message})`);
          await Bun.sleep(Math.min(30_000, 2_000 * attempt));
        }
      }
    }),
  );
}

class BodyTooLarge extends Error {}
async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const c of req) {
    total += (c as Buffer).length;
    if (total > config.maxBodyBytes) throw new BodyTooLarge();
    chunks.push(c as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

const hits = new Map<string, { count: number; resetAt: number }>();
function rateLimited(key: string): boolean {
  if (config.rateLimitPerMin <= 0) return false;
  const t = Date.now();
  const e = hits.get(key);
  if (!e || t >= e.resetAt) {
    hits.set(key, { count: 1, resetAt: t + 60_000 });
    if (hits.size > 10_000) for (const [k, v] of hits) if (t >= v.resetAt) hits.delete(k);
    return false;
  }
  return ++e.count > config.rateLimitPerMin;
}

const list = (req: IncomingMessage, h: string) =>
  String(req.headers[h] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

async function handleMcp(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const caller = callerFrom(req);
  if (!caller) {
    // MCP authorization spec: point the client at our protected-resource metadata.
    res.writeHead(401, {
      "Content-Type": "application/json",
      "WWW-Authenticate": `Bearer resource_metadata="${config.publicUrl}/.well-known/oauth-protected-resource/mcp"`,
    });
    res.end(JSON.stringify({ error: "unauthorized", error_description: "Sign in (OAuth) or send Authorization: Bearer ygb_pat_…" }));
    return;
  }
  if (rateLimited(`u:${caller.user.id}`)) {
    res.writeHead(429).end("rate limited");
    return;
  }
  let body: unknown;
  if (req.method === "POST") {
    const raw = await readBody(req);
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }));
      return;
    }
  }
  // Stateless: a server per request, scoped to this caller's identity and filters.
  const server = new McpServer({ name: "ygitbox", version: "0.1.0" }, { instructions: instructions(caller) });
  registerTools(server, caller, list(req, "x-mcp-tools-only"), list(req, "x-mcp-tools-except"));
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => {
    transport.close();
    server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, body);
}

const http = createServer((req, res) => {
  const url = (req.url ?? "/").split("?")[0]!;
  // Every handler runs inside done(): a sync throw becomes a 500 instead of killing the process.
  const done = (fn: () => Promise<void> | void) =>
    Promise.resolve()
      .then(fn)
      .catch((e) => {
      if (e instanceof BodyTooLarge) {
        if (!res.headersSent) res.writeHead(413).end("payload too large");
        return;
      }
      log.error(`${req.method} ${url}: ${e?.stack ?? e}`);
      if (!res.headersSent) res.writeHead(500).end("internal error");
    });
  const fwd = config.trustProxy ? (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() : undefined;
  const ip = fwd || req.socket.remoteAddress || "?";
  if (url.startsWith("/oauth/") || url.startsWith("/auth/") || url === "/login") {
    if (rateLimited(`ip:${ip}`)) return res.writeHead(429).end("rate limited");
  }

  switch (`${req.method} ${url}`) {
    case "GET /healthz": {
      const all = repos.every((r) => ready.get(r.id));
      res.writeHead(all ? 200 : 503, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: all, repos: Object.fromEntries(repos.map((r) => [r.id, !!ready.get(r.id)])) }));
    }
    case "GET /.well-known/oauth-protected-resource":
    case "GET /.well-known/oauth-protected-resource/mcp":
      return done(() => oauth.protectedResourceMetadata(res));
    case "GET /.well-known/oauth-authorization-server":
    case "GET /.well-known/oauth-authorization-server/mcp":
    case "GET /.well-known/openid-configuration":
      return done(() => oauth.authServerMetadata(res));
    case "POST /oauth/register":
      return done(() => oauth.register(req, res));
    case "GET /oauth/authorize":
      return done(() => oauth.authorize(req, res));
    case "GET /oauth/consent":
      return done(() => oauth.consentPage(req, res));
    case "POST /oauth/consent":
      return done(() => oauth.consentSubmit(req, res));
    case "POST /oauth/token":
      return done(() => oauth.token(req, res));
    case "POST /oauth/revoke":
      return done(() => oauth.revoke(req, res));
    case "GET /auth/callback":
      return done(() => oauth.upstreamCallback(req, res));
    case "GET /login":
      return done(() => oauth.login(req, res));
    case "GET /logout":
      return done(() => oauth.logout(req, res));
    case "GET /tokens":
    case "POST /tokens":
      return done(() => oauth.tokensPage(req, res));
    case "POST /tokens/revoke":
      return done(() => oauth.tokensRevoke(req, res));
    case "GET /":
      return done(() => oauth.home(req, res));
  }
  if (url === "/mcp") return done(() => handleMcp(req, res));
  res.writeHead(404).end("not found");
});

http.listen(config.port, () => {
  log.info(`ygitbox listening on :${config.port} · MCP ${config.publicUrl}/mcp`);
  log.info(`repos: ${repos.map((r) => r.id).join(", ")} · OAuth/SSO: ${oidcEnabled() ? "on" : "off (PAT only)"}`);
});

// Defence in depth: a stray exception in some callback must not take the server down.
process.on("uncaughtException", (e) => log.error(`uncaught: ${e?.stack ?? e}`));
process.on("unhandledRejection", (e) => log.error(`unhandled rejection: ${e}`));

initRepos();
const sweep = () => {
  sweepDrafts().catch((e) => log.warn(`draft sweep: ${e}`));
  oauth.sweepTxns();
};
setTimeout(sweep, 10_000);
setInterval(sweep, 3600_000);
