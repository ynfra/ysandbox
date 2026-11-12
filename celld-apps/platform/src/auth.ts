import type { AppRow, Env } from "./types";

export interface User {
  id: string;
  groups: string[];
}

// The single place where identity plugs in. AUTH_MODE=oidc would validate an
// OAuth 2.0 / OIDC session (Keycloak, Okta), trust a forward-auth proxy header,
// or verify a Cloudflare Access JWT here, and return the user's id and groups.
export async function identify(_request: Request, _env: Env): Promise<User> {
  return { id: "anonymous", groups: [] };
}

// Per-app authorization keys off app.visibility (private | org | link | public).
// Visibility is stored today but only enforced once an auth mode other than
// "none" is implemented.
export function canView(_user: User, _app: AppRow, env: Env): boolean {
  return env.AUTH_MODE === "none";
}
