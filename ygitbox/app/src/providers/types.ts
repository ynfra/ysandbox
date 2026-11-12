/**
 * Everything ygitbox needs from a forge beyond plain Git. Content, branches,
 * commits and merges never go through here (see git.ts), so a new provider is
 * only pull-request bookkeeping.
 *
 *   method            Forgejo/Gitea                     GitHub                         GitLab
 *   openPull          POST /repos/:o/:r/pulls          POST /repos/:o/:r/pulls        POST /projects/:id/merge_requests
 *   updatePull        PATCH /repos/:o/:r/pulls/:n       PATCH /repos/:o/:r/pulls/:n    PUT /projects/:id/merge_requests/:iid
 *   comment           POST /repos/:o/:r/issues/:n/comments  same                       POST .../merge_requests/:iid/notes
 *   listComments      GET  /repos/:o/:r/issues/:n/comments  same                       GET  .../merge_requests/:iid/notes
 *   markMerged        POST .../pulls/:n/merge {Do:"manually-merged"}  close + comment  close + comment
 *   setStatus         POST /repos/:o/:r/statuses/:sha   same                           POST /projects/:id/statuses/:sha
 *   listReviews       GET  .../pulls/:n/reviews         same                           GET  .../merge_requests/:iid/approvals
 */
export interface PullRef {
  number: number;
  url: string;
}

export interface NativeReview {
  login: string;
  email: string | null;
  state: "APPROVED" | "REQUEST_CHANGES" | "COMMENT" | "OTHER";
  commitId: string | null;
  stale: boolean;
}

export interface PullComment {
  author: string;
  body: string;
  createdAt: string;
}

export type StatusState = "pending" | "success" | "failure" | "error";

export interface GitProvider {
  readonly kind: string;
  openPull(p: { head: string; base: string; title: string; body: string }): Promise<PullRef>;
  updatePull(n: number, p: { title?: string; body?: string; state?: "open" | "closed" }): Promise<void>;
  comment(n: number, body: string): Promise<void>;
  listComments(n: number): Promise<PullComment[]>;
  /** Tell the forge the PR landed as `sha` (we merge with Git ourselves to keep the real author). */
  markMerged(n: number, sha: string): Promise<void>;
  setStatus(sha: string, s: { state: StatusState; context: string; description: string; targetUrl?: string }): Promise<void>;
  listReviews(n: number): Promise<NativeReview[]>;
}
