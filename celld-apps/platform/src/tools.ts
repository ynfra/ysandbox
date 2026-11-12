import * as ops from "./ops";
import type { Env } from "./types";

export interface Tool {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: Record<string, unknown>;
  run(env: Env, args: any): Promise<unknown>;
}

const str = (description: string) => ({ type: "string", description });
const obj = (properties: Record<string, unknown>, required: string[] = []) => ({ type: "object", properties, required });
const SLUG = str("App slug as returned by create_app or list_apps.");
const ENC = { type: "string", enum: ["utf8", "base64"], description: "How file contents are encoded. Default utf8; use base64 for images and other binary files." };
const VIS = { type: "string", enum: ["private", "org", "link", "public"], description: "private: owner only; org: signed-in colleagues; link: anyone with the URL; public: anyone." };

const withUrl = (env: Env, a: { slug: string }) => ops.withUrl(env, a);
const app = async (env: Env, slug: string) => ops.registry(env).getApp(slug);

export const tools: Tool[] = [
  {
    name: "create_app",
    title: "Create app",
    description: "Create an empty app and reserve its URL. Returns the slug and URL (https-style subdomain, one per app). Nothing is served until you call deploy. If slug is omitted it is derived from the name plus a random suffix.",
    inputSchema: obj({ name: str("Human-readable app name."), slug: str("Optional explicit slug: lowercase letters, digits and dashes, max 42 chars."), visibility: VIS }, ["name"]),
    run: async (env, a) => withUrl(env, await ops.registry(env).createApp(a.name, a.slug, a.visibility)),
  },
  {
    name: "deploy",
    title: "Deploy files",
    description:
      "Publish a complete set of static files as a new version of an app and switch to it atomically. Pass every file the app needs (not a diff); previous versions are kept for rollback. / serves index.html and unknown extensionless paths fall back to index.html (SPA). Use absolute asset paths like /assets/app.js freely. If a file named seed.sql is included, or seed_sql is given, it is run against the app's SQLite database, but only while the database has no tables, so redeploys keep user data. For large or binary bundles use get_upload_url instead.",
    inputSchema: obj({ slug: SLUG, files: { type: "object", additionalProperties: { type: "string" }, description: "Map of file path (relative, e.g. index.html or assets/app.js) to file content." }, encoding: ENC, seed_sql: str("SQL script (CREATE TABLE / INSERT ...) to initialize the database on first deploy."), note: str("Short note describing this version.") }, ["slug", "files"]),
    run: async (env, a) => ops.deploy(env, a.slug, ops.decodeFiles(a.files, a.encoding), { seed_sql: a.seed_sql, note: a.note }),
  },
  {
    name: "get_upload_url",
    title: "Get zip upload URL",
    description: "Returns the REST endpoint and a ready-to-run curl command for deploying a zip archive (HTTP POST, Content-Type application/zip) without pushing file contents through the conversation. A single top-level folder such as dist/ is stripped automatically. Run the curl from a shell that can reach the server.",
    inputSchema: obj({ slug: SLUG }, ["slug"]),
    run: async (env, a) => {
      await app(env, a.slug);
      const url = `${ops.rootUrl(env)}/api/apps/${a.slug}/deploy`;
      return { method: "POST", url, content_type: "application/zip", curl: `(cd dist && zip -qr ../bundle.zip .) && curl -sS -X POST -H 'Content-Type: application/zip' --data-binary @bundle.zip ${url}` };
    },
  },
  {
    name: "db_query",
    title: "Run SQL",
    description: "Run SQL against the app's private SQLite database. Accepts any statement (SELECT, INSERT, UPDATE, CREATE TABLE ...) and, without params, multi-statement scripts; the result is for the last statement. Use ? placeholders with params for values. Returns {rows, columns, rowsWritten}.",
    inputSchema: obj({ slug: SLUG, sql: str("SQL text."), params: { type: "array", items: {}, description: "Positional values for ? placeholders." } }, ["slug", "sql"]),
    run: async (env, a) => ops.appHost(env, (await app(env, a.slug)).id).sql(a.sql, a.params ?? []),
  },
  {
    name: "db_import",
    title: "Import rows",
    description: "Bulk-load an array of JSON objects into a table of the app's database. The table is created from the union of keys; column types (INTEGER, REAL, TEXT) are inferred, and nested objects/arrays are stored as JSON text. mode replace (default) drops and recreates the table; append adds rows (and any new columns).",
    inputSchema: obj({ slug: SLUG, table: str("Table name: letters, digits, underscore."), rows: { type: "array", items: { type: "object" }, description: "Rows to insert." }, mode: { type: "string", enum: ["replace", "append"], description: "Default replace." } }, ["slug", "table", "rows"]),
    run: async (env, a) => ops.appHost(env, (await app(env, a.slug)).id).importRows(a.table, a.rows, a.mode),
  },
  {
    name: "db_schema",
    title: "Show schema",
    description: "List the tables and columns (name, type, primary key, not null) in the app's database.",
    inputSchema: obj({ slug: SLUG }, ["slug"]),
    run: async (env, a) => ({ tables: await ops.appHost(env, (await app(env, a.slug)).id).schema() }),
  },
  {
    name: "list_apps",
    title: "List apps",
    description: "List all apps with slug, name, URL, current version, visibility and update time.",
    inputSchema: obj({}),
    run: async (env) => ({ apps: await Promise.all((await ops.registry(env).listApps()).map((a) => withUrl(env, a))) }),
  },
  {
    name: "get_app",
    title: "Get app",
    description: "Get one app's details including its full version history (n, created_at, files, bytes, note). current_version is the one being served.",
    inputSchema: obj({ slug: SLUG }, ["slug"]),
    run: async (env, a) => withUrl(env, await app(env, a.slug)),
  },
  {
    name: "rollback",
    title: "Roll back version",
    description: "Serve a previous version of the app's files. Does not touch database contents. Find version numbers with get_app. Rolling back does not delete newer versions.",
    inputSchema: obj({ slug: SLUG, version: { type: "integer", description: "Version number to serve." } }, ["slug", "version"]),
    run: async (env, a) => withUrl(env, await ops.registry(env).rollback(a.slug, Number(a.version))),
  },
  {
    name: "set_visibility",
    title: "Set visibility",
    description: "Set who may open the app: private, org, link or public. The value is stored now and enforced once authentication is enabled on the platform; until then every app is reachable by anyone who can reach the server.",
    inputSchema: obj({ slug: SLUG, visibility: VIS }, ["slug", "visibility"]),
    run: async (env, a) => withUrl(env, await ops.registry(env).setVisibility(a.slug, a.visibility)),
  },
  {
    name: "delete_app",
    title: "Delete app",
    description: "Permanently delete an app: its URL, all versions of its files and its database. This cannot be undone; confirm with the user first.",
    inputSchema: obj({ slug: SLUG }, ["slug"]),
    annotations: { destructiveHint: true, readOnlyHint: false },
    run: async (env, a) => ops.deleteApp(env, a.slug),
  },
];
