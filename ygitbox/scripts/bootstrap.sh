#!/usr/bin/env bash
# Seed the local Forgejo for the ygitbox POC. Idempotent: safe to re-run.
#
# Creates:
#   forgeadmin          Forgejo site admin (also ygitbox admin via admin@example.com)
#   ygitbox-bot         the service user: write access to the repos, nothing else
#   jordan              maintainer WITH repo access (can review natively in Forgejo)
#   alex, sam           people with NO repo access; Forgejo is only their SSO here
#   org "team"          private repos skills + handbook, seeded from ./seed
#   OAuth2 app          for ygitbox's SSO login
# and writes .docker/ygitbox.env with the bot token and OAuth client credentials.
set -euo pipefail
cd "$(dirname "$0")/.."

F=http://localhost:3300
API=$F/api/v1
ADMIN=forgeadmin
PASS=ygitbox-demo            # sandbox-only default, every demo user shares it
BOT=ygitbox-bot

say() { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
api() { # api METHOD PATH [JSON] [user]; prints body, never fails on 4xx
  local m=$1 p=$2 d=${3:-} u=${4:-$ADMIN}
  curl -sS -u "$u:$PASS" -X "$m" -H 'Content-Type: application/json' ${d:+-d "$d"} "$API$p"
}
code() { # same, prints only the HTTP status
  local m=$1 p=$2 d=${3:-} u=${4:-$ADMIN}
  curl -sS -o /dev/null -w '%{http_code}' -u "$u:$PASS" -X "$m" -H 'Content-Type: application/json' ${d:+-d "$d"} "$API$p"
}

say "waiting for Forgejo"
for i in $(seq 1 60); do curl -fsS "$F/api/healthz" >/dev/null 2>&1 && break; sleep 2; done

say "site admin"
docker compose exec -T -u git forgejo forgejo admin user create --admin --username "$ADMIN" \
  --password "$PASS" --email admin@example.com --must-change-password=false >/dev/null 2>&1 || true

say "users"
mkuser() { # login email full-name
  local c
  c=$(code POST /admin/users "{\"username\":\"$1\",\"email\":\"$2\",\"full_name\":\"$3\",\"password\":\"$PASS\",\"must_change_password\":false,\"send_notify\":false}")
  echo "    $1 <$2>: $([ "$c" = 201 ] && echo created || echo "exists ($c)")"
}
mkuser "$BOT"  ygitbox@example.com "ygitbox bot"
mkuser jordan  jordan@example.com  "Jordan Lee"
mkuser alex    alex@example.com    "Alex Rivera"
mkuser sam     sam@example.com     "Sam Novak"

say "org + repos"
code POST /orgs '{"username":"team","full_name":"Team","visibility":"private"}' >/dev/null
for repo in skills handbook; do
  c=$(code POST /orgs/team/repos "{\"name\":\"$repo\",\"private\":true,\"default_branch\":\"main\",\"auto_init\":false}")
  if [ "$c" = 201 ]; then
    say "  seeding team/$repo"
    tmp=$(mktemp -d)
    cp -R "seed/$repo/." "$tmp/"
    git -C "$tmp" init -q -b main
    git -C "$tmp" -c user.name="Forge Admin" -c user.email=admin@example.com add -A
    git -C "$tmp" -c user.name="Forge Admin" -c user.email=admin@example.com commit -q -m "Seed $repo"
    git -C "$tmp" push -q "http://$ADMIN:$PASS@localhost:3300/team/$repo.git" main
    rm -rf "$tmp"
  else
    echo "    team/$repo exists ($c)"
  fi
  # ygitbox merges with Git itself (to keep the real author) and then marks the PR as manually merged.
  code PATCH "/repos/team/$repo" '{"allow_manual_merge":true,"autodetect_manual_merge":false,"default_merge_style":"squash"}' >/dev/null
  code PUT "/repos/team/$repo/collaborators/$BOT" '{"permission":"write"}' >/dev/null
  code PUT "/repos/team/$repo/collaborators/jordan" '{"permission":"write"}' >/dev/null
  # Only the bot may push to main; humans with Git accounts go through PRs too.
  code DELETE "/repos/team/$repo/branch_protections/main" >/dev/null
  code POST "/repos/team/$repo/branch_protections" "{\"rule_name\":\"main\",\"enable_push\":true,\"enable_push_whitelist\":true,\"push_whitelist_usernames\":[\"$BOT\"],\"enable_merge_whitelist\":true,\"merge_whitelist_usernames\":[\"$BOT\"]}" >/dev/null
done

say "service-user token"
code DELETE "/users/$BOT/tokens/ygitbox" "" "$BOT" >/dev/null
TOKEN=$(api POST "/users/$BOT/tokens" '{"name":"ygitbox","scopes":["write:repository","write:issue","read:user","read:organization"]}' "$BOT" \
  | sed -n 's/.*"sha1":"\([0-9a-f]*\)".*/\1/p')
[ -n "$TOKEN" ] || { echo "could not create bot token" >&2; exit 1; }

say "OAuth2 app for ygitbox SSO"
for id in $(api GET /user/applications/oauth2 | grep -o '"id":[0-9]*,"name":"ygitbox"' | grep -o '[0-9]*'); do
  code DELETE "/user/applications/oauth2/$id" >/dev/null
done
APP=$(api POST /user/applications/oauth2 '{"name":"ygitbox","redirect_uris":["http://localhost:8790/auth/callback"],"confidential_client":true}')
CID=$(printf '%s' "$APP" | sed -n 's/.*"client_id":"\([^"]*\)".*/\1/p')
CSECRET=$(printf '%s' "$APP" | sed -n 's/.*"client_secret":"\([^"]*\)".*/\1/p')
[ -n "$CID" ] || { echo "could not create OAuth app: $APP" >&2; exit 1; }

mkdir -p .docker
umask 077
cat > .docker/ygitbox.env <<ENV
YGITBOX_SERVICE_TOKEN=$TOKEN
YGITBOX_OIDC_CLIENT_ID=$CID
YGITBOX_OIDC_CLIENT_SECRET=$CSECRET
ENV
say "done · wrote .docker/ygitbox.env · Forgejo $F (users: $ADMIN, jordan, alex, sam · password $PASS)"
