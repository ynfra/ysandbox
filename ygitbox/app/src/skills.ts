import matter from "gray-matter";
import type { RepoConfig } from "./config.ts";
import type { Caller } from "./auth.ts";
import { gitFor } from "./git.ts";
import { db } from "./db.ts";
import { assertReadable, currentDraft, defaultHead, ownChange, readable, resolveRead, writeFiles, type ChangeRow, type WriteOp } from "./changes.ts";
import { checkPath, lintSkill, SKILL_NAME_RE, UserError, type SkillLint } from "./validators.ts";

/**
 * The skills pack: a folder layout (<root>/<name>/SKILL.md + supporting files)
 * plus typed tools over the generic write path. Everything here ends up in
 * writeFiles, so policy, secrets, approvals and attribution are identical to
 * plain file edits.
 */

export function assertSkillsPack(repo: RepoConfig): void {
  if (!repo.packs.includes("skills")) throw new UserError(`Repo "${repo.id}" does not have the skills pack enabled.`);
}

export function skillName(raw: string): string {
  const n = raw.trim();
  if (!SKILL_NAME_RE.test(n) || n.length > 64) throw new UserError(`Skill name "${raw}" must be kebab-case, at most 64 characters.`);
  return n;
}

const skillDir = (repo: RepoConfig, name: string) => `${repo.skillsRoot}/${name}`;
const skillMd = (repo: RepoConfig, name: string) => `${skillDir(repo, name)}/SKILL.md`;

export interface SkillSummary {
  name: string;
  description: string;
  path: string;
  lastCommit?: { sha: string; author: string; date: string; subject: string };
}

export async function listSkills(c: Caller, repo: RepoConfig, query?: string): Promise<SkillSummary[]> {
  assertSkillsPack(repo);
  const git = gitFor(repo);
  const { commit } = await resolveRead(c, repo);
  const all = await git.lsTree(commit, repo.skillsRoot, true);
  const ok = await readable(c, repo, all.map((e) => e.path));
  const entries = all.filter((e) => ok.has(e.path));
  const out: SkillSummary[] = [];
  const q = query?.toLowerCase().trim();
  for (const e of entries) {
    const m = new RegExp(`^${escapeRe(repo.skillsRoot)}/([^/]+)/SKILL\\.md$`).exec(e.path);
    if (!m) continue;
    const bytes = await git.readBlob(commit, e.path);
    let description = "";
    try {
      description = String(matter(new TextDecoder().decode(bytes!)).data.description ?? "");
    } catch {
      description = "(unparseable frontmatter)";
    }
    if (q && !m[1]!.includes(q) && !description.toLowerCase().includes(q)) continue;
    const [last] = await git.log(commit, { path: skillDir(repo, m[1]!), max: 1, skip: 0 });
    out.push({
      name: m[1]!,
      description,
      path: e.path,
      lastCommit: last ? { sha: last.sha.slice(0, 8), author: last.author, date: last.date, subject: last.subject } : undefined,
    });
  }
  return out;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function getSkill(c: Caller, repo: RepoConfig, name: string, ref?: string) {
  assertSkillsPack(repo);
  const n = skillName(name);
  const git = gitFor(repo);
  await assertReadable(c, repo, skillMd(repo, n));
  const { commit, label } = await resolveRead(c, repo, ref);
  const bytes = await git.readBlob(commit, skillMd(repo, n));
  if (!bytes) throw new UserError(`Skill "${n}" not found at ${label}. Call list_skills to see what exists.`);
  const raw = new TextDecoder().decode(bytes);
  const tree = await git.lsTree(commit, skillDir(repo, n), true);
  const visible = await readable(c, repo, tree.map((e) => e.path));
  const files = tree.filter((e) => visible.has(e.path)).map((e) => ({
    path: e.path,
    sha: e.sha,
    size: e.size,
  }));
  const sha = (await git.blobSha(commit, skillMd(repo, n)))!;
  // Open changes that touch this skill, so the agent can warn about overlap.
  // Only changes this caller may see: submitted ones, plus their own drafts.
  const open = db
    .query(
      "select * from changes where repo = ? and status in ('draft','submitted','changes_requested','approved') and (pr_number is not null or author_id = ?)",
    )
    .all(repo.id, c.user.id) as ChangeRow[];
  const main = await defaultHead(git);
  const touching: { id: string; title: string; status: string }[] = [];
  for (const ch of open) {
    const head = await git.resolve(git.branchRef(ch.branch));
    if (!head) continue;
    const paths = await git.changedPaths(main, head).catch(() => [] as string[]);
    if (paths.some((p) => p.startsWith(`${skillDir(repo, n)}/`))) touching.push({ id: ch.id, title: ch.title, status: ch.status });
  }
  return { name: n, label, raw, sha, files, lint: lintSkill(n, raw), openChanges: touching };
}

function composeSkillMd(name: string, description: string, body: string, extra: Record<string, unknown> = {}): string {
  return matter.stringify(body.endsWith("\n") ? body : `${body}\n`, { name, description, ...extra });
}

function assertLint(lint: SkillLint): void {
  if (lint.errors.length) throw new UserError(`Skill is invalid, nothing was written:\n- ${lint.errors.join("\n- ")}`);
}

function supportingOps(repo: RepoConfig, name: string, files: { path: string; content: string }[] = []): WriteOp[] {
  return files.map((f) => {
    const rel = checkPath(f.path);
    if (rel === "SKILL.md") throw new UserError("Pass SKILL.md content through body/description, not files[].");
    return { path: `${skillDir(repo, name)}/${rel}`, content: f.content };
  });
}

export async function createSkill(
  c: Caller,
  repo: RepoConfig,
  p: { name: string; description: string; body: string; files?: { path: string; content: string }[]; changeId?: string },
) {
  assertSkillsPack(repo);
  const n = skillName(p.name);
  const md = composeSkillMd(n, p.description.trim(), p.body);
  const lint = lintSkill(n, md);
  assertLint(lint);
  const ops: WriteOp[] = [{ path: skillMd(repo, n), content: md, expectedSha: null }, ...supportingOps(repo, n, p.files)];
  for (const o of ops.slice(1)) (o as WriteOp).expectedSha = null;
  const res = await writeFiles(c, repo, ops, { changeId: p.changeId, message: `Add skill ${n}`, titleHint: `Add skill ${n}` });
  return { res, lint };
}

export async function updateSkill(
  c: Caller,
  repo: RepoConfig,
  p: {
    name: string;
    description?: string;
    body?: string;
    bodyEdits?: { old_str: string; new_str: string }[];
    files?: { path: string; content: string }[];
    deleteFiles?: string[];
    changeId?: string;
    message?: string;
  },
) {
  assertSkillsPack(repo);
  const n = skillName(p.name);
  if (p.body !== undefined && p.bodyEdits?.length) throw new UserError("Pass either body or body_edits, not both.");
  let lint: SkillLint | null = null;
  const touchesMd = p.description !== undefined || p.body !== undefined || !!p.bodyEdits?.length;
  const ops: WriteOp[] = [];
  if (touchesMd) {
    ops.push({
      path: skillMd(repo, n),
      transform: (cur) => {
        if (cur === null) throw new UserError(`Skill "${n}" does not exist; use create_skill.`);
        const m = matter(cur);
        let body = m.content;
        if (p.body !== undefined) body = p.body;
        for (const e of p.bodyEdits ?? []) body = applyEdit(body, e.old_str, e.new_str, "SKILL.md body");
        const data = { ...m.data };
        if (p.description !== undefined) data.description = p.description.trim();
        const { name: _n, description, ...extra } = data as Record<string, unknown>;
        const md = composeSkillMd(n, String(description ?? ""), body.replace(/^\n+/, ""), extra);
        lint = lintSkill(n, md);
        assertLint(lint);
        return md;
      },
    });
  }
  ops.push(...supportingOps(repo, n, p.files));
  for (const d of p.deleteFiles ?? []) {
    const rel = checkPath(d);
    if (rel === "SKILL.md") throw new UserError("Use delete_skill to remove the whole skill.");
    ops.push({ path: `${skillDir(repo, n)}/${rel}`, delete: true });
  }
  if (!ops.length) throw new UserError("Nothing to update: pass description, body, body_edits, files or delete_files.");
  const res = await writeFiles(c, repo, ops, {
    changeId: p.changeId,
    message: p.message ?? `Update skill ${n}`,
    titleHint: `Update skill ${n}`,
  });
  return { res, lint };
}

export async function deleteSkill(c: Caller, repo: RepoConfig, name: string, changeId?: string) {
  assertSkillsPack(repo);
  const n = skillName(name);
  const git = gitFor(repo);
  const draft = changeId ? ownChange(c, changeId).change : currentDraft(c, repo);
  const base = (draft && (await git.resolve(git.branchRef(draft.branch)))) || (await defaultHead(git));
  const files = (await git.lsTree(base, skillDir(repo, n), true)).filter((e) => e.type === "blob");
  if (!files.length) throw new UserError(`Skill "${n}" not found.`);
  return writeFiles(
    c,
    repo,
    files.map((f) => ({ path: f.path, delete: true as const })),
    { changeId, message: `Delete skill ${n}`, titleHint: `Delete skill ${n}` },
  );
}

/** Exact, single-occurrence replacement: the same contract as the Edit tool agents already know. */
export function applyEdit(text: string, oldStr: string, newStr: string, where: string): string {
  if (!oldStr) throw new UserError(`old_str is empty for ${where}.`);
  const first = text.indexOf(oldStr);
  if (first < 0) throw new UserError(`old_str was not found in ${where}. Re-read the file; it must match exactly, including whitespace.`);
  if (text.indexOf(oldStr, first + 1) >= 0)
    throw new UserError(`old_str occurs more than once in ${where}. Include more surrounding text so it is unique.`);
  return text.slice(0, first) + newStr + text.slice(first + oldStr.length);
}
