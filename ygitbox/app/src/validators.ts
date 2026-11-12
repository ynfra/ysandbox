import matter from "gray-matter";

export class UserError extends Error {}

/** Reject anything that is not a plain, repo-relative file path. */
export function checkPath(raw: string): string {
  const p = raw.trim();
  if (!p) throw new UserError("Path is empty.");
  if (p.length > 400) throw new UserError("Path is longer than 400 characters.");
  // Control characters (incl. newline/tab) could split git's line-based plumbing input.
  if (/[\x00-\x1f\x7f\\]/.test(p)) throw new UserError(`Path "${p.replace(/[\x00-\x1f\x7f]/g, "?")}" contains a control character or a backslash.`);
  if (p.startsWith("-") || p.includes("/-")) throw new UserError(`Path "${p}" has a segment starting with "-".`);
  if (p.startsWith("/")) throw new UserError(`Path "${p}" is absolute. Use a path relative to the repo root.`);
  const segs = p.split("/");
  for (const s of segs) {
    if (s === "" || s === "." || s === "..")
      throw new UserError(`Path "${p}" has an empty, "." or ".." segment. Use a normalised relative path.`);
    if (s.toLowerCase() === ".git") throw new UserError(`Path "${p}" points into .git, which is never writable.`);
  }
  return p;
}

/** One-line text for commit subjects, PR titles and display names: no control characters. */
export const oneLine = (s: string, max = 200) => s.replace(/[\x00-\x1f\x7f]+/g, " ").trim().slice(0, max);

const RESERVED_TRAILER = /^\s*(ygitbox-[a-z-]+|approved-by|merged-by|reviewed-on|co-authored-by|signed-off-by)\s*:/i;
/** Free text for commit bodies: keep newlines, neutralise lines that would forge our trailers. */
export const bodyText = (s: string, max = 4000) =>
  s
    .replace(/[\x00-\x08\x0b-\x1f\x7f]/g, "")
    .split("\n")
    .map((l) => (RESERVED_TRAILER.test(l) ? `> ${l}` : l))
    .join("\n")
    .slice(0, max);

export function checkContent(path: string, content: string, maxBytes: number): void {
  const n = Buffer.byteLength(content, "utf8");
  if (n > maxBytes) throw new UserError(`${path} is ${n} bytes; the policy limit is ${maxBytes} bytes.`);
  if (content.includes("\0")) throw new UserError(`${path} contains NUL bytes. Only text files can be written.`);
}

const SECRET_RULES: { id: string; re: RegExp }[] = [
  { id: "private-key", re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { id: "aws-access-key", re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { id: "github-token", re: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{60,}\b/ },
  { id: "gitlab-token", re: /\bglpat-[A-Za-z0-9_-]{20,}\b/ },
  { id: "slack-token", re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/ },
  { id: "anthropic-key", re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/ },
  { id: "openai-key", re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/ },
  { id: "google-api-key", re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { id: "ygitbox-token", re: /\bygb_(?:pat|at|rt)_[A-Za-z0-9_-]{20,}\b/ },
  {
    id: "generic-password",
    re: /\b(?:password|passwd|secret|api[_-]?key|token)\b\s*[:=]\s*["']?(?!\$\{|<|xxx|\*\*\*|changeme|example)[^\s"']{12,}/i,
  },
];

/** Line numbers + rule ids. Never returns the matched text, so a refusal cannot echo the secret back. */
export function scanSecrets(content: string): { line: number; rule: string }[] {
  const out: { line: number; rule: string }[] = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    for (const r of SECRET_RULES) if (r.re.test(lines[i]!)) out.push({ line: i + 1, rule: r.id });
  }
  return out;
}

export function assertNoSecrets(path: string, content: string): void {
  const hits = scanSecrets(content);
  if (hits.length) {
    const where = hits.map((h) => `line ${h.line} (${h.rule})`).join(", ");
    throw new UserError(
      `Refused: ${path} looks like it contains a secret at ${where}. Remove it (use a placeholder like \${MY_TOKEN}) and retry.`,
    );
  }
}

// ── skills ──────────────────────────────────────────────────────────────────

export const SKILL_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const RISKY: { id: string; re: RegExp; msg: string }[] = [
  { id: "pipe-to-shell", re: /\b(?:curl|wget)\b[^\n|]*\|\s*(?:sudo\s+)?(?:ba|z)?sh\b/i, msg: "pipes a download into a shell" },
  { id: "credential-read", re: /~\/\.ssh|\.aws\/credentials|\.netrc|id_rsa|\.npmrc|\.docker\/config\.json/i, msg: "mentions credential files" },
  { id: "base64-blob", re: /[A-Za-z0-9+/]{200,}={0,2}/, msg: "contains a long base64 blob" },
  { id: "override-instructions", re: /ignore (?:all |any )?(?:previous|prior|above) instructions/i, msg: "tries to override prior instructions" },
  { id: "exfil-url", re: /\b(?:webhook\.site|requestbin|ngrok\.io|pipedream\.net)\b/i, msg: "references a request-capture host" },
];

export interface SkillLint {
  errors: string[];
  warnings: string[];
  name?: string;
  description?: string;
}

/** Lint a SKILL.md. Errors block submit; warnings are shown to reviewers on the PR. */
export function lintSkill(folderName: string, raw: string): SkillLint {
  const errors: string[] = [];
  const warnings: string[] = [];
  let data: Record<string, unknown> = {};
  let body = "";
  try {
    const m = matter(raw);
    data = m.data;
    body = m.content;
  } catch (e) {
    return { errors: [`SKILL.md frontmatter is not valid YAML: ${(e as Error).message.split("\n")[0]}`], warnings };
  }
  if (!raw.startsWith("---")) errors.push("SKILL.md must start with a YAML frontmatter block (---).");
  const name = typeof data.name === "string" ? data.name : undefined;
  const description = typeof data.description === "string" ? data.description : undefined;
  if (!name) errors.push("Frontmatter is missing `name`.");
  else {
    if (!SKILL_NAME_RE.test(name) || name.length > 64) errors.push(`name "${name}" must be kebab-case, at most 64 characters.`);
    if (name !== folderName) errors.push(`name "${name}" must match its folder "${folderName}".`);
  }
  if (!description) errors.push("Frontmatter is missing `description`.");
  else if (description.length > 1024) errors.push(`description is ${description.length} characters; the limit is 1024.`);
  else if (description.length < 20) warnings.push("description is under 20 characters; agents use it to decide when to load the skill.");
  if (!body.trim()) errors.push("SKILL.md has no body after the frontmatter.");
  for (const r of RISKY) if (r.re.test(raw)) warnings.push(`risky pattern (${r.id}): the skill ${r.msg}.`);
  return { errors, warnings, name, description };
}
