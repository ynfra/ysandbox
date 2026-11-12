import type { IncomingMessage } from "node:http";
import { admins, config, repoById, repos, type RepoConfig, type Role } from "./config.ts";
import { db, now, randomId, sha256, userById, type User } from "./db.ts";

export type Scope = "repo:read" | "repo:propose" | "repo:review" | "repo:admin";
export const ALL_SCOPES: Scope[] = ["repo:read", "repo:propose", "repo:review", "repo:admin"];

const ROLE_ORDER: Role[] = ["viewer", "contributor", "maintainer", "admin"];
const ROLE_SCOPES: Record<Role, Scope[]> = {
  viewer: ["repo:read"],
  contributor: ["repo:read", "repo:propose"],
  maintainer: ["repo:read", "repo:propose", "repo:review"],
  admin: ALL_SCOPES,
};

/** Highest role the user holds on a repo, from repos.yaml (email lists or "*"). */
export function roleOn(user: User, repo: RepoConfig): Role | null {
  if (admins.includes(user.email)) return "admin";
  let best: Role | null = null;
  for (const role of ROLE_ORDER) {
    const list = (repo.roles[role] ?? []).map((x) => x.toLowerCase());
    if (list.includes("*") || list.includes(user.email)) best = role;
  }
  return best;
}

export interface Caller {
  user: User;
  tokenId: string;
  tokenKind: "pat" | "oauth";
  clientName: string | null;
  /** Token scope ceiling; the effective scope per repo is this ∩ the role's scopes. */
  tokenScopes: Set<Scope>;
  /** Repos the token is limited to; null = every repo the user has a role on. */
  tokenRepos: string[] | null;
  defaultRepo: string | null;
}

export function scopesOn(c: Caller, repo: RepoConfig): Set<Scope> {
  const role = roleOn(c.user, repo);
  if (!role) return new Set();
  if (c.tokenRepos && !c.tokenRepos.includes(repo.id)) return new Set();
  return new Set(ROLE_SCOPES[role].filter((s) => c.tokenScopes.has(s)));
}

export function visibleRepos(c: Caller): RepoConfig[] {
  return repos.filter((r) => scopesOn(c, r).has("repo:read"));
}

/** Union of scopes across all repos: decides which tools are listed at all. */
export function anyScope(c: Caller): Set<Scope> {
  const out = new Set<Scope>();
  for (const r of repos) for (const s of scopesOn(c, r)) out.add(s);
  return out;
}

// ── tokens ──────────────────────────────────────────────────────────────────

export interface TokenRow {
  id: string;
  kind: string;
  user_id: number;
  label: string | null;
  client_id: string | null;
  scopes: string;
  repos: string | null;
  default_repo: string | null;
  expires_at: number | null;
  revoked_at: number | null;
  created_at: number;
  last_used_at: number | null;
  family: string | null;
}

export function issueToken(p: {
  kind: "pat" | "at" | "rt";
  userId: number;
  label?: string;
  clientId?: string;
  scopes: Scope[];
  repos: string[] | null;
  defaultRepo: string | null;
  ttlSec: number;
  family?: string;
}): { token: string; id: string; expiresAt: number } {
  for (const r of p.repos ?? []) if (!repoById(r)) throw new Error(`unknown repo "${r}"`);
  if (p.defaultRepo && !repoById(p.defaultRepo)) throw new Error(`unknown repo "${p.defaultRepo}"`);
  const token = `ygb_${p.kind}_${randomId(24)}`;
  const id = `tok_${randomId(9)}`;
  const expiresAt = now() + p.ttlSec;
  db.query(
    `insert into tokens(id, hash, kind, user_id, label, client_id, scopes, repos, default_repo, expires_at, created_at, family)
     values (?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    id,
    sha256(token),
    p.kind,
    p.userId,
    p.label ?? null,
    p.clientId ?? null,
    p.scopes.join(" "),
    p.repos ? p.repos.join(",") : null,
    p.defaultRepo,
    expiresAt,
    now(),
    p.family ?? null,
  );
  return { token, id, expiresAt };
}

export function findToken(raw: string, kind: "pat" | "at" | "rt"): TokenRow | null {
  const row = db.query("select * from tokens where hash = ? and kind = ?").get(sha256(raw), kind) as TokenRow | null;
  if (!row || row.revoked_at || (row.expires_at && row.expires_at < now())) return null;
  return row;
}

export function revokeToken(id: string): void {
  db.query("update tokens set revoked_at = ? where id = ? and revoked_at is null").run(now(), id);
}

export function revokeFamily(family: string): void {
  db.query("update tokens set revoked_at = ? where family = ? and revoked_at is null").run(now(), family);
}

function header(req: IncomingMessage, name: string): string {
  const v = req.headers[name.toLowerCase()];
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

/** Resolve the Bearer token on an MCP request. Returns null for missing/invalid (caller answers 401). */
export function callerFrom(req: IncomingMessage): Caller | null {
  const raw = header(req, "authorization").replace(/^Bearer\s+/i, "").trim();
  if (!raw) return null;
  const kind = raw.startsWith("ygb_pat_") ? "pat" : raw.startsWith("ygb_at_") ? "at" : null;
  if (!kind) return null;
  const row = findToken(raw, kind);
  if (!row) return null;
  const user = userById(row.user_id);
  if (!user) return null;
  db.query("update tokens set last_used_at = ? where id = ?").run(now(), row.id);
  const client = row.client_id
    ? ((db.query("select name from oauth_clients where client_id = ?").get(row.client_id) as { name: string } | null)?.name ?? null)
    : null;
  // X-Ygitbox-Repo may pick the default repo, but only among repos the token already allows.
  const hdrRepo = header(req, "x-ygitbox-repo");
  const tokenRepos = row.repos ? row.repos.split(",") : null;
  const defaultRepo = hdrRepo && (!tokenRepos || tokenRepos.includes(hdrRepo)) && repoById(hdrRepo) ? hdrRepo : row.default_repo;
  return {
    user,
    tokenId: row.id,
    tokenKind: kind === "pat" ? "pat" : "oauth",
    clientName: client,
    tokenScopes: new Set(row.scopes.split(" ").filter(Boolean) as Scope[]),
    tokenRepos,
    defaultRepo,
  };
}

export const patTtl = (days?: number) =>
  Math.min(Math.max(1, days ?? config.patDefaultDays), config.patMaxDays) * 24 * 3600;
