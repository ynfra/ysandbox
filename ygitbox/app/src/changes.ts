import { config, repoById, type RepoConfig } from "./config.ts";
import { db, now, shortId, userByEmail, userById, type User } from "./db.ts";
import { gitFor, type FileOp, type GitRepo, type Identity } from "./git.ts";
import { providerFor } from "./providers/forgejo.ts";
import { combine, decide, loadPolicy, type Combined, type Policy, type ReviewGroup } from "./policy.ts";
import { roleOn, scopesOn, visibleRepos, type Caller, type Scope } from "./auth.ts";
import { assertNoSecrets, bodyText, checkContent, checkPath, lintSkill, oneLine, UserError } from "./validators.ts";
import { log } from "./log.ts";

export type Status = "draft" | "submitted" | "changes_requested" | "approved" | "merged" | "rejected" | "withdrawn";
const OPEN: Status[] = ["draft", "submitted", "changes_requested", "approved"];
const IN_REVIEW: Status[] = ["submitted", "changes_requested", "approved"];

export interface ChangeRow {
  id: string;
  repo: string;
  author_id: number;
  title: string;
  description: string;
  branch: string;
  base_sha: string | null;
  status: Status;
  pr_number: number | null;
  pr_url: string | null;
  merged_sha: string | null;
  required_approvals: number;
  created_at: number;
  updated_at: number;
}

export const STATUS_CONTEXT = "ygitbox/approval";
const bot = (): Identity => ({ name: config.botName, email: config.botEmail });
const ident = (u: User): Identity => ({ name: u.name, email: u.email });
const short = (sha: string | null | undefined) => (sha ? sha.slice(0, 8) : "-");

// ── repo + scope resolution ─────────────────────────────────────────────────

export function resolveRepo(c: Caller, repoArg?: string): RepoConfig {
  const visible = visibleRepos(c);
  if (repoArg) {
    const r = visible.find((x) => x.id === repoArg);
    if (!r) throw new UserError(`Unknown repo "${repoArg}", or you have no access. Call list_repos to see yours.`);
    return r;
  }
  if (c.defaultRepo) {
    const r = visible.find((x) => x.id === c.defaultRepo);
    if (r) return r;
  }
  if (visible.length === 1) return visible[0]!;
  if (!visible.length) throw new UserError("You have no access to any repo. Ask an admin to grant you a role.");
  throw new UserError(`Pass \`repo\`: you can use ${visible.map((r) => `"${r.id}"`).join(", ")}.`);
}

export function requireScope(c: Caller, repo: RepoConfig, scope: Scope): void {
  if (!scopesOn(c, repo).has(scope)) {
    const why = scope === "repo:review" ? "Only maintainers can review." : "Your role or token does not allow this.";
    throw new UserError(`Missing ${scope} on repo "${repo.id}". ${why}`);
  }
}

// ── change rows ─────────────────────────────────────────────────────────────

export const getChangeRow = (id: string) => db.query("select * from changes where id = ?").get(id) as ChangeRow | null;

function setChange(id: string, fields: Partial<ChangeRow>): void {
  const keys = Object.keys(fields);
  if (!keys.length) return;
  db.query(`update changes set ${keys.map((k) => `${k} = ?`).join(", ")}, updated_at = ? where id = ?`).run(
    ...(keys.map((k) => (fields as Record<string, unknown>)[k]) as (string | number | null)[]),
    now(),
    id,
  );
}

/** Load a change the caller may see; repo access is checked. */
export function loadChange(c: Caller, id: string): { change: ChangeRow; repo: RepoConfig } {
  const change = getChangeRow(id.trim());
  const repo = change ? repoById(change.repo) : undefined;
  if (!change || !repo || !scopesOn(c, repo).has("repo:read")) throw new UserError(`Change "${id}" not found.`);
  // Drafts are private until submitted (withdrawn drafts that never had a PR stay private too).
  if (change.author_id !== c.user.id && !change.pr_number) throw new UserError(`Change "${id}" not found.`);
  return { change, repo };
}

export function ownChange(c: Caller, id: string): { change: ChangeRow; repo: RepoConfig } {
  const r = loadChange(c, id);
  if (r.change.author_id !== c.user.id) throw new UserError(`Change ${id} belongs to someone else; only its author can do this.`);
  return r;
}

function createChange(c: Caller, repo: RepoConfig, title: string, description = "", baseSha: string | null = null): ChangeRow {
  const id = shortId("c");
  const branch = `ygitbox/${c.user.slug}/${id}`;
  db.query(
    `insert into changes(id, repo, author_id, title, description, branch, base_sha, status, created_at, updated_at)
     values (?,?,?,?,?,?,?,?,?,?)`,
  ).run(id, repo.id, c.user.id, oneLine(title), bodyText(description), branch, baseSha, "draft", now(), now());
  return getChangeRow(id)!;
}

export function startChange(c: Caller, repo: RepoConfig, title: string, description?: string): ChangeRow {
  requireScope(c, repo, "repo:propose");
  if (!title.trim()) throw new UserError("A change needs a title.");
  return createChange(c, repo, title.trim(), description ?? "");
}

/** The caller's most recent open draft in a repo (what implicit writes go into). */
export function currentDraft(c: Caller, repo: RepoConfig): ChangeRow | null {
  return db
    .query("select * from changes where repo = ? and author_id = ? and status = 'draft' order by updated_at desc limit 1")
    .get(repo.id, c.user.id) as ChangeRow | null;
}

// ── reading ─────────────────────────────────────────────────────────────────

export async function defaultHead(git: GitRepo): Promise<string> {
  const h = await git.resolve(git.branchRef(git.cfg.defaultBranch));
  if (!h) throw new UserError(`Repo "${git.cfg.id}" has no ${git.cfg.defaultBranch} branch yet.`);
  return h;
}

/**
 * Turn a user-facing ref into a commit: nothing = default branch, a change id =
 * that change's branch (or the default branch if it has no edits yet), else a
 * branch name or sha.
 */
export async function resolveRead(c: Caller, repo: RepoConfig, ref?: string): Promise<{ commit: string; label: string }> {
  const git = gitFor(repo);
  await git.fetch();
  if (!ref || ref === repo.defaultBranch) return { commit: await defaultHead(git), label: repo.defaultBranch };
  if (/^c-[a-z0-9]{4,}$/.test(ref)) {
    const { change } = loadChange(c, ref);
    if (change.repo !== repo.id) throw new UserError(`Change ${ref} belongs to repo "${change.repo}", not "${repo.id}".`);
    const h = await git.resolve(git.branchRef(change.branch));
    return h ? { commit: h, label: `change ${ref}` } : { commit: await defaultHead(git), label: `change ${ref} (no edits yet)` };
  }
  // Change branches are reachable only through their change id (which enforces draft privacy),
  // and raw shas only when they are already on the default branch.
  if (ref.startsWith("ygitbox/")) throw new UserError(`Read a change by its id (c-…), not by its branch name.`);
  const main = await defaultHead(git);
  let h = await git.resolve(git.branchRef(ref));
  if (!h && /^[0-9a-f]{7,40}$/.test(ref)) {
    const sha = await git.resolve(ref);
    h = sha && (await git.isAncestor(sha, main)) ? sha : null;
  }
  if (!h) throw new UserError(`Ref "${ref}" not found. Use a change id, a branch name or a commit sha on ${repo.defaultBranch}.`);
  return { commit: h, label: ref };
}

export async function policyFor(repo: RepoConfig): Promise<Policy> {
  const git = gitFor(repo);
  await git.fetch();
  return loadPolicy(git, await defaultHead(git));
}

/** Hide paths the policy marks `deny` from listings and search. */
export async function readable(c: Caller, repo: RepoConfig, paths: string[]): Promise<Set<string>> {
  const p = await policyFor(repo);
  return new Set(paths.filter((x) => decide(p, x, c.user.slug).mode !== "deny"));
}

export async function assertReadable(c: Caller, repo: RepoConfig, path: string): Promise<void> {
  const p = await policyFor(repo);
  const d = decide(p, path, c.user.slug);
  if (d.mode === "deny") throw new UserError(`${path} is not readable over ygitbox (${d.rule}).`);
}

// ── writing ─────────────────────────────────────────────────────────────────

export type WriteOp = { path: string; expectedSha?: string | null; requireExpectedIfExists?: boolean } & (
  | { content: string }
  | { delete: true }
  | { transform: (current: string | null, path: string, readOther: (p: string) => Promise<string | null>) => string | Promise<string> }
);

export interface WriteResult {
  direct: boolean;
  commit: string;
  branch: string;
  change: ChangeRow | null;
  files: { path: string; sha: string | null; action: "created" | "updated" | "deleted" }[];
  approvalsReset: boolean;
}

/**
 * The single write path. Decides direct-vs-change from policy, evaluates ops
 * against the exact parent commit inside a per-repo lock, pushes non-forced,
 * and re-runs everything if the branch moved underneath us.
 */
export async function writeFiles(
  c: Caller,
  repo: RepoConfig,
  ops: WriteOp[],
  opts: { changeId?: string; message?: string; titleHint?: string },
): Promise<WriteResult> {
  requireScope(c, repo, "repo:propose");
  if (!ops.length) throw new UserError("Nothing to write.");
  const git = gitFor(repo);
  for (const op of ops) op.path = checkPath(op.path);
  const dup = ops.map((o) => o.path).find((p, i, a) => a.indexOf(p) !== i);
  if (dup) throw new UserError(`${dup} appears twice in one write.`);

  return git.writeLock.run(async () => {
    await git.fetch();
    let main = await defaultHead(git);
    const policy = await loadPolicy(git, main);
    const decisions = ops.map((o) => ({ op: o, d: decide(policy, o.path, c.user.slug) }));
    for (const { op, d } of decisions) {
      if (d.mode === "readonly" || d.mode === "deny")
        throw new UserError(`${op.path} is not writable over ygitbox (${d.rule}). Ask a repo admin to change it in Git.`);
    }
    const direct = !opts.changeId && decisions.every((x) => x.d.mode === "direct");

    let change: ChangeRow | null = null;
    if (!direct) {
      if (opts.changeId) {
        change = ownChange(c, opts.changeId).change;
        if (change.repo !== repo.id) throw new UserError(`Change ${change.id} is in repo "${change.repo}", not "${repo.id}".`);
      } else {
        change = currentDraft(c, repo);
      }
      if (change && !OPEN.includes(change.status))
        throw new UserError(`Change ${change.id} is ${change.status}; start a new change to keep editing.`);
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      const target = direct ? repo.defaultBranch : (change?.branch ?? "");
      const branchHead = direct ? main : change ? await git.resolve(git.branchRef(change.branch)) : null;
      const parent = branchHead ?? main;

      const fileOps: FileOp[] = [];
      const files: WriteResult["files"] = [];
      for (const op of ops) {
        const cur = await git.blobSha(parent, op.path);
        if (op.expectedSha !== undefined) {
          if (op.expectedSha === null || op.expectedSha === "") {
            if (cur) throw new UserError(`${op.path} already exists (sha ${cur}). Read it and pass its sha as expected_sha to overwrite.`);
          } else if (!cur) {
            throw new UserError(`${op.path} does not exist${change ? ` in change ${change.id}` : ""}; drop expected_sha to create it.`);
          } else if (!cur.startsWith(op.expectedSha) || op.expectedSha.length < 7) {
            throw new UserError(
              `${op.path} changed since you read it: now sha ${cur}, you passed ${op.expectedSha}. ` +
                `Re-read it${change ? ` with ref "${change.id}"` : ""} and retry.`,
            );
          }
        } else if (op.requireExpectedIfExists && cur) {
          throw new UserError(`${op.path} already exists. Read it first and pass expected_sha (${cur}), or use edit_file.`);
        }
        if ("delete" in op) {
          if (!cur) throw new UserError(`${op.path} does not exist, nothing to delete.`);
          fileOps.push({ path: op.path, delete: true });
          files.push({ path: op.path, sha: null, action: "deleted" });
          continue;
        }
        let content: string;
        if ("transform" in op) {
          const bytes = cur ? await git.readBlob(parent, op.path) : null;
          const readOther = async (p: string) => {
            const b = await git.readBlob(parent, checkPath(p));
            return b ? new TextDecoder().decode(b) : null;
          };
          content = await op.transform(bytes ? new TextDecoder().decode(bytes) : null, op.path, readOther);
        } else content = op.content;
        checkContent(op.path, content, policy.limits.max_file_bytes);
        assertNoSecrets(op.path, content);
        fileOps.push({ path: op.path, content });
        files.push({ path: op.path, sha: null, action: cur ? "updated" : "created" });
      }

      if (!direct && !change) {
        change = createChange(c, repo, opts.titleHint ?? `Edit ${ops[0]!.path}`, "", main);
      }
      const branch = direct ? target : change!.branch;
      const summary = (opts.message && oneLine(opts.message)) || defaultMessage(files);
      const trailers = [change ? `Ygitbox-Change: ${change.id}` : null, `Ygitbox-User: ${c.user.email}`].filter(Boolean).join("\n");
      const commit = await git.buildCommit({
        parent,
        ops: fileOps,
        author: ident(c.user),
        committer: bot(),
        message: `${summary}\n\n${trailers}\n`,
      });

      if (change) {
        const touched = await git.numstat(main, commit);
        if (touched.length > policy.limits.max_files_per_change)
          throw new UserError(`Change would touch ${touched.length} files; the policy limit is ${policy.limits.max_files_per_change}.`);
      }

      if (!(await git.push(commit, branch))) {
        main = await defaultHead(git);
        continue; // someone moved the branch: rebuild on the new head (shas re-checked above)
      }

      for (const f of files) f.sha = f.action === "deleted" ? null : await git.blobSha(commit, f.path);
      let approvalsReset = false;
      if (change) {
        const fields: Partial<ChangeRow> = {};
        if (!change.base_sha) fields.base_sha = main;
        if (IN_REVIEW.includes(change.status)) {
          approvalsReset = (db.query("delete from approvals where change_id = ?").run(change.id).changes ?? 0) > 0;
          fields.status = "submitted";
        }
        setChange(change.id, fields);
        change = getChangeRow(change.id)!;
        if (change.pr_number) await publishStatus(repo, change, commit).catch((e) => log.warn(`status: ${e}`));
      }
      return { direct, commit, branch, change, files, approvalsReset };
    }
    throw new UserError(`${direct ? repo.defaultBranch : "The change branch"} kept moving while writing; try again.`);
  });
}

function defaultMessage(files: WriteResult["files"]): string {
  if (files.length === 1) {
    const f = files[0]!;
    return `${f.action === "created" ? "Add" : f.action === "deleted" ? "Delete" : "Update"} ${f.path}`;
  }
  return `Update ${files.length} files`;
}

// ── review requirements ─────────────────────────────────────────────────────

export interface Requirements {
  decision: Combined;
  files: { path: string; added: number; removed: number; status: string }[];
  head: string | null;
  main: string;
}

export async function requirements(change: ChangeRow, repo: RepoConfig, author: User): Promise<Requirements> {
  const git = gitFor(repo);
  await git.fetch();
  const main = await defaultHead(git);
  const head = await git.resolve(git.branchRef(change.branch));
  const policy = await loadPolicy(git, main);
  const files = head ? await git.numstat(main, head) : [];
  const ds = files.map((f) => decide(policy, f.path, author.slug));
  const bad = files.find((f, i) => ds[i]!.mode === "readonly" || ds[i]!.mode === "deny");
  if (bad) throw new UserError(`${bad.path} is no longer writable under the current policy; this change cannot land.`);
  return { decision: combine(ds), files, head, main };
}

export function eligibleReviewer(user: User, repo: RepoConfig, reviewers: string[]): boolean {
  const role = roleOn(user, repo);
  if (role !== "maintainer" && role !== "admin") return false;
  if (!reviewers.length) return true;
  return reviewers.some((r) => {
    const x = r.toLowerCase();
    if (x === "role:maintainer") return true;
    if (x === "role:admin") return role === "admin";
    return x === user.email;
  });
}

export interface Approval {
  user: User;
  via: "ygitbox" | "native";
  headSha: string;
}

/** Valid approvals at the current head: ygitbox-recorded plus native forge reviews, minus the author. */
export const canReviewAny = (u: User, repo: RepoConfig, groups: ReviewGroup[]) => groups.some((g) => eligibleReviewer(u, repo, g.reviewers));

export function reviewersText(groups: ReviewGroup[]): string {
  return groups.map((g) => `${g.approvals} from ${g.reviewers.length ? g.reviewers.join(", ") : "any maintainer"}`).join("; and ");
}

/** Every rule group must be satisfied on its own. */
export function progress(approvals: Approval[], groups: ReviewGroup[], repo: RepoConfig): { ok: boolean; text: string } {
  const per = groups.map((g) => ({ g, have: approvals.filter((a) => eligibleReviewer(a.user, repo, g.reviewers)).length }));
  const ok = per.every((x) => x.have >= x.g.approvals);
  const text =
    per.length === 1 ? `${per[0]!.have}/${per[0]!.g.approvals}` : per.map((x) => `${x.have}/${x.g.approvals} for ${x.g.rule}`).join(", ");
  return { ok, text };
}

export async function approvalsAt(change: ChangeRow, repo: RepoConfig, head: string, groups: ReviewGroup[]): Promise<Approval[]> {
  const anyGroup = (u: User) => canReviewAny(u, repo, groups);
  const out = new Map<number, Approval>();
  const rows = db.query("select user_id, head_sha from approvals where change_id = ?").all(change.id) as {
    user_id: number;
    head_sha: string;
  }[];
  for (const r of rows) {
    const u = userById(r.user_id);
    if (u && r.head_sha === head && u.id !== change.author_id && anyGroup(u))
      out.set(u.id, { user: u, via: "ygitbox", headSha: r.head_sha });
  }
  // Native forge reviews count only for logins an admin mapped in repos.yaml (forge emails are not verified),
  // and only each reviewer's latest verdict.
  if (change.pr_number && Object.keys(repo.nativeReviewers).length) {
    try {
      const latest = new Map<string, Awaited<ReturnType<ReturnType<typeof providerFor>["listReviews"]>>[number]>();
      for (const rv of await providerFor(repo).listReviews(change.pr_number)) {
        if (rv.state === "COMMENT") continue;
        latest.set(rv.login, rv); // API returns oldest first
      }
      for (const [login, rv] of latest) {
        const email = repo.nativeReviewers[login];
        if (!email || rv.state !== "APPROVED" || rv.stale || rv.commitId !== head) continue;
        const u = userByEmail(email);
        if (u && u.id !== change.author_id && !out.has(u.id) && anyGroup(u)) out.set(u.id, { user: u, via: "native", headSha: head });
      }
    } catch (e) {
      log.warn(`native reviews for ${change.id}: ${e}`);
    }
  }
  return [...out.values()];
}

async function publishStatus(repo: RepoConfig, change: ChangeRow, head: string): Promise<void> {
  const author = userById(change.author_id)!;
  const req = await requirements(change, repo, author);
  const p = progress(await approvalsAt(change, repo, head, req.decision.groups), req.decision.groups, repo);
  const state = change.status === "changes_requested" ? "failure" : p.ok ? "success" : "pending";
  const desc = change.status === "changes_requested" ? "Changes requested" : `${p.text} approvals via ygitbox`;
  await providerFor(repo).setStatus(head, { state, context: STATUS_CONTEXT, description: desc, targetUrl: change.pr_url ?? undefined });
}

// ── checks ──────────────────────────────────────────────────────────────────

export interface CheckResult {
  errors: string[];
  warnings: string[];
}

/** Content checks over everything a change touches, at its head. */
export async function runChecks(repo: RepoConfig, head: string, paths: string[]): Promise<CheckResult> {
  const git = gitFor(repo);
  const errors: string[] = [];
  const warnings: string[] = [];
  const skillDirs = new Set<string>();
  for (const p of paths) {
    const bytes = await git.readBlob(head, p);
    if (bytes) {
      try {
        assertNoSecrets(p, new TextDecoder().decode(bytes));
      } catch (e) {
        errors.push((e as Error).message);
      }
    }
    if (repo.packs.includes("skills") && p.startsWith(`${repo.skillsRoot}/`)) {
      const name = p.slice(repo.skillsRoot.length + 1).split("/")[0];
      if (name && p.slice(repo.skillsRoot.length + 1).includes("/")) skillDirs.add(name);
    }
  }
  for (const name of skillDirs) {
    const path = `${repo.skillsRoot}/${name}/SKILL.md`;
    const bytes = await git.readBlob(head, path);
    if (!bytes) {
      const rest = await git.lsTree(head, `${repo.skillsRoot}/${name}`, true);
      if (rest.length) errors.push(`skills/${name} has files but no SKILL.md.`);
      continue; // folder fully deleted: fine
    }
    const lint = lintSkill(name, new TextDecoder().decode(bytes));
    errors.push(...lint.errors.map((e) => `${path}: ${e}`));
    warnings.push(...lint.warnings.map((w) => `${path}: ${w}`));
  }
  return { errors, warnings };
}

// ── lifecycle ───────────────────────────────────────────────────────────────

export function updateChangeMeta(c: Caller, id: string, title?: string, description?: string): Promise<ChangeRow> {
  const { change, repo } = ownChange(c, id);
  if (!OPEN.includes(change.status)) throw new UserError(`Change ${id} is ${change.status}.`);
  const fields: Partial<ChangeRow> = {};
  if (title?.trim()) fields.title = oneLine(title);
  if (description !== undefined) fields.description = bodyText(description);
  setChange(id, fields);
  const updated = getChangeRow(id)!;
  if (updated.pr_number) {
    return providerFor(repo)
      .updatePull(updated.pr_number, { title: updated.title, body: prBody(updated, c.user, null, []) })
      .then(() => updated);
  }
  return Promise.resolve(updated);
}

function prBody(change: ChangeRow, author: User, req: Requirements | null, warnings: string[]): string {
  const lines = [change.description.trim() || "_No description._", "", "---"];
  lines.push(`Proposed by **${author.name}** (${author.email}) via ygitbox, change \`${change.id}\`.`);
  if (req) {
    lines.push(`Needs approval(s): ${reviewersText(req.decision.groups)}. Approve with \`approve_change\` in ygitbox.`);
  }
  lines.push(`This branch is managed by ygitbox; push edits through ygitbox, not to the branch directly.`);
  if (warnings.length) {
    lines.push("", "**Reviewer attention (automated checks):**");
    for (const w of warnings) lines.push(`- ⚠️ ${w}`);
  }
  return lines.join("\n");
}

export async function submitChange(
  c: Caller,
  id: string,
  title?: string,
  description?: string,
): Promise<{ change: ChangeRow; req: Requirements; warnings: string[] }> {
  let { change, repo } = ownChange(c, id);
  // Re-submitting an already submitted change is fine: it re-runs checks and refreshes the PR.
  if (!["draft", "changes_requested", "submitted"].includes(change.status))
    throw new UserError(`Change ${id} is ${change.status}; it can no longer be submitted.`);
  if (title?.trim() || description !== undefined) change = await updateChangeMeta(c, id, title, description);
  const req = await requirements(change, repo, c.user);
  if (!req.head || !req.files.length) throw new UserError(`Change ${id} has no edits compared to ${repo.defaultBranch}.`);
  const checks = await runChecks(
    repo,
    req.head,
    req.files.map((f) => f.path),
  );
  if (checks.errors.length) throw new UserError(`Checks failed, nothing was submitted:\n- ${checks.errors.join("\n- ")}`);

  const provider = providerFor(repo);
  const body = prBody(change, c.user, req, checks.warnings);
  if (change.pr_number) {
    await provider.updatePull(change.pr_number, { title: change.title, body, state: "open" });
    await provider.comment(change.pr_number, `🔁 ${c.user.name} resubmitted at \`${short(req.head)}\`.`);
  } else {
    const pr = await provider.openPull({ head: change.branch, base: repo.defaultBranch, title: change.title, body });
    setChange(id, { pr_number: pr.number, pr_url: pr.url });
  }
  if (change.status !== "approved") setChange(id, { status: "submitted", required_approvals: req.decision.approvals });
  change = getChangeRow(id)!;
  await publishStatus(repo, change, req.head).catch((e) => log.warn(`status: ${e}`));
  return { change, req, warnings: checks.warnings };
}

function checkHead(head: string | null, given: string, id: string): string {
  if (!head) throw new UserError(`Change ${id} has no commits.`);
  if (given.length < 7 || !head.startsWith(given))
    throw new UserError(
      `Change ${id} moved since you looked (head is now ${short(head)}, you passed ${given.slice(0, 8)}). Re-read get_change_diff and approve again.`,
    );
  return head;
}

export async function approveChange(c: Caller, id: string, headSha: string, comment?: string) {
  const { change, repo } = loadChange(c, id);
  requireScope(c, repo, "repo:review");
  if (change.author_id === c.user.id) throw new UserError("You cannot approve your own change.");
  if (!["submitted", "approved"].includes(change.status))
    throw new UserError(`Change ${id} is ${change.status}; only submitted changes can be approved.`);
  const author = userById(change.author_id)!;
  const req = await requirements(change, repo, author);
  const head = checkHead(req.head, headSha, id);
  if (!canReviewAny(c.user, repo, req.decision.groups))
    throw new UserError(`This change needs approval from: ${reviewersText(req.decision.groups)}. You are not an eligible reviewer for any of it.`);
  db.query(
    `insert into approvals(change_id, user_id, head_sha, comment, created_at) values (?,?,?,?,?)
     on conflict(change_id, user_id) do update set head_sha = excluded.head_sha, comment = excluded.comment, created_at = excluded.created_at`,
  ).run(id, c.user.id, head, comment ?? null, now());
  const provider = providerFor(repo);
  await provider.comment(
    change.pr_number!,
    `✅ **Approved** by ${c.user.name} (${c.user.email}) via ygitbox at \`${short(head)}\`.${comment ? `\n\n> ${comment}` : ""}`,
  );
  const approvals = await approvalsAt(change, repo, head, req.decision.groups);
  const prog = progress(approvals, req.decision.groups, repo);
  const done = prog.ok;
  setChange(id, { status: done ? "approved" : "submitted", required_approvals: req.decision.approvals });
  const updated = getChangeRow(id)!;
  await publishStatus(repo, updated, head).catch((e) => log.warn(`status: ${e}`));
  let merged: Awaited<ReturnType<typeof mergeChange>> | null = null;
  if (done && req.decision.autoMerge) merged = await mergeChange(c, id);
  return { change: getChangeRow(id)!, approvals, progress: prog.text, done, merged };
}

export async function requestChanges(c: Caller, id: string, comment: string) {
  const { change, repo } = loadChange(c, id);
  requireScope(c, repo, "repo:review");
  if (change.author_id === c.user.id) throw new UserError("You cannot request changes on your own change; edit it instead.");
  if (!["submitted", "approved"].includes(change.status)) throw new UserError(`Change ${id} is ${change.status}.`);
  db.query("delete from approvals where change_id = ?").run(id);
  setChange(id, { status: "changes_requested" });
  const updated = getChangeRow(id)!;
  await providerFor(repo).comment(change.pr_number!, `✋ **Changes requested** by ${c.user.name} via ygitbox.\n\n> ${comment}`);
  const head = await gitFor(repo).resolve(gitFor(repo).branchRef(change.branch));
  if (head) await publishStatus(repo, updated, head).catch((e) => log.warn(`status: ${e}`));
  return updated;
}

export async function mergeChange(c: Caller, id: string) {
  const { change, repo } = loadChange(c, id);
  requireScope(c, repo, "repo:review");
  if (!["submitted", "approved"].includes(change.status))
    throw new UserError(`Change ${id} is ${change.status}; only submitted, approved changes can merge.`);
  const git = gitFor(repo);
  const author = userById(change.author_id)!;
  return git.writeLock.run(async () => {
    await git.fetch(true);
    for (let attempt = 0; attempt < 3; attempt++) {
      const req = await requirements(change, repo, author);
      if (!req.head) throw new UserError(`Change ${id} has no commits.`);
      const approvals = await approvalsAt(change, repo, req.head, req.decision.groups);
      const prog = progress(approvals, req.decision.groups, repo);
      if (!prog.ok)
        throw new UserError(`Change ${id} has ${prog.text} valid approvals at ${short(req.head)}; it cannot merge yet.`);
      const checks = await runChecks(
        repo,
        req.head,
        req.files.map((f) => f.path),
      );
      if (checks.errors.length) throw new UserError(`Checks fail at the current head:\n- ${checks.errors.join("\n- ")}`);
      const mt = await git.mergeTree(req.main, req.head);
      if ("conflicts" in mt)
        throw new UserError(
          `Change ${id} conflicts with ${repo.defaultBranch} in: ${mt.conflicts.join(", ")}. ` +
            `The author should withdraw it and redo the edit on top of the current ${repo.defaultBranch}.`,
        );
      const approvedBy = approvals.map((a) => `Approved-by: ${a.user.name} <${a.user.email}>`).join("\n");
      const message =
        `${oneLine(change.title)}\n\n${change.description.trim() ? `${bodyText(change.description).trim()}\n\n` : ""}` +
        `Ygitbox-Change: ${change.id}\nYgitbox-User: ${author.email}\n${approvedBy}\n` +
        `Merged-by: ${c.user.name} <${c.user.email}>\n${change.pr_url ? `Reviewed-on: ${change.pr_url}\n` : ""}`;
      // Squash ourselves so the commit carries the real author; the forge only records it.
      const squash = await git.commitTree(mt.tree, [req.main], ident(author), bot(), message);
      if (!(await git.push(squash, repo.defaultBranch))) continue;
      const provider = providerFor(repo);
      if (change.pr_number) {
        await provider.setStatus(req.head, { state: "success", context: STATUS_CONTEXT, description: "Merged via ygitbox" }).catch(() => undefined);
        await provider.markMerged(change.pr_number, squash).catch(async (e) => {
          log.warn(`markMerged ${change.id}: ${e}; closing instead`);
          await provider.comment(change.pr_number!, `Merged as ${squash} by ${c.user.name} via ygitbox.`);
          await provider.updatePull(change.pr_number!, { state: "closed" });
        });
      }
      await git.deleteBranch(change.branch);
      setChange(id, { status: "merged", merged_sha: squash });
      return { change: getChangeRow(id)!, sha: squash, approvals };
    }
    throw new UserError(`${repo.defaultBranch} kept moving while merging; try again.`);
  });
}

async function closeChange(c: Caller, change: ChangeRow, repo: RepoConfig, status: "rejected" | "withdrawn", note: string) {
  if (!OPEN.includes(change.status)) throw new UserError(`Change ${change.id} is already ${change.status}.`);
  const provider = providerFor(repo);
  if (change.pr_number) {
    await provider.comment(change.pr_number, note);
    await provider.updatePull(change.pr_number, { state: "closed" });
  }
  await gitFor(repo).deleteBranch(change.branch);
  setChange(change.id, { status });
  return getChangeRow(change.id)!;
}

export async function rejectChange(c: Caller, id: string, reason: string) {
  const { change, repo } = loadChange(c, id);
  requireScope(c, repo, "repo:review");
  if (change.status === "draft") throw new UserError(`Change ${id} is still a draft; only submitted changes can be rejected.`);
  return closeChange(c, change, repo, "rejected", `❌ **Rejected** by ${c.user.name} via ygitbox.\n\n> ${reason}`);
}

export async function withdrawChange(c: Caller, id: string) {
  const { change, repo } = ownChange(c, id);
  return closeChange(c, change, repo, "withdrawn", `↩️ Withdrawn by ${c.user.name} via ygitbox.`);
}

export async function commentChange(c: Caller, id: string, body: string, path?: string, line?: number) {
  const { change, repo } = loadChange(c, id);
  requireScope(c, repo, "repo:propose");
  if (!change.pr_number) throw new UserError(`Change ${id} is not submitted yet; comments go on its pull request.`);
  const where = path ? ` on \`${path}${line ? `:${line}` : ""}\`` : "";
  await providerFor(repo).comment(change.pr_number, `💬 **${c.user.name}**${where} (via ygitbox):\n\n${body}`);
}

export async function revertCommit(c: Caller, repo: RepoConfig, sha: string) {
  requireScope(c, repo, "repo:propose");
  const git = gitFor(repo);
  return git.writeLock.run(async () => {
    await git.fetch(true);
    const main = await defaultHead(git);
    const commit = /^[0-9a-f]{7,40}$/.test(sha) ? await git.resolve(sha) : null;
    if (!commit || !(await git.isAncestor(commit, main)))
      throw new UserError(`Commit ${sha} is not on ${repo.defaultBranch}.`);
    const parents = (await git.run(["rev-list", "--parents", "-n1", commit])).stdout.trim().split(" ").slice(1);
    if (parents.length !== 1) throw new UserError(`Commit ${short(commit)} is a merge or root commit; revert it in Git directly.`);
    // Revert = 3-way merge of main and commit^ with the commit itself as the base.
    const mt = await git.mergeTree(main, parents[0]!, commit);
    if ("conflicts" in mt) throw new UserError(`Reverting ${short(commit)} conflicts with later edits in: ${mt.conflicts.join(", ")}.`);
    const policy = await loadPolicy(git, main);
    const paths = await git.changedPaths(main, mt.tree);
    if (!paths.length) throw new UserError(`Commit ${short(commit)} is already undone on ${repo.defaultBranch}.`);
    for (const p of paths) {
      const d = decide(policy, p, c.user.slug);
      if (d.mode === "readonly" || d.mode === "deny") throw new UserError(`Reverting touches ${p}, which is not writable (${d.rule}).`);
    }
    const subject = (await git.run(["log", "-1", "--format=%s", commit])).stdout.trim();
    const change = createChange(c, repo, `Revert "${subject}"`.slice(0, 200), `Reverts ${commit}.`, main);
    const message = `Revert "${subject}"\n\nThis reverts commit ${commit}.\n\nYgitbox-Change: ${change.id}\nYgitbox-User: ${c.user.email}\n`;
    const rc = await git.commitTree(mt.tree, [main], ident(c.user), bot(), message);
    if (!(await git.push(rc, change.branch))) throw new UserError("Could not create the revert branch; try again.");
    return { change, paths };
  });
}

// ── listing ─────────────────────────────────────────────────────────────────

export async function listChanges(
  c: Caller,
  repoArg: string | undefined,
  filter: "mine" | "open" | "needs_my_review" | "all",
  limit: number,
  offset: number,
): Promise<ChangeRow[]> {
  const repos = repoArg ? [resolveRepo(c, repoArg)] : visibleRepos(c);
  if (!repos.length) return [];
  const ph = repos.map(() => "?").join(",");
  let sql = `select * from changes where repo in (${ph})`;
  const args: (string | number)[] = repos.map((r) => r.id);
  if (filter === "mine") {
    sql += " and author_id = ?";
    args.push(c.user.id);
  } else if (filter === "open" || filter === "needs_my_review") {
    sql += ` and status in ('submitted','changes_requested','approved')`;
  } else {
    sql += " and (author_id = ? or pr_number is not null)";
    args.push(c.user.id);
  }
  sql += " order by updated_at desc";
  let rows = db.query(sql).all(...args) as ChangeRow[];
  if (filter === "needs_my_review") {
    const out: ChangeRow[] = [];
    for (const ch of rows) {
      if (ch.author_id === c.user.id || ch.status !== "submitted") continue;
      const repo = repoById(ch.repo)!;
      if (!scopesOn(c, repo).has("repo:review")) continue;
      const author = userById(ch.author_id)!;
      try {
        const req = await requirements(ch, repo, author);
        if (!req.head || !canReviewAny(c.user, repo, req.decision.groups)) continue;
        const mine = (await approvalsAt(ch, repo, req.head, req.decision.groups)).some((a) => a.user.id === c.user.id);
        if (!mine) out.push(ch);
      } catch {
        /* policy now forbids it; skip */
      }
    }
    rows = out;
  }
  return rows.slice(offset, offset + limit);
}

/** Withdraw drafts nobody touched for draftTtlDays. Runs on boot and hourly. */
export async function sweepDrafts(): Promise<number> {
  const cutoff = now() - config.draftTtlDays * 86400;
  const rows = db.query("select * from changes where status = 'draft' and updated_at < ?").all(cutoff) as ChangeRow[];
  for (const ch of rows) {
    const repo = repoById(ch.repo);
    if (repo) await gitFor(repo).deleteBranch(ch.branch).catch(() => undefined);
    setChange(ch.id, { status: "withdrawn" });
  }
  if (rows.length) log.info(`expired ${rows.length} idle draft(s)`);
  return rows.length;
}
