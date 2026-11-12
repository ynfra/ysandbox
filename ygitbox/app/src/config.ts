import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

const env = (k: string, d = "") => process.env[k]?.trim() || d;
const num = (k: string, d: number) => {
  const v = Number(process.env[k]);
  return Number.isFinite(v) && process.env[k] !== undefined && process.env[k] !== "" ? v : d;
};

export type Role = "viewer" | "contributor" | "maintainer" | "admin";

export interface RepoConfig {
  id: string;
  description: string;
  provider: "forgejo";
  /** Provider REST API base, e.g. http://forgejo:3000/api/v1 */
  apiUrl: string;
  /** HTTPS clone URL the service user fetches and pushes over. */
  cloneUrl: string;
  /** Browser URL of the repo, shown to users. */
  webUrl: string;
  owner: string;
  name: string;
  defaultBranch: string;
  packs: string[];
  skillsRoot: string;
  /** role -> list of emails, or "*" for every signed-in user. */
  roles: Partial<Record<Role, string[]>>;
  /** Forge login -> ygitbox email, set by an admin. Only these logins' native PR reviews count. */
  nativeReviewers: Record<string, string>;
  /** Service-user credentials; per repo so one server can front several orgs. */
  serviceUser: string;
  serviceToken: string;
}

interface RawRepo {
  id: string;
  description?: string;
  provider?: string;
  api_url: string;
  clone_url: string;
  web_url: string;
  owner: string;
  name: string;
  default_branch?: string;
  packs?: string[];
  skills_root?: string;
  roles?: Partial<Record<Role, string[]>>;
  native_reviewers?: Record<string, string>;
  service_user_env?: string;
  service_token_env?: string;
}

const dataDir = env("YGITBOX_DATA_DIR", join(import.meta.dir, "..", "..", ".docker", "ygitbox"));

export const config = {
  port: num("YGITBOX_PORT", 8790),
  publicUrl: env("YGITBOX_PUBLIC_URL", "http://localhost:8790").replace(/\/$/, ""),
  dataDir,
  dbPath: join(dataDir, "ygitbox.sqlite"),
  mirrorsDir: join(dataDir, "mirrors"),
  reposFile: env("YGITBOX_REPOS_FILE", join(import.meta.dir, "..", "..", "repos.yaml")),
  botName: env("YGITBOX_BOT_NAME", "ygitbox-bot"),
  botEmail: env("YGITBOX_BOT_EMAIL", "ygitbox@example.com"),
  /** Upstream OIDC identity provider. Browser-facing authorize URL may differ from the server-side ones. */
  oidc: {
    authorizeUrl: env("YGITBOX_OIDC_AUTHORIZE_URL"),
    tokenUrl: env("YGITBOX_OIDC_TOKEN_URL"),
    userinfoUrl: env("YGITBOX_OIDC_USERINFO_URL"),
    clientId: env("YGITBOX_OIDC_CLIENT_ID"),
    clientSecret: env("YGITBOX_OIDC_CLIENT_SECRET"),
    scopes: env("YGITBOX_OIDC_SCOPES", "openid email profile"),
  },
  accessTtlSec: num("YGITBOX_ACCESS_TTL_SEC", 3600),
  refreshTtlSec: num("YGITBOX_REFRESH_TTL_SEC", 30 * 24 * 3600),
  patDefaultDays: num("YGITBOX_PAT_DEFAULT_DAYS", 90),
  patMaxDays: num("YGITBOX_PAT_MAX_DAYS", 365),
  draftTtlDays: num("YGITBOX_DRAFT_TTL_DAYS", 14),
  fetchThrottleMs: num("YGITBOX_FETCH_THROTTLE_MS", 3000),
  gitTimeoutMs: num("YGITBOX_GIT_TIMEOUT_MS", 30000),
  maxBodyBytes: num("YGITBOX_MAX_BODY_BYTES", 2_000_000),
  rateLimitPerMin: num("YGITBOX_RATE_LIMIT_PER_MIN", 240),
  /** Honour X-Forwarded-For only behind a reverse proxy you control. */
  trustProxy: env("YGITBOX_TRUST_PROXY") === "1",
};

export const oidcEnabled = () =>
  !!(config.oidc.authorizeUrl && config.oidc.tokenUrl && config.oidc.userinfoUrl && config.oidc.clientId);

function loadRepos(): { repos: RepoConfig[]; admins: string[] } {
  const raw = parseYaml(readFileSync(config.reposFile, "utf8")) as { admins?: string[]; repos: RawRepo[] };
  const ids = new Set<string>();
  const repos = (raw.repos ?? []).map((r): RepoConfig => {
    if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(r.id)) throw new Error(`repos.yaml: bad repo id "${r.id}"`);
    if (ids.has(r.id)) throw new Error(`repos.yaml: duplicate repo id "${r.id}"`);
    ids.add(r.id);
    if ((r.provider ?? "forgejo") !== "forgejo") throw new Error(`repos.yaml: provider "${r.provider}" not implemented yet`);
    return {
      id: r.id,
      description: r.description ?? "",
      provider: "forgejo",
      apiUrl: r.api_url.replace(/\/$/, ""),
      cloneUrl: r.clone_url,
      webUrl: r.web_url.replace(/\/$/, ""),
      owner: r.owner,
      name: r.name,
      defaultBranch: r.default_branch ?? "main",
      packs: r.packs ?? [],
      skillsRoot: (r.skills_root ?? "skills").replace(/^\/+|\/+$/g, ""),
      roles: r.roles ?? {},
      nativeReviewers: Object.fromEntries(Object.entries(r.native_reviewers ?? {}).map(([k, v]) => [k, String(v).toLowerCase()])),
      serviceUser: env(r.service_user_env ?? "YGITBOX_SERVICE_USER", "ygitbox-bot"),
      serviceToken: env(r.service_token_env ?? "YGITBOX_SERVICE_TOKEN"),
    };
  });
  return { repos, admins: (raw.admins ?? []).map((a) => a.toLowerCase()) };
}

export const { repos, admins } = loadRepos();
export const repoById = (id: string) => repos.find((r) => r.id === id);
