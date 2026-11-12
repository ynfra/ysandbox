/**
 * OAuth 2.1 flow end to end, the way an MCP client (Claude Code, Cursor) does it:
 * discovery → DCR → PKCE authorize → upstream SSO login (Forgejo) → consent
 * (repo choice) → code → token → MCP call → refresh rotation → reuse detection.
 *   cd app && bun run test/oauth.ts [user]   (default user: sam, who has no Git repo access)
 */
import { createHash, randomBytes } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const YG = "http://localhost:8790";
const USER = process.argv[2] ?? "sam";
const REDIRECT = "http://localhost:53682/callback";

let failed = 0;
const ok = (c: unknown, name: string, detail = "") => {
  console.log(c ? `  \x1b[32m✓\x1b[0m ${name}` : `  \x1b[31m✗ ${name}\x1b[0m ${detail.slice(0, 600)}`);
  if (!c) failed++;
};

/** Minimal per-origin cookie jar + manual redirects, so every hop is visible. */
const jar = new Map<string, Map<string, string>>();
async function hop(url: string, init: RequestInit = {}): Promise<Response> {
  const u = new URL(url);
  const cookies = jar.get(u.host) ?? new Map();
  const headers = new Headers(init.headers);
  if (cookies.size) headers.set("Cookie", [...cookies].map(([k, v]) => `${k}=${v}`).join("; "));
  const res = await fetch(url, { ...init, headers, redirect: "manual" });
  for (const sc of res.headers.getSetCookie()) {
    const [kv] = sc.split(";");
    const i = kv!.indexOf("=");
    cookies.set(kv!.slice(0, i).trim(), kv!.slice(i + 1).trim());
  }
  jar.set(u.host, cookies);
  return res;
}
const loc = (r: Response, base: string) => new URL(r.headers.get("location")!, base).toString();
const hidden = (html: string) => {
  const out = new URLSearchParams();
  for (const m of html.matchAll(/<input[^>]*type="hidden"[^>]*>/g)) {
    const name = /name="([^"]+)"/.exec(m[0])?.[1];
    const value = /value="([^"]*)"/.exec(m[0])?.[1] ?? "";
    if (name) out.set(name, value.replaceAll("&amp;", "&").replaceAll("&#39;", "'").replaceAll("&quot;", '"'));
  }
  return out;
};

console.log(`\x1b[1mOAuth flow as "${USER}"\x1b[0m`);

// 1. discovery from a bare 401
const r401 = await fetch(`${YG}/mcp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
const prmUrl = /resource_metadata="([^"]+)"/.exec(r401.headers.get("www-authenticate") ?? "")?.[1]!;
const prm: any = await (await fetch(prmUrl)).json();
const asm: any = await (await fetch(`${prm.authorization_servers[0]}/.well-known/oauth-authorization-server`)).json();
ok(asm.authorization_endpoint && asm.token_endpoint, "discovered AS from 401 → protected-resource metadata");

// 2. dynamic client registration
const reg: any = await (
  await fetch(asm.registration_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_name: "Claude Code (oauth test)", redirect_uris: [REDIRECT], token_endpoint_auth_method: "none" }),
  })
).json();
ok(reg.client_id?.startsWith("ygbc_"), "DCR issued a client_id");
const badReg = await fetch(asm.registration_endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ redirect_uris: ["http://evil.example.com/cb"] }),
});
ok(badReg.status === 400, "DCR refuses non-https, non-localhost redirect");

// 3. authorize with PKCE
const verifier = randomBytes(32).toString("base64url");
const challenge = createHash("sha256").update(verifier).digest("base64url");
const state = randomBytes(8).toString("hex");
const az = new URL(asm.authorization_endpoint);
for (const [k, v] of Object.entries({
  response_type: "code",
  client_id: reg.client_id,
  redirect_uri: REDIRECT,
  code_challenge: challenge,
  code_challenge_method: "S256",
  state,
  resource: prm.resource,
  scope: "repo:read repo:propose",
}))
  az.searchParams.set(k, v);
let r = await hop(az.toString());
ok(r.status === 302 && r.headers.get("location")!.startsWith("http://localhost:3300/login/oauth/authorize"), "ygitbox sends the browser to the IdP");

// 4. upstream IdP (Forgejo) login + app grant
let next = loc(r, YG);
r = await hop(next); // Forgejo: not logged in → /user/login
next = loc(r, next);
let html = await (await hop(next)).text();
const form = hidden(html);
form.set("user_name", USER);
form.set("password", "ygitbox-demo");
r = await hop("http://localhost:3300/user/login", { method: "POST", body: form, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
next = loc(r, "http://localhost:3300");
for (let i = 0; i < 6 && !next.startsWith(YG); i++) {
  r = await hop(next);
  if (r.status === 200) {
    html = await r.text();
    if (html.includes("/login/oauth/grant")) {
      // first time this user authorizes the ygitbox app at the IdP
      const g = hidden(html);
      g.set("granted", "true");
      r = await hop("http://localhost:3300/login/oauth/grant", { method: "POST", body: g, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
    } else throw new Error(`unexpected IdP page at ${next}: ${html.slice(0, 300)}`);
  }
  next = loc(r, next);
}
ok(next.startsWith(`${YG}/auth/callback`), "IdP redirected back to ygitbox /auth/callback");

// 5. consent: choose repos + default + level
r = await hop(next);
next = loc(r, YG);
ok(next.includes("/oauth/consent"), "ygitbox shows its consent screen");
html = await (await hop(next)).text();
ok(html.includes("Claude Code (oauth test)") && html.includes("skills") && html.includes("handbook"), "consent lists the client and the user's repos");
const consent = hidden(html);
consent.append("repos", "skills");
consent.set("default_repo", "skills");
consent.set("level", "propose");
consent.set("action", "allow");
r = await hop(`${YG}/oauth/consent`, { method: "POST", body: consent, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
const back = new URL(loc(r, YG));
ok(back.origin + back.pathname === REDIRECT && back.searchParams.get("state") === state && back.searchParams.get("code"), "redirected to the client with code + state");
const code = back.searchParams.get("code")!;

// 6. token exchange (wrong verifier first)
const tok = (body: Record<string, string>) =>
  fetch(asm.token_endpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(body) });
const wrongPkce = await tok({ grant_type: "authorization_code", code, client_id: reg.client_id, redirect_uri: REDIRECT, code_verifier: "nope" });
ok(wrongPkce.status === 400, "wrong PKCE verifier rejected (and burns the code)");
// The code is single-use, so redo authorize quickly with the existing IdP session for the happy path.
r = await hop(az.toString());
next = loc(r, YG);
for (let i = 0; i < 6 && !next.startsWith(YG); i++) {
  r = await hop(next);
  if (r.status === 200) throw new Error("IdP asked again");
  next = loc(r, next);
}
r = await hop(next);
html = await (await hop(loc(r, YG))).text();
const c2 = hidden(html);
c2.append("repos", "skills");
c2.set("default_repo", "skills");
c2.set("level", "propose");
c2.set("action", "allow");
r = await hop(`${YG}/oauth/consent`, { method: "POST", body: c2, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
const code2 = new URL(loc(r, YG)).searchParams.get("code")!;
const t1: any = await (await tok({ grant_type: "authorization_code", code: code2, client_id: reg.client_id, redirect_uri: REDIRECT, code_verifier: verifier })).json();
ok(t1.access_token?.startsWith("ygb_at_") && t1.refresh_token?.startsWith("ygb_rt_") && t1.expires_in === 3600, "token endpoint issued access + refresh");
const replay = await tok({ grant_type: "authorization_code", code: code2, client_id: reg.client_id, redirect_uri: REDIRECT, code_verifier: verifier });
ok(replay.status === 400, "authorization code is single-use");

// 7. use it
const mcp = async (at: string) => {
  const c = new Client({ name: "oauth-test", version: "0" });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${YG}/mcp`), { requestInit: { headers: { Authorization: `Bearer ${at}` } } }));
  return c;
};
const client = await mcp(t1.access_token);
const who: any = await client.callTool({ name: "whoami", arguments: {} });
const whoText = who.content[0].text as string;
ok(whoText.includes(`${USER}@example.com`) && whoText.includes("OAuth (Claude Code (oauth test))"), "MCP whoami as the SSO user", whoText);
ok(whoText.includes("Default repo: skills") && !whoText.includes("handbook"), "token limited to the repo chosen at consent", whoText);
const write: any = await client.callTool({
  name: "write_file",
  arguments: { path: `notes/${USER}/oauth-${Date.now()}.md`, content: "written via OAuth\n" },
});
ok(!write.isError && String(write.content[0].text).includes("Committed directly"), "SSO user with no Git access writes to their notes", write.content[0].text);

// 8. refresh rotation + reuse detection
const t2: any = await (await tok({ grant_type: "refresh_token", refresh_token: t1.refresh_token, client_id: reg.client_id })).json();
ok(t2.access_token && t2.refresh_token && t2.refresh_token !== t1.refresh_token, "refresh rotates the refresh token");
const reuse: any = await (await tok({ grant_type: "refresh_token", refresh_token: t1.refresh_token, client_id: reg.client_id })).json();
ok(reuse.error === "invalid_grant" && String(reuse.error_description).includes("revoked"), "reusing an old refresh token revokes the grant");
const dead = await fetch(`${YG}/mcp`, { method: "POST", headers: { Authorization: `Bearer ${t2.access_token}`, "Content-Type": "application/json" }, body: "{}" });
ok(dead.status === 401, "after reuse detection, the newest access token is dead too");

console.log(failed ? `\x1b[31m${failed} failed\x1b[0m` : "\x1b[32mOAuth flow OK\x1b[0m");
process.exit(failed ? 1 : 0);
