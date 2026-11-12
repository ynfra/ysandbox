import { parse as parseYaml } from "yaml";
import type { GitRepo } from "./git.ts";

export type Mode = "direct" | "propose" | "readonly" | "deny";

export interface Rule {
  paths: string[];
  mode: Mode;
  approvals?: number;
  /** Emails, or "role:maintainer" / "role:admin". Empty = any maintainer of the repo. */
  reviewers?: string[];
  validators?: string[];
  auto_merge?: boolean;
}

export interface Policy {
  version: number;
  default_mode: Mode;
  default_approvals: number;
  limits: { max_file_bytes: number; max_files_per_change: number };
  rules: Rule[];
  /** Where it came from: commit sha of the policy file, or "built-in". */
  source: string;
}

export interface Decision {
  mode: Mode;
  approvals: number;
  reviewers: string[];
  validators: string[];
  autoMerge: boolean;
  /** Human label of the matching rule, for error messages. */
  rule: string;
}

export const POLICY_PATH = ".ygitbox/policy.yaml";

/**
 * Server floor: never writable over MCP, whatever the repo policy says. CI
 * config and ownership files could escalate the service user's privileges; the
 * policy file must change through Git review, not through the thing it governs.
 */
const FLOOR_READONLY = [
  ".ygitbox/**",
  ".github/**",
  ".gitlab-ci.yml",
  ".gitlab/**",
  ".forgejo/**",
  ".gitea/**",
  ".woodpecker/**",
  ".woodpecker.yml",
  "CODEOWNERS",
  "**/CODEOWNERS",
  ".gitmodules",
  "**/.gitmodules",
  ".gitattributes",
  "**/.gitattributes",
];

const DEFAULT: Omit<Policy, "source"> = {
  version: 1,
  default_mode: "propose",
  default_approvals: 1,
  limits: { max_file_bytes: 262_144, max_files_per_change: 50 },
  rules: [],
};

const MODES: Mode[] = ["direct", "propose", "readonly", "deny"];

export class PolicyError extends Error {}

/** Strict: anything malformed throws, so a typo can never silently widen access. */
export function normalise(raw: unknown, source: string): Policy {
  const r = (raw ?? {}) as Record<string, unknown> & { rules?: unknown; limits?: Record<string, unknown> };
  if (typeof r !== "object" || Array.isArray(r)) throw new PolicyError("policy must be a mapping");
  const mode = (m: unknown, d: Mode, where: string): Mode => {
    if (m === undefined) return d;
    if (!MODES.includes(m as Mode)) throw new PolicyError(`${where}: unknown mode "${String(m)}"`);
    return m as Mode;
  };
  const int = (v: unknown, d: number, min: number, where: string): number => {
    if (v === undefined) return d;
    const n = Number(v);
    if (!Number.isInteger(n) || n < min) throw new PolicyError(`${where}: must be an integer >= ${min}`);
    return n;
  };
  const strList = (v: unknown, where: string): string[] | undefined => {
    if (v === undefined) return undefined;
    if (!Array.isArray(v) || !v.every((x) => typeof x === "string")) throw new PolicyError(`${where}: must be a list of strings`);
    return v;
  };
  if (r.rules !== undefined && !Array.isArray(r.rules)) throw new PolicyError("rules: must be a list");
  return {
    version: int(r.version, 1, 1, "version"),
    default_mode: mode(r.default_mode, DEFAULT.default_mode, "default_mode"),
    default_approvals: int(r.default_approvals, DEFAULT.default_approvals, 1, "default_approvals"),
    limits: {
      max_file_bytes: int(r.limits?.max_file_bytes, DEFAULT.limits.max_file_bytes, 1, "limits.max_file_bytes"),
      max_files_per_change: int(r.limits?.max_files_per_change, DEFAULT.limits.max_files_per_change, 1, "limits.max_files_per_change"),
    },
    rules: ((r.rules as Record<string, unknown>[] | undefined) ?? []).map((x, i) => {
      const paths = strList(x.paths, `rules[${i}].paths`);
      if (!paths?.length) throw new PolicyError(`rules[${i}].paths: must be a non-empty list`);
      return {
        paths,
        mode: mode(x.mode, "propose", `rules[${i}].mode`),
        approvals: x.approvals === undefined ? undefined : int(x.approvals, 1, 1, `rules[${i}].approvals`),
        reviewers: strList(x.reviewers, `rules[${i}].reviewers`),
        validators: strList(x.validators, `rules[${i}].validators`),
        auto_merge: x.auto_merge === true,
      };
    }),
    source,
  };
}

/** Used when a repo's policy file is broken and no earlier good version is known: nothing readable or writable. */
const LOCKED = (why: string): Policy => ({ ...DEFAULT, default_mode: "deny", rules: [], source: `locked (${why})` });
const lastGood = new Map<string, Policy>();

const cache = new Map<string, Policy>();

/** Policy as committed on the default branch; cached by commit. A broken file falls back to the safe default. */
export async function loadPolicy(git: GitRepo, defaultHead: string): Promise<Policy> {
  const key = `${git.cfg.id}@${defaultHead}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const bytes = await git.readBlob(defaultHead, POLICY_PATH);
  let p: Policy;
  if (!bytes) p = normalise(null, "built-in");
  else {
    try {
      p = normalise(parseYaml(new TextDecoder().decode(bytes)), `${POLICY_PATH}@${defaultHead.slice(0, 8)}`);
      lastGood.set(git.cfg.id, p);
    } catch (e) {
      // Fail closed: keep the last policy that parsed, else lock the repo.
      const why = `${POLICY_PATH} is invalid: ${(e as Error).message.split("\n")[0]}`;
      const prev = lastGood.get(git.cfg.id);
      p = prev ? { ...prev, source: `${prev.source} (newer ${why})` } : LOCKED(why);
    }
  }
  if (cache.size > 200) cache.clear();
  cache.set(key, p);
  return p;
}

function globMatch(pattern: string, path: string): boolean {
  return new Bun.Glob(pattern).match(path);
}

export function decide(policy: Policy, path: string, userSlug: string): Decision {
  for (const g of FLOOR_READONLY) {
    if (globMatch(g, path))
      return { mode: "readonly", approvals: 0, reviewers: [], validators: [], autoMerge: false, rule: `server floor (${g})` };
  }
  for (let i = 0; i < policy.rules.length; i++) {
    const rule = policy.rules[i]!;
    // {user} is substituted before matching (Bun.Glob would read braces as alternation).
    if (rule.paths.some((p) => globMatch(p.replaceAll("{user}", userSlug), path))) {
      return {
        mode: rule.mode,
        approvals: rule.approvals ?? policy.default_approvals,
        reviewers: rule.reviewers ?? [],
        validators: rule.validators ?? [],
        autoMerge: !!rule.auto_merge,
        rule: `rule ${i + 1} (${rule.paths.join(", ")})`,
      };
    }
  }
  return {
    mode: policy.default_mode,
    approvals: policy.default_approvals,
    reviewers: [],
    validators: [],
    autoMerge: false,
    rule: "default_mode",
  };
}

/** One rule's review requirement. A change must satisfy every group it touches, separately. */
export interface ReviewGroup {
  rule: string;
  approvals: number;
  reviewers: string[];
}

export interface Combined {
  groups: ReviewGroup[];
  /** Highest count any single group needs; for display. */
  approvals: number;
  autoMerge: boolean;
}

/**
 * A change spanning several rules needs each rule's own reviewers. Reviewers are
 * NOT unioned: a docs lead approving cannot carry a finance path that needs the CFO.
 */
export function combine(ds: Decision[]): Combined {
  const groups = new Map<string, ReviewGroup>();
  for (const d of ds) {
    const g = groups.get(d.rule);
    const need = Math.max(1, d.approvals || 1);
    if (!g) groups.set(d.rule, { rule: d.rule, approvals: need, reviewers: [...d.reviewers] });
    else g.approvals = Math.max(g.approvals, need);
  }
  const list = [...groups.values()];
  return {
    groups: list,
    approvals: Math.max(1, ...list.map((g) => g.approvals)),
    autoMerge: ds.length > 0 && ds.every((d) => d.autoMerge),
  };
}
