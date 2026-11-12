/**
 * Admin CLI. Runs against the same SQLite file as the server.
 *
 *   bun src/cli.ts token --email alex@example.com --name "Alex Rivera" \
 *       [--level read|propose|review] [--repos skills,handbook] [--default skills] [--days 90] [--label laptop]
 *   bun src/cli.ts revoke <token-id>
 *   bun src/cli.ts audit [--limit 30]
 */
import { parseArgs } from "node:util";
import { issueToken, patTtl, revokeToken, type Scope } from "./auth.ts";
import { db, upsertUser } from "./db.ts";

const LEVELS: Record<string, Scope[]> = {
  read: ["repo:read"],
  propose: ["repo:read", "repo:propose"],
  review: ["repo:read", "repo:propose", "repo:review", "repo:admin"],
};

const [cmd, ...rest] = process.argv.slice(2);
const { values, positionals } = parseArgs({
  args: rest,
  allowPositionals: true,
  options: {
    email: { type: "string" },
    name: { type: "string" },
    level: { type: "string", default: "review" },
    repos: { type: "string" },
    default: { type: "string" },
    days: { type: "string" },
    label: { type: "string", default: "cli" },
    limit: { type: "string", default: "30" },
  },
});

if (cmd === "token") {
  if (!values.email) throw new Error("--email is required");
  const user = upsertUser(values.email, values.name ?? values.email);
  const scopes = LEVELS[values.level!];
  if (!scopes) throw new Error(`--level must be one of ${Object.keys(LEVELS).join(", ")}`);
  const repos = values.repos ? values.repos.split(",").map((s) => s.trim()) : null;
  const t = issueToken({
    kind: "pat",
    userId: user.id,
    label: values.label,
    scopes,
    repos,
    defaultRepo: values.default ?? repos?.[0] ?? null,
    ttlSec: patTtl(values.days ? Number(values.days) : undefined),
  });
  console.log(t.token);
} else if (cmd === "revoke") {
  revokeToken(positionals[0] ?? "");
  console.log("revoked");
} else if (cmd === "audit") {
  const rows = db
    .query(
      `select datetime(a.ts,'unixepoch') ts, u.email, a.repo, a.tool, a.ok, a.ms, a.error from audit a left join users u on u.id = a.user_id order by a.id desc limit ?`,
    )
    .all(Number(values.limit));
  console.table(rows);
} else {
  console.error("usage: cli.ts token|revoke|audit …");
  process.exit(2);
}
