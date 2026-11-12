import { DurableObject } from "cloudflare:workers";
import { HttpError, type AppRow, type VersionRow } from "./types";

export const VISIBILITIES = ["private", "org", "link", "public"];
const SLUG_RE = /^[a-z0-9]([a-z0-9-]{0,40}[a-z0-9])?$/;

function slugify(name: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30).replace(/-+$/, "");
  const suffix = Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => (b % 36).toString(36)).join("");
  return `${base || "app"}-${suffix}`;
}

// Single instance (idFromName("registry")): the catalog of apps and versions.
// RPC methods throw HttpError; the caller maps them to HTTP / MCP errors.
export class Registry extends DurableObject {
  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
    ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS apps(
        id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
        visibility TEXT NOT NULL DEFAULT 'private', current_version INTEGER,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS versions(
        app_id TEXT NOT NULL, n INTEGER NOT NULL, created_at TEXT NOT NULL,
        files INTEGER NOT NULL, bytes INTEGER NOT NULL, note TEXT,
        PRIMARY KEY(app_id, n));`);
  }

  private rows<T>(sql: string, ...p: unknown[]) {
    return this.ctx.storage.sql.exec(sql, ...(p as never[])).toArray() as T[];
  }

  createApp(name: string, slug?: string, visibility = "private"): AppRow {
    if (!name?.trim()) throw new HttpError(400, "name is required");
    if (!VISIBILITIES.includes(visibility)) throw new HttpError(400, `visibility must be one of ${VISIBILITIES.join(", ")}`);
    if (slug !== undefined && !SLUG_RE.test(slug)) throw new HttpError(400, "invalid slug: use lowercase letters, digits and dashes (max 42 chars)");
    const final = slug ?? slugify(name);
    if (this.rows("SELECT 1 FROM apps WHERE slug=?", final).length) throw new HttpError(409, `slug "${final}" already exists`);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    this.ctx.storage.sql.exec("INSERT INTO apps(id,slug,name,visibility,created_at,updated_at) VALUES(?,?,?,?,?,?)", id, final, name.trim(), visibility, now, now);
    return this.rows<AppRow>("SELECT * FROM apps WHERE id=?", id)[0];
  }

  listApps(): AppRow[] {
    return this.rows<AppRow>("SELECT * FROM apps ORDER BY updated_at DESC");
  }

  findApp(slug: string): AppRow | null {
    return this.rows<AppRow>("SELECT * FROM apps WHERE slug=?", slug)[0] ?? null;
  }

  getApp(slug: string): AppRow & { versions: VersionRow[] } {
    const app = this.findApp(slug);
    if (!app) throw new HttpError(404, `app "${slug}" not found`);
    return { ...app, versions: this.rows<VersionRow>("SELECT * FROM versions WHERE app_id=? ORDER BY n DESC", app.id) };
  }

  nextVersion(appId: string): number {
    return (this.rows<{ m: number | null }>("SELECT MAX(n) AS m FROM versions WHERE app_id=?", appId)[0].m ?? 0) + 1;
  }

  // Called after all files are in R2, so flipping current_version is the atomic switch.
  commitVersion(appId: string, n: number, files: number, bytes: number, note?: string) {
    const now = new Date().toISOString();
    this.ctx.storage.transactionSync(() => {
      this.ctx.storage.sql.exec("INSERT INTO versions(app_id,n,created_at,files,bytes,note) VALUES(?,?,?,?,?,?)", appId, n, now, files, bytes, note ?? null);
      this.ctx.storage.sql.exec("UPDATE apps SET current_version=?, updated_at=? WHERE id=?", n, now, appId);
    });
  }

  rollback(slug: string, version: number) {
    const app = this.getApp(slug);
    if (!app.versions.some((v) => v.n === version)) throw new HttpError(404, `version ${version} does not exist`);
    this.ctx.storage.sql.exec("UPDATE apps SET current_version=?, updated_at=? WHERE id=?", version, new Date().toISOString(), app.id);
    return this.getApp(slug);
  }

  setVisibility(slug: string, visibility: string) {
    if (!VISIBILITIES.includes(visibility)) throw new HttpError(400, `visibility must be one of ${VISIBILITIES.join(", ")}`);
    const app = this.getApp(slug);
    this.ctx.storage.sql.exec("UPDATE apps SET visibility=?, updated_at=? WHERE id=?", visibility, new Date().toISOString(), app.id);
    return this.getApp(slug);
  }

  deleteApp(slug: string): AppRow {
    const app = this.findApp(slug);
    if (!app) throw new HttpError(404, `app "${slug}" not found`);
    this.ctx.storage.sql.exec("DELETE FROM versions WHERE app_id=?", app.id);
    this.ctx.storage.sql.exec("DELETE FROM apps WHERE id=?", app.id);
    return app;
  }
}
