import type { RepoConfig } from "../config.ts";
import type { GitProvider, NativeReview, PullComment, PullRef, StatusState } from "./types.ts";

export class ProviderError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/** Forgejo / Gitea REST API (v1). Authenticates as the service user. */
export class ForgejoProvider implements GitProvider {
  readonly kind = "forgejo";
  private base: string;

  constructor(private cfg: RepoConfig) {
    this.base = `${cfg.apiUrl}/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.name)}`;
  }

  private async call<T>(method: string, path: string, body?: unknown, okStatus: number[] = []): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      method,
      headers: {
        Authorization: `token ${this.cfg.serviceToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok && !okStatus.includes(res.status)) {
      const text = (await res.text()).slice(0, 300);
      throw new ProviderError(`forgejo ${method} ${path} -> ${res.status}: ${text}`, res.status);
    }
    const t = await res.text();
    return (t ? JSON.parse(t) : undefined) as T;
  }

  async openPull(p: { head: string; base: string; title: string; body: string }): Promise<PullRef> {
    const r = await this.call<{ number: number; html_url: string }>("POST", "/pulls", p);
    return { number: r.number, url: r.html_url };
  }

  async updatePull(n: number, p: { title?: string; body?: string; state?: "open" | "closed" }): Promise<void> {
    await this.call("PATCH", `/pulls/${n}`, p);
  }

  async comment(n: number, body: string): Promise<void> {
    await this.call("POST", `/issues/${n}/comments`, { body });
  }

  async listComments(n: number): Promise<PullComment[]> {
    const r = await this.call<{ user: { login: string }; body: string; created_at: string }[]>("GET", `/issues/${n}/comments?limit=50`);
    return r.map((c) => ({ author: c.user.login, body: c.body, createdAt: c.created_at }));
  }

  async markMerged(n: number, sha: string): Promise<void> {
    // 405 = already merged/closed; tolerate so a retried merge stays idempotent.
    await this.call("POST", `/pulls/${n}/merge`, { Do: "manually-merged", MergeCommitID: sha }, [405]);
  }

  async setStatus(sha: string, s: { state: StatusState; context: string; description: string; targetUrl?: string }): Promise<void> {
    await this.call("POST", `/statuses/${sha}`, {
      state: s.state,
      context: s.context,
      description: s.description.slice(0, 140),
      target_url: s.targetUrl ?? "",
    });
  }

  async listReviews(n: number): Promise<NativeReview[]> {
    const r = await this.call<
      { user: { login: string; email?: string } | null; state: string; commit_id?: string; stale?: boolean; dismissed?: boolean }[]
    >("GET", `/pulls/${n}/reviews`);
    return r
      .filter((x) => x.user && !x.dismissed)
      .map((x) => ({
        login: x.user!.login,
        email: x.user!.email || null,
        state: (["APPROVED", "REQUEST_CHANGES", "COMMENT"].includes(x.state) ? x.state : "OTHER") as NativeReview["state"],
        commitId: x.commit_id ?? null,
        stale: !!x.stale,
      }));
  }
}

const cache = new Map<string, GitProvider>();
export function providerFor(cfg: RepoConfig): GitProvider {
  let p = cache.get(cfg.id);
  if (!p) {
    p = new ForgejoProvider(cfg);
    cache.set(cfg.id, p);
  }
  return p;
}
