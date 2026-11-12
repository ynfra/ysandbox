import type { IncomingMessage, ServerResponse } from "node:http";
import { createHash } from "node:crypto";
import { config, oidcEnabled, repos } from "./config.ts";
import { db, now, randomId, sha256, upsertUser, userById, type User } from "./db.ts";
import { issueToken, patTtl, revokeFamily, revokeToken, roleOn, type Scope, type TokenRow } from "./auth.ts";
import { log } from "./log.ts";

/**
 * OAuth 2.1 authorization server for MCP clients (DCR + PKCE), federated to an
 * upstream OIDC IdP for the actual login. ygitbox issues its own opaque,
 * audience-bound tokens, so the IdP never needs to support DCR and its tokens
 * never reach the MCP client. The consent screen is where a person picks which
 * repos (and default repo) and what access level the client gets.
 */

const RESOURCE = () => `${config.publicUrl}/mcp`;
const LEVELS: { id: string; label: string; scopes: Scope[]; minRole: "viewer" | "contributor" | "maintainer" }[] = [
  { id: "read", label: "Read only", scopes: ["repo:read"], minRole: "viewer" },
  { id: "propose", label: "Read and propose changes", scopes: ["repo:read", "repo:propose"], minRole: "contributor" },
  { id: "review", label: "Read, propose and review", scopes: ["repo:read", "repo:propose", "repo:review", "repo:admin"], minRole: "maintainer" },
];

// ── tiny HTTP helpers ───────────────────────────────────────────────────────

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function json(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers });
  res.end(JSON.stringify(body));
}

function redirect(res: ServerResponse, url: string, headers: Record<string, string | string[]> = {}) {
  res.writeHead(302, { Location: url, "Cache-Control": "no-store", ...headers });
  res.end();
}

function page(res: ServerResponse, title: string, body: string, status = 200, headers: Record<string, string | string[]> = {}) {
  res.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self' http: https:; frame-ancestors 'none'",
    ...headers,
  });
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · ygitbox</title><style>
:root{--bg:#f6f8f8;--card:#fff;--fg:#14201f;--muted:#56676a;--line:#d7e0e0;--accent:#0d7468;--danger:#b42318}
@media (prefers-color-scheme:dark){:root{--bg:#0f1616;--card:#162020;--fg:#e3ecea;--muted:#93a6a4;--line:#2a3a3a;--accent:#4cc3b2;--danger:#f2877c}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;padding:40px 16px}
main{max-width:560px;margin:0 auto}.brand{font-weight:800;letter-spacing:-.01em;color:var(--accent);margin-bottom:18px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:22px 24px;margin-bottom:16px}
h1{font-size:22px;margin:0 0 10px}h2{font-size:16px;margin:18px 0 8px}p{margin:0 0 10px}.muted{color:var(--muted)}
label.opt{display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-top:1px solid var(--line)}label.opt:first-of-type{border-top:0}
input[type=text],input[type=number],select{width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--fg);font:inherit}
button{font:inherit;font-weight:600;border-radius:6px;padding:9px 16px;border:1px solid var(--accent);background:var(--accent);color:#fff;cursor:pointer}
button.secondary{background:transparent;color:var(--fg);border-color:var(--line)}button.danger{background:transparent;color:var(--danger);border-color:var(--danger);padding:4px 10px}
.row{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}code,.token{font-family:ui-monospace,Menlo,monospace;font-size:13px}
.token{display:block;word-break:break-all;background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:10px;margin:8px 0}
table{width:100%;border-collapse:collapse;font-size:14px}td,th{text-align:left;padding:6px 4px;border-top:1px solid var(--line);vertical-align:top}
</style></head><body><main><div class="brand">ygitbox</div>${body}</main></body></html>`);
}

async function readForm(req: IncomingMessage, max = 64_000): Promise<URLSearchParams> {
  const chunks: Buffer[] = [];
  let n = 0;
  for await (const c of req) {
    n += (c as Buffer).length;
    if (n > max) throw new Error("form too large");
    chunks.push(c as Buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  const ct = String(req.headers["content-type"] ?? "");
  if (ct.includes("application/json")) {
    const o = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(o)) {
      if (Array.isArray(v)) v.forEach((x) => p.append(k, String(x)));
      else if (v !== undefined && v !== null) p.set(k, String(v));
    }
    return p;
  }
  return new URLSearchParams(raw);
}

// ── transactions (pending logins, consents, codes) ──────────────────────────

function putTxn(kind: string, data: unknown, ttlSec: number, id = randomId(24)): string {
  db.query("insert into txns(id, kind, data, expires_at) values (?,?,?,?)").run(id, kind, JSON.stringify(data), now() + ttlSec);
  return id;
}
function getTxn<T>(id: string, kind: string): T | null {
  const r = db.query("select data, expires_at from txns where id = ? and kind = ?").get(id, kind) as { data: string; expires_at: number } | null;
  if (!r || r.expires_at < now()) return null;
  return JSON.parse(r.data) as T;
}
function updTxn(id: string, data: unknown) {
  db.query("update txns set data = ? where id = ?").run(JSON.stringify(data), id);
}
function delTxn(id: string) {
  db.query("delete from txns where id = ?").run(id);
}
export function sweepTxns() {
  db.query("delete from txns where expires_at < ?").run(now());
  db.query("delete from sessions where expires_at < ?").run(now());
}

// ── web sessions (for consent and the token page) ───────────────────────────

const COOKIE = "ygb_session";
function cookieOf(req: IncomingMessage, name: string): string | null {
  for (const part of String(req.headers.cookie ?? "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k !== name) continue;
    try {
      return decodeURIComponent(v.join("="));
    } catch {
      return null; // malformed cookie: treat as signed out, never throw
    }
  }
  return null;
}
function sessionOf(req: IncomingMessage): { user: User; csrf: string } | null {
  const raw = cookieOf(req, COOKIE);
  if (!raw) return null;
  const r = db.query("select user_id, csrf, expires_at from sessions where id_hash = ?").get(sha256(raw)) as {
    user_id: number;
    csrf: string;
    expires_at: number;
  } | null;
  if (!r || r.expires_at < now()) return null;
  const user = userById(r.user_id);
  return user ? { user, csrf: r.csrf } : null;
}
function newSession(userId: number): string {
  const raw = randomId(32);
  db.query("insert into sessions(id_hash, user_id, csrf, expires_at) values (?,?,?,?)").run(sha256(raw), userId, randomId(16), now() + 7 * 86400);
  const secure = config.publicUrl.startsWith("https://") ? "; Secure" : "";
  return `${COOKIE}=${raw}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${7 * 86400}${secure}`;
}

// ── discovery + DCR ─────────────────────────────────────────────────────────

export function protectedResourceMetadata(res: ServerResponse) {
  json(res, 200, {
    resource: RESOURCE(),
    authorization_servers: [config.publicUrl],
    scopes_supported: ["repo:read", "repo:propose", "repo:review", "repo:admin"],
    bearer_methods_supported: ["header"],
    resource_name: "ygitbox",
  });
}

export function authServerMetadata(res: ServerResponse) {
  json(res, 200, {
    issuer: config.publicUrl,
    authorization_endpoint: `${config.publicUrl}/oauth/authorize`,
    token_endpoint: `${config.publicUrl}/oauth/token`,
    registration_endpoint: `${config.publicUrl}/oauth/register`,
    revocation_endpoint: `${config.publicUrl}/oauth/revoke`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["repo:read", "repo:propose", "repo:review", "repo:admin"],
  });
}

function okRedirectUri(u: string): boolean {
  try {
    const x = new URL(u);
    if (x.hash) return false;
    if (x.protocol === "https:") return true;
    return x.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(x.hostname);
  } catch {
    return false;
  }
}

export async function register(req: IncomingMessage, res: ServerResponse) {
  const p = await readForm(req);
  const uris = p.getAll("redirect_uris");
  if (!uris.length || !uris.every(okRedirectUri))
    return json(res, 400, { error: "invalid_redirect_uri", error_description: "redirect_uris must be https or http://localhost" });
  const clientId = `ygbc_${randomId(12)}`;
  const name = (p.get("client_name") ?? "MCP client").replace(/[\x00-\x1f\x7f]+/g, " ").trim().slice(0, 60) || "MCP client";
  db.query("insert into oauth_clients(client_id, name, redirect_uris, created_at) values (?,?,?,?)").run(clientId, name, JSON.stringify(uris), now());
  json(res, 201, {
    client_id: clientId,
    client_id_issued_at: now(),
    client_name: name,
    redirect_uris: uris,
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
  });
}

// ── authorize → upstream login → consent → code ─────────────────────────────

interface AuthzTxn {
  clientId: string;
  clientName: string;
  redirectUri: string;
  state: string | null;
  challenge: string;
  userId?: number;
}

function upstreamRedirect(res: ServerResponse, next: string) {
  const up = putTxn("up", { next }, 600);
  const u = new URL(config.oidc.authorizeUrl);
  u.searchParams.set("client_id", config.oidc.clientId);
  u.searchParams.set("redirect_uri", `${config.publicUrl}/auth/callback`);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", config.oidc.scopes);
  u.searchParams.set("state", up);
  redirect(res, u.toString());
}

export function authorize(req: IncomingMessage, res: ServerResponse) {
  const q = new URL(req.url ?? "/", config.publicUrl).searchParams;
  const clientId = q.get("client_id") ?? "";
  const client = db.query("select name, redirect_uris from oauth_clients where client_id = ?").get(clientId) as {
    name: string;
    redirect_uris: string;
  } | null;
  if (!client) return page(res, "Unknown client", `<div class="card"><h1>Unknown client</h1><p>This app is not registered with ygitbox.</p></div>`, 400);
  const redirectUri = q.get("redirect_uri") ?? "";
  if (!(JSON.parse(client.redirect_uris) as string[]).includes(redirectUri))
    return page(res, "Bad redirect", `<div class="card"><h1>Redirect URI mismatch</h1><p>The app sent a redirect URI it did not register.</p></div>`, 400);
  const back = (err: string, desc: string) => {
    const u = new URL(redirectUri);
    u.searchParams.set("error", err);
    u.searchParams.set("error_description", desc);
    if (q.get("state")) u.searchParams.set("state", q.get("state")!);
    redirect(res, u.toString());
  };
  if (q.get("response_type") !== "code") return back("unsupported_response_type", "only code is supported");
  if (!q.get("code_challenge") || (q.get("code_challenge_method") ?? "plain") !== "S256")
    return back("invalid_request", "PKCE with S256 is required");
  const resource = q.get("resource");
  if (resource && resource.replace(/\/$/, "") !== RESOURCE() && resource.replace(/\/$/, "") !== config.publicUrl)
    return back("invalid_target", `resource must be ${RESOURCE()}`);
  if (!oidcEnabled()) return back("server_error", "single sign-on is not configured on this ygitbox");
  const txn: AuthzTxn = {
    clientId,
    clientName: client.name,
    redirectUri,
    state: q.get("state"),
    challenge: q.get("code_challenge")!,
  };
  const id = putTxn("authz", txn, 900);
  // Always re-authenticate upstream for a new client grant: consent must be a fresh decision.
  upstreamRedirect(res, `authz:${id}`);
}

export async function upstreamCallback(req: IncomingMessage, res: ServerResponse) {
  const q = new URL(req.url ?? "/", config.publicUrl).searchParams;
  const upId = q.get("state") ?? "";
  const up = getTxn<{ next: string }>(upId, "up");
  if (!up) return page(res, "Expired", `<div class="card"><h1>Sign-in expired</h1><p>Start again from your app.</p></div>`, 400);
  delTxn(upId);
  if (q.get("error") || !q.get("code"))
    return page(res, "Sign-in failed", `<div class="card"><h1>Sign-in was cancelled</h1><p class="muted">${esc(q.get("error") ?? "no code")}</p></div>`, 400);
  let user: User;
  try {
    const tr = await fetch(config.oidc.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: q.get("code")!,
        redirect_uri: `${config.publicUrl}/auth/callback`,
        client_id: config.oidc.clientId,
        client_secret: config.oidc.clientSecret,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!tr.ok) throw new Error(`token endpoint ${tr.status}: ${(await tr.text()).slice(0, 200)}`);
    const { access_token } = (await tr.json()) as { access_token: string };
    const ur = await fetch(config.oidc.userinfoUrl, { headers: { Authorization: `Bearer ${access_token}` }, signal: AbortSignal.timeout(15_000) });
    if (!ur.ok) throw new Error(`userinfo ${ur.status}`);
    const info = (await ur.json()) as { email?: string; email_verified?: boolean; name?: string; preferred_username?: string };
    if (!info.email) throw new Error("the identity provider returned no email");
    if (info.email_verified === false) throw new Error("the identity provider says this email is not verified");
    user = upsertUser(info.email, info.name || info.preferred_username || info.email);
  } catch (e) {
    log.warn(`upstream login failed: ${e}`);
    return page(res, "Sign-in failed", `<div class="card"><h1>Sign-in failed</h1><p class="muted">${esc(String((e as Error).message))}</p></div>`, 502);
  }
  const cookie = newSession(user.id);
  if (up.next.startsWith("authz:")) {
    const id = up.next.slice(6);
    const t = getTxn<AuthzTxn>(id, "authz");
    if (!t) return page(res, "Expired", `<div class="card"><h1>Request expired</h1><p>Start again from your app.</p></div>`, 400);
    updTxn(id, { ...t, userId: user.id });
    return redirect(res, `/oauth/consent?txn=${encodeURIComponent(id)}`, { "Set-Cookie": cookie });
  }
  redirect(res, up.next.startsWith("web:") ? up.next.slice(4) : "/tokens", { "Set-Cookie": cookie });
}

function repoPicker(user: User, prefix = ""): { html: string; any: boolean } {
  const mine = repos.map((r) => ({ r, role: roleOn(user, r) })).filter((x) => x.role);
  const rows = mine
    .map(
      ({ r, role }, i) => `<label class="opt"><input type="checkbox" name="${prefix}repos" value="${esc(r.id)}" ${i === 0 ? "checked" : ""}>
<span><b>${esc(r.id)}</b> <span class="muted">· your role: ${role}</span><br><span class="muted">${esc(r.description || r.name)}</span></span>
<span style="margin-left:auto;white-space:nowrap"><input type="radio" name="${prefix}default_repo" value="${esc(r.id)}" ${i === 0 ? "checked" : ""} aria-label="Default repo ${esc(r.id)}"> default</span></label>`,
    )
    .join("");
  return { html: rows, any: mine.length > 0 };
}

function levelPicker(user: User, name = "level"): string {
  const best = repos.reduce((acc, r) => {
    const role = roleOn(user, r);
    const rank = { viewer: 0, contributor: 1, maintainer: 2, admin: 3 }[role ?? "viewer"] ?? -1;
    return Math.max(acc, role ? rank : -1);
  }, -1);
  const opts = LEVELS.filter((l) => ({ viewer: 0, contributor: 1, maintainer: 2 })[l.minRole] <= Math.max(best, 0));
  // Least privilege by default: the person has to choose more on purpose.
  return `<select name="${name}" id="${name}">${opts.map((l, i) => `<option value="${l.id}" ${i === 0 ? "selected" : ""}>${l.label}</option>`).join("")}</select>`;
}

export function consentPage(req: IncomingMessage, res: ServerResponse) {
  const q = new URL(req.url ?? "/", config.publicUrl).searchParams;
  const id = q.get("txn") ?? "";
  const t = getTxn<AuthzTxn>(id, "authz");
  const s = sessionOf(req);
  if (!t || !s || t.userId !== s.user.id) return page(res, "Expired", `<div class="card"><h1>Request expired</h1><p>Start again from your app.</p></div>`, 400);
  const picker = repoPicker(s.user);
  if (!picker.any)
    return page(res, "No access", `<div class="card"><h1>No repos for you yet</h1><p>${esc(s.user.email)} has no role on any repo. Ask an admin.</p></div>`, 403);
  page(
    res,
    "Allow access",
    `<form class="card" method="post" action="/oauth/consent">
<h1>Allow an app to use ygitbox as you?</h1>
<p>The app calls itself <b>“${esc(t.clientName)}”</b> <span class="muted">(name chosen by the app, not verified)</span>.<br>
After you allow, access is sent to <code>${esc(new URL(t.redirectUri).host)}</code>. Continue only if you just started this from your own AI client.</p>
<p class="muted">Signed in as <b>${esc(s.user.name)}</b> (${esc(s.user.email)}). Everything it writes is committed under your name.</p>
<h2>Repos</h2>${picker.html}
<h2>Access</h2>${levelPicker(s.user)}
<p class="muted" style="margin-top:8px">Your role on each repo still applies; this can only narrow it. The grant lasts until you revoke it on the tokens page.</p>
<input type="hidden" name="txn" value="${esc(id)}"><input type="hidden" name="csrf" value="${esc(s.csrf)}">
<div class="row"><button name="action" value="allow" type="submit">Allow</button><button class="secondary" name="action" value="deny" type="submit">Cancel</button></div>
</form>`,
  );
}

export async function consentSubmit(req: IncomingMessage, res: ServerResponse) {
  const f = await readForm(req);
  const id = f.get("txn") ?? "";
  const t = getTxn<AuthzTxn>(id, "authz");
  const s = sessionOf(req);
  if (!t || !s || t.userId !== s.user.id || f.get("csrf") !== s.csrf)
    return page(res, "Expired", `<div class="card"><h1>Request expired</h1><p>Start again from your app.</p></div>`, 400);
  delTxn(id);
  const u = new URL(t.redirectUri);
  if (t.state) u.searchParams.set("state", t.state);
  if (f.get("action") !== "allow") {
    u.searchParams.set("error", "access_denied");
    return redirect(res, u.toString());
  }
  const chosen = f.getAll("repos").filter((r) => repos.some((x) => x.id === r && roleOn(s.user, x)));
  if (!chosen.length) {
    u.searchParams.set("error", "access_denied");
    u.searchParams.set("error_description", "no repo selected");
    return redirect(res, u.toString());
  }
  const def = f.get("default_repo");
  const level = LEVELS.find((l) => l.id === f.get("level")) ?? LEVELS[0]!;
  const code = randomId(32);
  putTxn(
    "code",
    {
      clientId: t.clientId,
      redirectUri: t.redirectUri,
      challenge: t.challenge,
      userId: s.user.id,
      scopes: level.scopes,
      repos: chosen,
      defaultRepo: def && chosen.includes(def) ? def : chosen[0],
    },
    120,
    sha256(code),
  );
  u.searchParams.set("code", code);
  redirect(res, u.toString());
}

// ── token endpoint ──────────────────────────────────────────────────────────

const b64url = (b: Buffer) => b.toString("base64url");

function tokenPair(p: { userId: number; clientId: string; scopes: Scope[]; repos: string[]; defaultRepo: string | null; family: string }) {
  const at = issueToken({ kind: "at", userId: p.userId, clientId: p.clientId, scopes: p.scopes, repos: p.repos, defaultRepo: p.defaultRepo, ttlSec: config.accessTtlSec, family: p.family });
  const rt = issueToken({ kind: "rt", userId: p.userId, clientId: p.clientId, scopes: p.scopes, repos: p.repos, defaultRepo: p.defaultRepo, ttlSec: config.refreshTtlSec, family: p.family });
  return {
    access_token: at.token,
    token_type: "Bearer",
    expires_in: config.accessTtlSec,
    refresh_token: rt.token,
    scope: p.scopes.join(" "),
  };
}

export async function token(req: IncomingMessage, res: ServerResponse) {
  const f = await readForm(req);
  const err = (e: string, d: string, status = 400) => json(res, status, { error: e, error_description: d });
  const grant = f.get("grant_type");
  if (grant === "authorization_code") {
    const code = f.get("code") ?? "";
    const c = getTxn<{ clientId: string; redirectUri: string; challenge: string; userId: number; scopes: Scope[]; repos: string[]; defaultRepo: string }>(
      sha256(code),
      "code",
    );
    if (!c) return err("invalid_grant", "code is invalid or expired");
    delTxn(sha256(code)); // single use, even on failure below
    if (f.get("client_id") !== c.clientId) return err("invalid_grant", "client_id mismatch");
    if (f.get("redirect_uri") && f.get("redirect_uri") !== c.redirectUri) return err("invalid_grant", "redirect_uri mismatch");
    const verifier = f.get("code_verifier") ?? "";
    if (b64url(createHash("sha256").update(verifier).digest()) !== c.challenge) return err("invalid_grant", "PKCE verification failed");
    return json(res, 200, tokenPair({ userId: c.userId, clientId: c.clientId, scopes: c.scopes, repos: c.repos, defaultRepo: c.defaultRepo, family: `fam_${randomId(9)}` }));
  }
  if (grant === "refresh_token") {
    const raw = f.get("refresh_token") ?? "";
    const row = db.query("select * from tokens where hash = ? and kind = 'rt'").get(sha256(raw)) as TokenRow | null;
    if (!row) return err("invalid_grant", "unknown refresh token");
    if (row.revoked_at) {
      // A rotated-out refresh token came back: treat as theft and kill the whole grant.
      if (row.family) revokeFamily(row.family);
      return err("invalid_grant", "refresh token was already used; the grant has been revoked");
    }
    if (row.expires_at && row.expires_at < now()) return err("invalid_grant", "refresh token expired");
    if (f.get("client_id") && f.get("client_id") !== row.client_id) return err("invalid_grant", "client_id mismatch");
    revokeToken(row.id);
    return json(
      res,
      200,
      tokenPair({
        userId: row.user_id,
        clientId: row.client_id!,
        scopes: row.scopes.split(" ") as Scope[],
        repos: row.repos ? row.repos.split(",") : [],
        defaultRepo: row.default_repo,
        family: row.family ?? `fam_${randomId(9)}`,
      }),
    );
  }
  err("unsupported_grant_type", "use authorization_code or refresh_token");
}

export async function revoke(req: IncomingMessage, res: ServerResponse) {
  const f = await readForm(req);
  const raw = f.get("token") ?? "";
  const row = db.query("select id, family from tokens where hash = ?").get(sha256(raw)) as { id: string; family: string | null } | null;
  if (row) row.family ? revokeFamily(row.family) : revokeToken(row.id);
  res.writeHead(200).end();
}

// ── web: login + personal tokens ────────────────────────────────────────────

export function login(req: IncomingMessage, res: ServerResponse) {
  if (!oidcEnabled()) return page(res, "SSO off", `<div class="card"><h1>Single sign-on is not configured</h1></div>`, 503);
  upstreamRedirect(res, "web:/tokens");
}

export function logout(req: IncomingMessage, res: ServerResponse) {
  const raw = cookieOf(req, COOKIE);
  if (raw) db.query("delete from sessions where id_hash = ?").run(sha256(raw));
  redirect(res, "/", { "Set-Cookie": `${COOKIE}=; Max-Age=0; Path=/` });
}

function tokensBody(user: User, csrf: string, created?: { token: string; label: string }) {
  const rows = db
    .query("select * from tokens where user_id = ? and revoked_at is null and kind in ('pat','rt') and (expires_at is null or expires_at > ?) order by created_at desc")
    .all(user.id, now()) as TokenRow[];
  const clientName = (id: string | null) =>
    id ? ((db.query("select name from oauth_clients where client_id = ?").get(id) as { name: string } | null)?.name ?? id) : "";
  const list = rows.length
    ? `<table><tr><th>Name</th><th>Access</th><th>Expires</th><th></th></tr>${rows
        .map(
          (t) => `<tr><td>${esc(t.kind === "pat" ? (t.label ?? "token") : `${clientName(t.client_id)} (app)`)}</td>
<td class="muted">${esc(t.scopes.replaceAll("repo:", ""))}<br>${esc(t.repos ?? "all repos")}${t.default_repo ? ` · default ${esc(t.default_repo)}` : ""}</td>
<td class="muted">${t.expires_at ? new Date(t.expires_at * 1000).toISOString().slice(0, 10) : "never"}</td>
<td><form method="post" action="/tokens/revoke"><input type="hidden" name="id" value="${esc(t.id)}"><input type="hidden" name="csrf" value="${esc(csrf)}"><button class="danger" type="submit">Revoke</button></form></td></tr>`,
        )
        .join("")}</table>`
    : `<p class="muted">No active tokens or app grants.</p>`;
  const picker = repoPicker(user, "");
  const fresh = created
    ? `<div class="card"><h1>Token “${esc(created.label)}” created</h1><p>Copy it now. It is not shown again.</p><code class="token">${esc(created.token)}</code>
<p class="muted">Use it as <code>Authorization: Bearer …</code> against <code>${esc(config.publicUrl)}/mcp</code>.</p></div>`
    : "";
  return `${fresh}<div class="card"><h1>Your access</h1><p class="muted">Signed in as <b>${esc(user.name)}</b> (${esc(user.email)}) · <a href="/logout">Sign out</a></p>${list}</div>
<form class="card" method="post" action="/tokens"><h1>New personal access token</h1>
<p class="muted">For clients that cannot do OAuth, scripts and CI. Belongs to you; commits are authored as you.</p>
<label for="label">Name</label><input type="text" id="label" name="label" required maxlength="60" placeholder="e.g. laptop claude code">
<h2>Repos</h2>${picker.any ? picker.html : '<p class="muted">You have no repo roles yet.</p>'}
<h2>Access</h2>${levelPicker(user)}
<h2>Expires in (days)</h2><input type="number" id="days" name="days" min="1" max="${config.patMaxDays}" value="${config.patDefaultDays}">
<input type="hidden" name="csrf" value="${esc(csrf)}"><div class="row"><button type="submit">Create token</button></div></form>`;
}

export async function tokensPage(req: IncomingMessage, res: ServerResponse) {
  const s = sessionOf(req);
  if (!s) return redirect(res, "/login");
  if (req.method === "POST") {
    const f = await readForm(req);
    if (f.get("csrf") !== s.csrf) return page(res, "Expired", `<div class="card"><h1>Form expired</h1><p><a href="/tokens">Reload</a></p></div>`, 400);
    const chosen = f.getAll("repos").filter((r) => repos.some((x) => x.id === r && roleOn(s.user, x)));
    if (!chosen.length) return page(res, "Tokens", tokensBody(s.user, s.csrf), 400);
    const level = LEVELS.find((l) => l.id === f.get("level")) ?? LEVELS[0]!;
    const def = f.get("default_repo");
    const label = (f.get("label") ?? "token").trim().slice(0, 60) || "token";
    const t = issueToken({
      kind: "pat",
      userId: s.user.id,
      label,
      scopes: level.scopes,
      repos: chosen,
      defaultRepo: def && chosen.includes(def) ? def : chosen[0]!,
      ttlSec: patTtl(Number(f.get("days")) || undefined),
    });
    return page(res, "Tokens", tokensBody(s.user, s.csrf, { token: t.token, label }));
  }
  page(res, "Tokens", tokensBody(s.user, s.csrf));
}

export async function tokensRevoke(req: IncomingMessage, res: ServerResponse) {
  const s = sessionOf(req);
  if (!s) return redirect(res, "/login");
  const f = await readForm(req);
  if (f.get("csrf") !== s.csrf) return redirect(res, "/tokens");
  const row = db.query("select id, family from tokens where id = ? and user_id = ?").get(f.get("id") ?? "", s.user.id) as {
    id: string;
    family: string | null;
  } | null;
  if (row) row.family ? revokeFamily(row.family) : revokeToken(row.id);
  redirect(res, "/tokens");
}

export function home(req: IncomingMessage, res: ServerResponse) {
  const s = sessionOf(req);
  page(
    res,
    "Home",
    `<div class="card"><h1>ygitbox</h1><p>Change company Git repos from your AI client, without a Git account.</p>
<p>MCP endpoint: <code>${esc(config.publicUrl)}/mcp</code></p>
<pre class="token">{ "mcpServers": { "ygitbox": { "type": "http", "url": "${esc(config.publicUrl)}/mcp" } } }</pre>
<div class="row">${s ? `<a href="/tokens">Manage tokens (${esc(s.user.email)})</a>` : oidcEnabled() ? `<a href="/login">Sign in to manage tokens</a>` : ""}</div></div>`,
  );
}
