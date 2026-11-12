#!/usr/bin/env bash
# Seed Forgejo: admin user, `lab` org, an API token, every repo in repos.txt
# (shallow clone at the pinned ref, pushed as `main`), and a push webhook to
# git-sync. Idempotent: re-running skips what already exists.
set -euo pipefail
cd "$(dirname "$0")/.."

URL=http://localhost:4310
ADMIN=labadmin
PASS=labpassword123
AUTH="$ADMIN:$PASS"
WORK=.docker/seed
mkdir -p "$WORK"

api() { curl -fsS -u "$AUTH" -H 'Content-Type: application/json' "$@"; }

echo "→ admin user"
docker compose exec -T -u git forgejo forgejo admin user create \
  --admin --username "$ADMIN" --password "$PASS" --email labadmin@example.com \
  --must-change-password=false 2>/dev/null || echo "  exists"

echo "→ org lab"
api -X POST "$URL/api/v1/orgs" -d '{"username":"lab","visibility":"public"}' >/dev/null 2>&1 || echo "  exists"

if [ ! -s .docker/forgejo-token ]; then
  echo "→ API token (.docker/forgejo-token)"
  api -X POST "$URL/api/v1/users/$ADMIN/tokens" \
    -d '{"name":"codebase-lab","scopes":["read:repository","write:repository","read:organization","read:user"]}' \
    | python3 -c 'import sys,json;print(json.load(sys.stdin)["sha1"])' > .docker/forgejo-token
fi

grep -v '^\s*#' repos.txt | while read -r name src ref; do
  [ -z "${name:-}" ] && continue
  echo "→ repo $name ($ref)"
  if api "$URL/api/v1/repos/lab/$name" >/dev/null 2>&1; then
    echo "  exists"; continue
  fi
  rm -rf "$WORK/$name"
  # One squashed commit at the ref: full React history is ~1 GB and nothing
  # in the lab reads history.
  git -c advice.detachedHead=false clone --quiet --depth 1 --branch "$ref" "$src" "$WORK/$name"
  ( cd "$WORK/$name"
    rm -rf .git
    git init --quiet -b main
    git add -A
    git -c user.name=lab -c user.email=lab@example.com commit --quiet -m "$name $ref" )
  api -X POST "$URL/api/v1/orgs/lab/repos" \
    -d "{\"name\":\"$name\",\"default_branch\":\"main\",\"private\":false}" >/dev/null
  git -C "$WORK/$name" push --quiet "http://$AUTH@localhost:4310/lab/$name.git" main
  api -X POST "$URL/api/v1/repos/lab/$name/hooks" -d '{
    "type":"forgejo","active":true,"events":["push"],
    "config":{"url":"http://git-sync:8080/hook","content_type":"json"}}' >/dev/null
done

echo "→ trigger git-sync"
curl -fsS -X POST http://localhost:4311/hook >/dev/null
echo "done. Forgejo: $URL (user $ADMIN / $PASS)"
