#!/bin/sh
# OpenDeepWiki helper (host side). Usage:
#   odw.sh add <repo> [branch]    submit lab/<repo> from Forgejo (idempotent)
#   odw.sh ready <repo>           exit 0 once the wiki status is Completed
#   odw.sh status <repo>          print the status name
# Env: ODW_API (default http://localhost:4370), ODW_EMAIL / ODW_PASSWORD (seeded admin).
API=${ODW_API:-http://localhost:4370}
EMAIL=${ODW_EMAIL:-admin@routin.ai}
PASS=${ODW_PASSWORD:-Admin@123}
cmd=$1; repo=$2; branch=${3:-}

status() {
  curl -fsS "$API/api/v1/repositories/list?page=1&pageSize=200" |
    tr '{' '\n' | grep "\"repoName\":\"$repo\"" | sed -n 's/.*"statusName":"\([A-Za-z]*\)".*/\1/p' | head -1
}

case $cmd in
  add)
    # Default branch comes from Forgejo (zustand and react use `main`).
    if [ -z "$branch" ]; then
      branch=$(curl -fsS "${FORGEJO_HOST:-http://localhost:4310}/api/v1/repos/lab/$repo" |
        sed -n 's/.*"default_branch":"\([^"]*\)".*/\1/p')
    fi
    tok=$(curl -fsS -X POST "$API/api/auth/login" -H 'content-type: application/json' \
      -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
    curl -sS -X POST "$API/api/v1/repositories/submit" -H "authorization: Bearer $tok" \
      -H 'content-type: application/json' \
      -d "{\"gitUrl\":\"http://forgejo:3000/lab/$repo.git\",\"orgName\":\"lab\",\"repoName\":\"$repo\",\"branchName\":\"${branch:-main}\",\"languageCode\":\"en\",\"isPublic\":true,\"generateSkill\":false}" \
      -o /dev/null -w "submit %{http_code}\n"
    ;;
  status) status ;;
  ready) [ "$(status)" = "Completed" ] ;;
  *) echo "usage: $0 add|ready|status <repo>" >&2; exit 2 ;;
esac
