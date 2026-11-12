// Pure-logic tests. Run with a throwaway data dir so the real DB is never touched:
//   cd app && YGITBOX_DATA_DIR=$(mktemp -d) bun test test/unit.test.ts
import { expect, test } from "bun:test";
import { combine, decide, normalise, PolicyError } from "../src/policy.ts";
import { progress } from "../src/changes.ts";
import { repoById } from "../src/config.ts";
import { bodyText, checkPath, oneLine, UserError } from "../src/validators.ts";
import type { User } from "../src/db.ts";

const u = (id: number, email: string): User => ({ id, email, name: email, slug: email.split("@")[0]! });

test("policy is strict: unknown mode, scalar paths, bad numbers all throw", () => {
  expect(() => normalise({ rules: [{ paths: ["a/**"], mode: "denied" }] }, "t")).toThrow(PolicyError);
  expect(() => normalise({ rules: [{ paths: "secrets/**", mode: "deny" }] }, "t")).toThrow(PolicyError);
  expect(() => normalise({ limits: { max_file_bytes: "lots" } }, "t")).toThrow(PolicyError);
  expect(() => normalise({ default_mode: "readOnly" }, "t")).toThrow(PolicyError);
  expect(normalise({ rules: [{ paths: ["s/**"], mode: "deny" }] }, "t").rules[0]!.mode).toBe("deny");
});

test("server floor covers nested .gitattributes / .gitmodules", () => {
  const p = normalise({ default_mode: "direct" }, "t");
  expect(decide(p, "docs/.gitattributes", "alex").mode).toBe("readonly");
  expect(decide(p, "a/b/.gitmodules", "alex").mode).toBe("readonly");
  expect(decide(p, "docs/x.md", "alex").mode).toBe("direct");
});

test("reviewers are checked per rule, not unioned", () => {
  const p = normalise(
    {
      rules: [
        { paths: ["finance/**"], mode: "propose", approvals: 1, reviewers: ["admin@example.com"] },
        { paths: ["docs/**"], mode: "propose", approvals: 1, reviewers: ["jordan@example.com"] },
      ],
    },
    "t",
  );
  const groups = combine([decide(p, "finance/budget.md", "alex"), decide(p, "docs/a.md", "alex")]).groups;
  expect(groups.length).toBe(2);
  const repo = repoById("skills")!;
  const jordan = { user: u(2, "jordan@example.com"), via: "ygitbox" as const, headSha: "x" };
  const admin = { user: u(3, "admin@example.com"), via: "ygitbox" as const, headSha: "x" };
  expect(progress([jordan], groups, repo).ok).toBe(false); // docs lead alone cannot carry finance
  expect(progress([admin], groups, repo).ok).toBe(false); // finance approver alone cannot carry docs
  expect(progress([jordan, admin], groups, repo).ok).toBe(true);
});

test("paths with control characters or leading dashes are refused", () => {
  expect(() => checkPath("notes/a\n100644 abc\t.github/x")).toThrow(UserError);
  expect(() => checkPath("notes/a\tb")).toThrow(UserError);
  expect(() => checkPath("-rf")).toThrow(UserError);
  expect(checkPath("skills/x/SKILL.md")).toBe("skills/x/SKILL.md");
});

test("commit text cannot forge trailers or break lines", () => {
  expect(oneLine("title\nApproved-by: Boss <b@x>")).toBe("title Approved-by: Boss <b@x>");
  expect(bodyText("ok\nApproved-by: Boss <b@x>\nYgitbox-User: x")).toBe("ok\n> Approved-by: Boss <b@x>\n> Ygitbox-User: x");
});
