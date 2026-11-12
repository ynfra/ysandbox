import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { config } from "./config.ts";

const clean = (s: string) => s.replace(/[\x00-\x1f\x7f<>]+/g, " ").trim().slice(0, 100);

mkdirSync(dirname(config.dbPath), { recursive: true });
export const db = new Database(config.dbPath, { create: true, strict: true });
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");

db.exec(`
create table if not exists users(
  id integer primary key, email text unique not null, name text not null,
  slug text unique not null, created_at integer not null);
create table if not exists tokens(
  id text primary key, hash text unique not null, kind text not null,
  user_id integer not null references users(id), label text, client_id text,
  scopes text not null, repos text, default_repo text,
  expires_at integer, revoked_at integer, created_at integer not null,
  last_used_at integer, family text);
create table if not exists oauth_clients(
  client_id text primary key, name text, redirect_uris text not null, created_at integer not null);
create table if not exists txns(
  id text primary key, kind text not null, data text not null, expires_at integer not null);
create table if not exists sessions(
  id_hash text primary key, user_id integer not null references users(id),
  csrf text not null, expires_at integer not null);
create table if not exists changes(
  id text primary key, repo text not null, author_id integer not null references users(id),
  title text not null, description text not null default '', branch text not null,
  base_sha text, status text not null, pr_number integer, pr_url text, merged_sha text,
  required_approvals integer not null default 1,
  created_at integer not null, updated_at integer not null);
create index if not exists changes_repo_status on changes(repo, status);
create table if not exists approvals(
  change_id text not null references changes(id), user_id integer not null references users(id),
  head_sha text not null, comment text, created_at integer not null,
  primary key(change_id, user_id));
create table if not exists audit(
  id integer primary key, ts integer not null, user_id integer, token_id text, repo text,
  tool text not null, args_hash text, ok integer not null, error text, ms integer);
`);

export const now = () => Math.floor(Date.now() / 1000);
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const randomId = (bytes = 18) => randomBytes(bytes).toString("base64url");

/** Short human-friendly id, e.g. c-k3x9q2 (Crockford-ish alphabet, no look-alikes). */
export function shortId(prefix: string, len = 6): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const b = randomBytes(len);
  let s = "";
  for (const x of b) s += alphabet[x % alphabet.length];
  return `${prefix}-${s}`;
}

export interface User {
  id: number;
  email: string;
  name: string;
  slug: string;
}

function slugFor(email: string): string {
  const base =
    email
      .split("@")[0]!
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "user";
  let slug = base;
  for (let i = 2; db.query("select 1 from users where slug = ?").get(slug); i++) slug = `${base}-${i}`;
  return slug;
}

/** Identity always comes from a verified source (IdP or admin CLI), never from a tool argument. */
export function upsertUser(email: string, rawName: string): User {
  const e = email.trim().toLowerCase();
  if (!/^[^\s@<>]+@[^\s@<>]+$/.test(e)) throw new Error(`not a valid email: ${email}`);
  const name = clean(rawName);
  const existing = db.query("select id, email, name, slug from users where email = ?").get(e) as User | null;
  if (existing) {
    if (name && name !== existing.name) db.query("update users set name = ? where id = ?").run(name, existing.id);
    return { ...existing, name: name || existing.name };
  }
  const slug = slugFor(e);
  const r = db
    .query("insert into users(email, name, slug, created_at) values (?, ?, ?, ?) returning id")
    .get(e, name || e, slug, now()) as { id: number };
  return { id: r.id, email: e, name: name || e, slug };
}

export const userById = (id: number) =>
  db.query("select id, email, name, slug from users where id = ?").get(id) as User | null;
export const userByEmail = (email: string) =>
  db.query("select id, email, name, slug from users where email = ?").get(email.toLowerCase()) as User | null;

export function audit(e: {
  userId?: number;
  tokenId?: string;
  repo?: string;
  tool: string;
  args: unknown;
  ok: boolean;
  error?: string;
  ms: number;
}) {
  db.query(
    "insert into audit(ts, user_id, token_id, repo, tool, args_hash, ok, error, ms) values (?,?,?,?,?,?,?,?,?)",
  ).run(
    now(),
    e.userId ?? null,
    e.tokenId ?? null,
    e.repo ?? null,
    e.tool,
    sha256(JSON.stringify(e.args ?? null)).slice(0, 16),
    e.ok ? 1 : 0,
    e.error?.slice(0, 500) ?? null,
    e.ms,
  );
}
