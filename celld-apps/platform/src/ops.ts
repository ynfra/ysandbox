import { unzipSync } from "fflate";
import { HttpError, type Env } from "./types";

// Operations shared by the REST API and the MCP tools, so both behave identically.

export const registry = (env: Env) => env.REGISTRY.get(env.REGISTRY.idFromName("registry"));
export const appHost = (env: Env, appId: string) => env.APP.get(env.APP.idFromName(appId));

export function appUrl(env: Env, slug: string) {
  const port = env.PUBLIC_PORT ? `:${env.PUBLIC_PORT}` : "";
  return `http://${slug}.${env.APPS_DOMAIN}${port}/`;
}

export function rootUrl(env: Env) {
  const port = env.PUBLIC_PORT ? `:${env.PUBLIC_PORT}` : "";
  return `http://${env.APPS_DOMAIN}${port}`;
}

export type FileMap = Record<string, Uint8Array | string>;

const clean = (p: string) => p.replace(/^\/+/, "");

export function decodeFiles(files: Record<string, string>, encoding: "utf8" | "base64" = "utf8"): FileMap {
  if (!files || typeof files !== "object" || !Object.keys(files).length) throw new HttpError(400, "files must be a non-empty map of path to content");
  const out: FileMap = {};
  for (const [path, content] of Object.entries(files)) {
    const p = clean(path);
    if (!p || p.split("/").includes("..")) throw new HttpError(400, `invalid file path "${path}"`);
    if (typeof content !== "string") throw new HttpError(400, `content of "${path}" must be a string`);
    out[p] = encoding === "base64" ? Uint8Array.from(atob(content), (c) => c.charCodeAt(0)) : content;
  }
  return out;
}

export function unzipFiles(buf: Uint8Array): FileMap {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(buf);
  } catch {
    throw new HttpError(400, "body is not a valid zip archive");
  }
  const paths = Object.keys(entries).filter((p) => !p.endsWith("/") && !p.startsWith("__MACOSX/") && !p.endsWith(".DS_Store"));
  // Build tools zip "dist/" as a wrapper folder; serve its contents from the root.
  const tops = new Set(paths.map((p) => p.split("/")[0]));
  const strip = tops.size === 1 && paths.every((p) => p.includes("/"));
  const out: FileMap = {};
  for (const p of paths) out[strip ? p.slice(p.indexOf("/") + 1) : p] = entries[p];
  if (!Object.keys(out).length) throw new HttpError(400, "zip contains no files");
  return out;
}

export async function deploy(env: Env, slug: string, files: FileMap, opts: { seed_sql?: string; note?: string } = {}) {
  const reg = registry(env);
  const app = await reg.getApp(slug);
  const n = await reg.nextVersion(app.id);
  const enc = new TextEncoder();
  let bytes = 0;
  for (const [path, content] of Object.entries(files)) {
    const body = typeof content === "string" ? enc.encode(content) : content;
    bytes += body.byteLength;
    await env.FILES.put(`apps/${app.id}/v${n}/${path}`, body);
  }
  await reg.commitVersion(app.id, n, Object.keys(files).length, bytes, opts.note);

  // Seeds only run on an empty database so redeploys never clobber user data.
  const seed = opts.seed_sql ?? (typeof files["seed.sql"] === "string" ? (files["seed.sql"] as string) : files["seed.sql"] ? new TextDecoder().decode(files["seed.sql"]) : undefined);
  let seed_ran = false;
  if (seed?.trim()) {
    const host = appHost(env, app.id);
    if ((await host.schema()).length === 0) {
      await host.sql(seed);
      seed_ran = true;
    }
  }
  return { slug, url: appUrl(env, slug), version: n, files: Object.keys(files).length, bytes, seed_ran };
}

export async function deleteApp(env: Env, slug: string) {
  const reg = registry(env);
  const app = await reg.deleteApp(slug);
  await appHost(env, app.id).wipe();
  let cursor: string | undefined;
  do {
    const page = await env.FILES.list({ prefix: `apps/${app.id}/`, cursor });
    if (page.objects.length) await env.FILES.delete(page.objects.map((o) => o.key));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return { deleted: slug };
}

export async function withUrl(env: Env, app: { slug: string }) {
  return { ...app, url: appUrl(env, app.slug) };
}
