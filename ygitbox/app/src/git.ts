import { existsSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { config, type RepoConfig } from "./config.ts";
import { randomId } from "./db.ts";
import { log } from "./log.ts";

/**
 * Provider-agnostic Git layer. Every repo is a bare clone ("mirror") that ygitbox
 * owns. Reads are local `git` calls; writes build commits with plumbing
 * (temp index -> write-tree -> commit-tree) and push them non-forced, so the
 * remote rejects a stale parent and nothing can be silently overwritten.
 * Only pull-request bookkeeping needs a provider API (see providers/).
 */

export class GitError extends Error {
  constructor(
    message: string,
    public code: number,
    public stderr: string,
  ) {
    super(message);
  }
}

export interface Identity {
  name: string;
  email: string;
}

export type FileOp = { path: string; content: string } | { path: string; delete: true };

export interface TreeEntry {
  mode: string;
  type: "blob" | "tree" | "commit";
  sha: string;
  size: number | null;
  path: string;
}

class Mutex {
  private p: Promise<unknown> = Promise.resolve();
  run<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.p.then(fn, fn);
    this.p = next.catch(() => undefined);
    return next;
  }
}

export class GitRepo {
  readonly dir: string;
  private lastFetch = 0;
  private fetchLock = new Mutex();
  /** Serialises local write sequences (temp index + push) per repo. */
  readonly writeLock = new Mutex();

  constructor(readonly cfg: RepoConfig) {
    this.dir = join(config.mirrorsDir, `${cfg.id}.git`);
  }

  private authArgs(): string[] {
    if (!this.cfg.serviceToken) return [];
    const basic = Buffer.from(`${this.cfg.serviceUser}:${this.cfg.serviceToken}`).toString("base64");
    // Passed per command so the token never lands in .git/config on disk.
    return ["-c", `http.extraHeader=Authorization: Basic ${basic}`];
  }

  private scrub(s: string): string {
    let out = s;
    if (this.cfg.serviceToken) out = out.split(this.cfg.serviceToken).join("***");
    return out.replace(/Authorization: Basic [A-Za-z0-9+/=]+/g, "Authorization: Basic ***");
  }

  async run(
    args: string[],
    opts: { input?: string | Uint8Array; env?: Record<string, string>; auth?: boolean; okCodes?: number[] } = {},
  ): Promise<{ stdout: string; code: number; bytes: Uint8Array }> {
    const full = [...(opts.auth ? this.authArgs() : []), "-C", this.dir, ...args];
    const proc = Bun.spawn(["git", ...full], {
      stdin: opts.input !== undefined ? new Blob([opts.input]) : "ignore",
      stdout: "pipe",
      stderr: "pipe",
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0",
        GIT_CONFIG_NOSYSTEM: "1",
        LC_ALL: "C",
        ...opts.env,
      },
    });
    const timer = setTimeout(() => proc.kill(), config.gitTimeoutMs);
    const [bytes, stderr, code] = await Promise.all([
      new Response(proc.stdout).bytes(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    clearTimeout(timer);
    const ok = opts.okCodes ?? [0];
    if (!ok.includes(code)) {
      throw new GitError(`git ${args[0]} failed (${code}): ${this.scrub(stderr).trim().slice(0, 400)}`, code, this.scrub(stderr));
    }
    return { stdout: new TextDecoder().decode(bytes), code, bytes };
  }

  async init(): Promise<void> {
    if (!existsSync(join(this.dir, "HEAD"))) {
      mkdirSync(this.dir, { recursive: true });
      await this.run(["init", "--bare", "-q"]);
      await this.run(["remote", "add", "origin", this.cfg.cloneUrl]);
      // Heads only: no PR refs, no tags. Branches are the whole model.
      await this.run(["config", "remote.origin.fetch", "+refs/heads/*:refs/heads/*"]);
      await this.run(["config", "gc.auto", "0"]);
    } else {
      await this.run(["remote", "set-url", "origin", this.cfg.cloneUrl]);
    }
    await this.fetch(true);
  }

  /** Fetch + prune, throttled. `force` bypasses the throttle (after a rejected push, on boot). */
  fetch(force = false): Promise<void> {
    return this.fetchLock.run(async () => {
      if (!force && Date.now() - this.lastFetch < config.fetchThrottleMs) return;
      await this.run(["fetch", "-q", "--prune", "origin"], { auth: true });
      this.lastFetch = Date.now();
    });
  }

  async resolve(ref: string): Promise<string | null> {
    const r = await this.run(["rev-parse", "-q", "--verify", `${ref}^{commit}`], { okCodes: [0, 1, 128] });
    return r.code === 0 ? r.stdout.trim() : null;
  }

  branchRef = (b: string) => `refs/heads/${b}`;

  /** Blob sha of path at commit, or null when absent / not a file. */
  async blobSha(commit: string, path: string): Promise<string | null> {
    const r = await this.run(["ls-tree", "-z", commit, "--", path], { okCodes: [0, 128] });
    if (r.code !== 0 || !r.stdout) return null;
    const line = r.stdout.replace(/\0$/, "");
    const tab = line.indexOf("\t");
    const [, type, sha] = line.slice(0, tab).split(" ");
    return type === "blob" && line.slice(tab + 1) === path ? sha! : null;
  }

  async readBlob(commit: string, path: string): Promise<Uint8Array | null> {
    const r = await this.run(["cat-file", "blob", `${commit}:${path}`], { okCodes: [0, 128] });
    return r.code === 0 ? r.bytes : null;
  }

  async lsTree(commit: string, path: string, recursive: boolean): Promise<TreeEntry[]> {
    const args = ["ls-tree", "-z", "-l"];
    if (recursive) args.push("-r");
    args.push(commit);
    if (path) args.push("--", path.endsWith("/") ? path : `${path}/`);
    const r = await this.run(args, { okCodes: [0, 128] });
    if (r.code !== 0) return [];
    return r.stdout
      .split("\0")
      .filter(Boolean)
      .map((line) => {
        const tab = line.indexOf("\t");
        const [mode, type, sha, size] = line.slice(0, tab).split(/\s+/);
        return { mode: mode!, type: type as TreeEntry["type"], sha: sha!, size: size === "-" ? null : Number(size), path: line.slice(tab + 1) };
      });
  }

  async grep(
    commit: string,
    query: string,
    opts: { path?: string; regex?: boolean; ignoreCase?: boolean; max: number },
  ): Promise<{ path: string; line: number; text: string }[]> {
    const args = ["grep", "-n", "-z", "-I", "--no-color", "--full-name", opts.regex ? "-E" : "-F"];
    if (opts.ignoreCase) args.push("-i");
    args.push("-e", query, commit);
    if (opts.path) args.push("--", opts.path);
    const r = await this.run(args, { okCodes: [0, 1] });
    const out: { path: string; line: number; text: string }[] = [];
    for (const l of r.stdout.split("\n")) {
      if (!l) continue;
      // -z: <commit>:<path>\0<line>\0<text>, so paths containing ":" parse correctly
      const [file, line, ...text] = l.split("\0");
      if (!file || line === undefined) continue;
      out.push({ path: file.slice(commit.length + 1), line: Number(line), text: text.join("\0").slice(0, 300) });
      if (out.length >= opts.max) break;
    }
    return out;
  }

  async log(
    ref: string,
    opts: { path?: string; author?: string; since?: string; max: number; skip: number },
  ): Promise<{ sha: string; author: string; email: string; date: string; subject: string; change: string }[]> {
    const args = [
      "log",
      `--format=%H%x1f%an%x1f%ae%x1f%aI%x1f%s%x1f%(trailers:key=Ygitbox-Change,valueonly,separator=%x2C)%x1e`,
      `-n${opts.max}`,
      `--skip=${opts.skip}`,
    ];
    if (opts.author) args.push(`--author=${opts.author}`);
    if (opts.since) args.push(`--since=${opts.since}`);
    args.push(ref);
    if (opts.path) args.push("--", opts.path);
    const r = await this.run(args, { okCodes: [0, 128] });
    return r.stdout
      .split("\x1e")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const [sha, author, email, date, subject, change] = s.split("\x1f");
        return { sha: sha!, author: author!, email: email!, date: date!, subject: subject!, change: (change ?? "").trim() };
      });
  }

  /** `paths` limits stat + diff (used to drop denied files); an empty list shows no file content. */
  async showCommit(sha: string, paths: string[]): Promise<{ header: string; stat: string; diff: string }> {
    const header = (await this.run(["show", "-s", "--format=commit %H%nAuthor: %an <%ae>%nCommitter: %cn <%ce>%nDate: %aI%n%n%B", sha])).stdout;
    if (!paths.length) return { header, stat: "", diff: "" };
    const spec = ["--", ...paths.map((p) => `:(literal)${p}`)];
    const stat = (await this.run(["show", "--format=", "--stat=120", sha, ...spec])).stdout;
    const diff = (await this.run(["show", "--format=", "--patch", "--no-color", sha, ...spec])).stdout;
    return { header, stat, diff };
  }

  /** Diff from the merge base of base..head (what the change adds), like a PR. */
  async diff(base: string, head: string, paths: string[]): Promise<string> {
    if (!paths.length) return "";
    return (await this.run(["diff", "--no-color", `${base}...${head}`, "--", ...paths.map((p) => `:(literal)${p}`)])).stdout;
  }

  async numstat(base: string, head: string): Promise<{ path: string; added: number; removed: number; status: string }[]> {
    const ns = (await this.run(["diff", "--numstat", "-z", "--no-renames", `${base}...${head}`])).stdout;
    const st = (await this.run(["diff", "--name-status", "-z", "--no-renames", `${base}...${head}`])).stdout;
    const status = new Map<string, string>();
    const sp = st.split("\0").filter(Boolean);
    for (let i = 0; i + 1 < sp.length; i += 2) status.set(sp[i + 1]!, sp[i]!);
    return ns
      .split("\0")
      .filter(Boolean)
      .map((l) => {
        const [a, r, p] = l.split("\t");
        return { path: p!, added: a === "-" ? 0 : Number(a), removed: r === "-" ? 0 : Number(r), status: status.get(p!) ?? "M" };
      });
  }

  async changedPaths(from: string, to: string): Promise<string[]> {
    const r = await this.run(["diff", "--name-only", "-z", "--no-renames", from, to]);
    return r.stdout.split("\0").filter(Boolean);
  }

  async commitPaths(sha: string): Promise<string[]> {
    const r = await this.run(["diff-tree", "--no-commit-id", "--name-only", "-r", "-z", "--root", sha]);
    return r.stdout.split("\0").filter(Boolean);
  }

  async isAncestor(a: string, b: string): Promise<boolean> {
    const r = await this.run(["merge-base", "--is-ancestor", a, b], { okCodes: [0, 1] });
    return r.code === 0;
  }

  /** Build (but do not push) a commit on top of `parent` applying file ops. */
  async buildCommit(p: {
    parent: string | null;
    ops: FileOp[];
    author: Identity;
    committer: Identity;
    message: string;
  }): Promise<string> {
    const index = join(tmpdir(), `ygitbox-idx-${randomId(8)}`);
    const env = { GIT_INDEX_FILE: index };
    try {
      if (p.parent) await this.run(["read-tree", p.parent], { env });
      else await this.run(["read-tree", "--empty"], { env });
      for (const op of p.ops) {
        if ("delete" in op) {
          // --force-remove needs a work tree; mode 0 via --index-info works in a bare repo.
          // NUL-terminated so a path can never smuggle a second index line.
          await this.run(["update-index", "-z", "--index-info"], { env, input: `0 ${"0".repeat(40)}\t${op.path}\0` });
        } else {
          const blob = (await this.run(["hash-object", "-w", "--stdin"], { input: op.content })).stdout.trim();
          await this.run(["update-index", "--add", "--cacheinfo", `100644,${blob},${op.path}`], { env });
        }
      }
      const tree = (await this.run(["write-tree"], { env })).stdout.trim();
      return await this.commitTree(tree, p.parent ? [p.parent] : [], p.author, p.committer, p.message);
    } finally {
      rmSync(index, { force: true });
    }
  }

  async commitTree(tree: string, parents: string[], author: Identity, committer: Identity, message: string): Promise<string> {
    const args = ["commit-tree", tree];
    for (const par of parents) args.push("-p", par);
    const r = await this.run(args, {
      input: message,
      env: {
        GIT_AUTHOR_NAME: author.name,
        GIT_AUTHOR_EMAIL: author.email,
        GIT_COMMITTER_NAME: committer.name,
        GIT_COMMITTER_EMAIL: committer.email,
      },
    });
    return r.stdout.trim();
  }

  async treeOf(commit: string): Promise<string> {
    return (await this.run(["rev-parse", `${commit}^{tree}`])).stdout.trim();
  }

  /**
   * 3-way merge without a worktree. Returns the merged tree, or the list of
   * conflicting paths. With `mergeBase` it doubles as cherry-pick / revert.
   */
  async mergeTree(ours: string, theirs: string, mergeBase?: string): Promise<{ tree: string } | { conflicts: string[] }> {
    const args = ["merge-tree", "--write-tree", "--name-only", "-z"];
    if (mergeBase) args.push(`--merge-base=${mergeBase}`);
    args.push(ours, theirs);
    const r = await this.run(args, { okCodes: [0, 1] });
    const parts = r.stdout.split("\0");
    if (r.code === 0) return { tree: parts[0]!.trim() };
    // Conflicted: tree, then conflicted file names until an empty entry.
    const conflicts: string[] = [];
    for (let i = 1; i < parts.length && parts[i]; i++) conflicts.push(parts[i]!);
    return { conflicts: [...new Set(conflicts)] };
  }

  /**
   * Non-forced push: the remote refuses it unless `sha` descends from the
   * remote branch head, which is our compare-and-swap. Returns false on
   * rejection (someone else moved the branch) after refreshing the mirror.
   */
  async push(sha: string, branch: string): Promise<boolean> {
    try {
      await this.run(["push", "-q", "origin", `${sha}:refs/heads/${branch}`], { auth: true });
    } catch (e) {
      if (e instanceof GitError && /rejected|non-fast-forward|fetch first|stale info/i.test(e.stderr)) {
        log.warn(`push to ${this.cfg.id}/${branch} rejected, refreshing mirror`);
        await this.fetch(true);
        return false;
      }
      throw e;
    }
    await this.run(["update-ref", `refs/heads/${branch}`, sha]);
    return true;
  }

  async deleteBranch(branch: string): Promise<void> {
    await this.run(["push", "-q", "origin", `:refs/heads/${branch}`], { auth: true, okCodes: [0, 1] }).catch(() => undefined);
    await this.run(["update-ref", "-d", `refs/heads/${branch}`], { okCodes: [0, 1] }).catch(() => undefined);
  }
}

const registry = new Map<string, GitRepo>();
export function gitFor(cfg: RepoConfig): GitRepo {
  let g = registry.get(cfg.id);
  if (!g) {
    g = new GitRepo(cfg);
    registry.set(cfg.id, g);
  }
  return g;
}
