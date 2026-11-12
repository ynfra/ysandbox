import type { Registry } from "./registry";
import type { AppHost } from "./apphost";

export interface Env {
  APPS_DOMAINS: string; // comma-separated, first is the default
  APPS_DOMAIN: string; // the one the current request came in on, set by the router
  AUTH_MODE: string;
  PUBLIC_PORT: string;
  REGISTRY: DurableObjectNamespace<Registry>;
  APP: DurableObjectNamespace<AppHost>;
  FILES: R2Bucket;
}

export interface AppRow {
  id: string;
  slug: string;
  name: string;
  visibility: string;
  current_version: number | null;
  created_at: string;
  updated_at: string;
}

export interface VersionRow {
  app_id: string;
  n: number;
  created_at: string;
  files: number;
  bytes: number;
  note: string | null;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
