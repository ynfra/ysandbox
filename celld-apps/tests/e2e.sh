#!/usr/bin/env bash
# End-to-end test against a running stack (docker compose up). Needs curl, python3.
set -u
BASE=${BASE:-http://apps.localhost:8080}
HERE=$(cd "$(dirname "$0")" && pwd)
EX="$HERE/../examples"
TS=$(date +%s)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
FAILS=0
CREATED=()

ok() { echo "PASS  $1"; }
bad() { echo "FAIL  $1${2:+ ($2)}"; FAILS=$((FAILS + 1)); }
check() { # check "name" "actual" "expected"
  if [ "$2" = "$3" ]; then ok "$1"; else bad "$1" "got '$2', want '$3'"; fi
}
py() { python3 -c "$@"; }
jget() { py "import sys,json; d=json.load(sys.stdin)
for k in sys.argv[1].split('.'):
    d=d[int(k)] if k.isdigit() else d[k]
print(d if not isinstance(d,(dict,list)) else json.dumps(d))" "$1"; }
appurl() { echo "http://$1.apps.localhost:8080"; }

# mcp <tool> <json-args>: prints the tool's structuredContent, or ERROR:<text>.
mcp() {
  py "import sys,json
req={'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':sys.argv[1],'arguments':json.loads(sys.argv[2])}}
print(json.dumps(req))" "$1" "$2" |
    curl -sS -X POST "$BASE/mcp" -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' --data-binary @- |
    py "import sys,json
r=json.load(sys.stdin)['result']
print('ERROR:'+r['content'][0]['text'] if r.get('isError') else json.dumps(r['structuredContent']))"
}

# dir_args <slug> <dir> [extra-json]: MCP deploy arguments for a directory of text files.
dir_args() {
  py "import sys,json,os
slug,root=sys.argv[1],sys.argv[2]
files={}
for d,_,fs in os.walk(root):
    for f in fs:
        p=os.path.join(d,f); files[os.path.relpath(p,root)]=open(p).read()
a={'slug':slug,'files':files}; a.update(json.loads(sys.argv[3] if len(sys.argv)>3 else '{}'))
print(json.dumps(a))" "$@"
}

status() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
ctype() { curl -s -o /dev/null -w '%{content_type}' "$@"; }
sqlq() { # sqlq <slug> <query> -> JSON
  curl -sS -X POST "$(appurl "$1")/_api/sql" -H 'content-type: application/json' -d "$(py 'import sys,json;print(json.dumps({"sql":sys.argv[1]}))' "$2")"; }

create() { # create <name> <slug> -> slug; replaces an existing app of that slug
  curl -s -X DELETE "$BASE/api/apps/$2" >/dev/null
  mcp create_app "{\"name\":\"$1\",\"slug\":\"$2\"}" | jget slug
}

echo "== MCP protocol"
INIT=$(curl -sS -X POST "$BASE/mcp" -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"t","version":"0"}}}')
check "initialize echoes protocol version" "$(echo "$INIT" | jget result.protocolVersion)" "2025-03-26"
check "initialize serverInfo" "$(echo "$INIT" | jget result.serverInfo.name)" "celld-apps"
check "notification returns 202" "$(status -X POST "$BASE/mcp" -H 'content-type: application/json' -d '{"jsonrpc":"2.0","method":"notifications/initialized"}')" "202"
check "GET /mcp returns 405" "$(status "$BASE/mcp")" "405"
TOOLS=$(curl -sS -X POST "$BASE/mcp" -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | py "import sys,json; print(' '.join(sorted(t['name'] for t in json.load(sys.stdin)['result']['tools'])))")
WANT="create_app db_import db_query db_schema delete_app deploy get_app get_upload_url list_apps rollback set_visibility"
check "tools/list has all tools" "$TOOLS" "$WANT"

echo "== create three apps"
A1="e2e-static-$TS"; A2="e2e-notes-$TS"; A3="e2e-board-$TS"
for s in $A1 $A2 $A3; do
  R=$(mcp create_app "{\"name\":\"E2E $s\",\"slug\":\"$s\"}"); CREATED+=("$s")
  check "create_app $s" "$(echo "$R" | jget slug)" "$s"
done
RAND=$(mcp create_app '{"name":"Random Slug Test"}'); RS=$(echo "$RAND" | jget slug); CREATED+=("$RS")
if echo "$RS" | grep -Eq '^random-slug-test-[a-z0-9]{4}$'; then ok "generated slug format ($RS)"; else bad "generated slug format" "$RS"; fi
check "invalid slug rejected" "$(mcp create_app '{"name":"x","slug":"Bad_Slug"}' | cut -c1-6)" "ERROR:"
check "placeholder before deploy" "$(curl -s "$(appurl $A1)/" | grep -c 'nothing is deployed')" "1"
check "unknown slug 404" "$(status "http://nope-$TS.apps.localhost:8080/")" "404"

echo "== static app via MCP deploy"
R=$(mcp deploy "$(dir_args $A1 "$EX/static-hello")")
check "deploy version 1" "$(echo "$R" | jget version)" "1"
U=$(appurl $A1)
check "GET / serves html" "$(curl -s "$U/" | grep -c 'Hello from a static app')" "1"
check "html cache-control" "$(curl -sI "$U/" | tr -d '\r' | grep -ic '^cache-control: no-cache')" "1"
check "/assets/app.js content-type" "$(ctype "$U/assets/app.js")" "text/javascript; charset=utf-8"
check "/assets/style.css content-type" "$(ctype "$U/assets/style.css")" "text/css; charset=utf-8"
check "SPA fallback /some/route" "$(curl -s "$U/some/route" | grep -c 'Hello from a static app')" "1"
check "missing asset /nope.png 404" "$(status "$U/nope.png")" "404"
check "client.js served" "$(ctype "$U/_api/client.js")" "text/javascript; charset=utf-8"

echo "== notes app via REST zip"
( cd "$EX/notes-sqlite" && python3 -m zipfile -c "$TMP/notes.zip" index.html seed.sql ) >/dev/null
R=$(curl -sS -X POST "$BASE/api/apps/$A2/deploy" -H 'content-type: application/zip' --data-binary @"$TMP/notes.zip")
check "zip deploy version 1" "$(echo "$R" | jget version)" "1"
check "seed ran" "$(echo "$R" | jget seed_ran)" "True"
N=$(appurl $A2)
check "select returns 3 rows" "$(sqlq $A2 'SELECT * FROM notes' | py 'import sys,json;print(len(json.load(sys.stdin)["rows"]))')" "3"
check "insert via /_api/sql" "$(sqlq $A2 "INSERT INTO notes(body) VALUES ('from e2e')" | jget rowsWritten)" "1"
check "4 rows after insert" "$(sqlq $A2 'SELECT count(*) AS n FROM notes' | jget rows.0.n)" "4"
check "bad SQL returns 400" "$(status -X POST "$N/_api/sql" -H 'content-type: application/json' -d '{"sql":"SELEC nope"}')" "400"
R=$(curl -sS -X POST "$BASE/api/apps/$A2/deploy" -H 'content-type: application/zip' --data-binary @"$TMP/notes.zip")
check "redeploy version 2" "$(echo "$R" | jget version)" "2"
check "seed not re-run" "$(echo "$R" | jget seed_ran)" "False"
check "data kept after redeploy" "$(sqlq $A2 'SELECT count(*) AS n FROM notes' | jget rows.0.n)" "4"
mcp deploy "{\"slug\":\"$A2\",\"files\":{\"index.html\":\"<h1>v3</h1>\"}}" >/dev/null
check "v3 served" "$(curl -s "$N/" | grep -c '<h1>v3</h1>')" "1"
R=$(mcp rollback "{\"slug\":\"$A2\",\"version\":1}")
check "rollback current_version" "$(echo "$R" | jget current_version)" "1"
check "rollback serves v1 files" "$(curl -s "$N/" | grep -c '<title>Notes</title>')" "1"
check "get_app lists 3 versions" "$(mcp get_app "{\"slug\":\"$A2\"}" | py 'import sys,json;print(len(json.load(sys.stdin)["versions"]))')" "3"
check "set_visibility" "$(mcp set_visibility "{\"slug\":\"$A2\",\"visibility\":\"org\"}" | jget visibility)" "org"
check "get_upload_url" "$(mcp get_upload_url "{\"slug\":\"$A2\"}" | jget url)" "$BASE/api/apps/$A2/deploy"

echo "== jira board"
mcp deploy "$(dir_args $A3 "$EX/jira-board")" >/dev/null
COUNT=$(py "import json;print(len(json.load(open('$EX/jira-board/issues.json'))))")
IMP=$(mcp db_import "$(py "import json;print(json.dumps({'slug':'$A3','table':'issues','rows':json.load(open('$EX/jira-board/issues.json'))}))")")
check "db_import inserted" "$(echo "$IMP" | jget inserted)" "$COUNT"
check "issues count via /_api/sql" "$(sqlq $A3 'SELECT count(*) AS n FROM issues' | jget rows.0.n)" "$COUNT"
check "story_points inferred INTEGER" "$(curl -s "$(appurl $A3)/_api/schema" | py 'import sys,json;print([c["type"] for t in json.load(sys.stdin)["tables"] for c in t["columns"] if c["name"]=="story_points"][0])')" "INTEGER"
check "UPDATE persists" "$(sqlq $A3 "UPDATE issues SET status='Done' WHERE key='DEMO-101'" | jget rowsWritten)" "1"
check "db_query via MCP" "$(mcp db_query "{\"slug\":\"$A3\",\"sql\":\"SELECT status FROM issues WHERE key = ?\",\"params\":[\"DEMO-101\"]}" | jget rows.0.status)" "Done"

echo "== isolation"
SCHEMA=$(curl -s "$(appurl $A2)/_api/schema")
check "notes schema has notes" "$(echo "$SCHEMA" | grep -c '"notes"')" "1"
check "notes schema lacks issues" "$(echo "$SCHEMA" | grep -c '"issues"')" "0"

echo "== persistence across restart"
( cd "$HERE/.." && docker compose restart celld >/dev/null 2>&1 )
for i in $(seq 1 60); do
  [ "$(status "$BASE/api/apps")" = "200" ] && break
  sleep 1
done
check "notes data survives restart" "$(sqlq $A2 'SELECT count(*) AS n FROM notes' | jget rows.0.n)" "4"
check "jira data survives restart" "$(sqlq $A3 'SELECT count(*) AS n FROM issues' | jget rows.0.n)" "$COUNT"
check "static files survive restart" "$(curl -s "$(appurl $A1)/" | grep -c 'Hello from a static app')" "1"

echo "== dashboard and delete"
check "dashboard lists app" "$(curl -s "$BASE/" | grep -c "$A1")" "1"
check "dashboard shows connect command" "$(curl -s "$BASE/" | grep -c 'claude mcp add --transport http celld-apps')" "1"
R=$(mcp delete_app "{\"slug\":\"$A3\"}")
check "delete_app" "$(echo "$R" | jget deleted)" "$A3"
check "deleted app URL 404" "$(status "$(appurl $A3)/")" "404"
check "deleted app in REST 404" "$(status "$BASE/api/apps/$A3")" "404"

echo "== cleanup, leave examples deployed"
for s in "${CREATED[@]}"; do curl -s -X DELETE "$BASE/api/apps/$s" >/dev/null; done
create "Static hello" static-hello >/dev/null
mcp deploy "$(dir_args static-hello "$EX/static-hello")" >/dev/null
create "Notes" notes >/dev/null
( cd "$EX/notes-sqlite" && python3 -m zipfile -c "$TMP/n2.zip" index.html seed.sql ) >/dev/null
curl -sS -X POST "$BASE/api/apps/notes/deploy" -H 'content-type: application/zip' --data-binary @"$TMP/n2.zip" >/dev/null
create "Jira board" jira-board >/dev/null
mcp deploy "$(dir_args jira-board "$EX/jira-board")" >/dev/null
mcp db_import "$(py "import json;print(json.dumps({'slug':'jira-board','table':'issues','rows':json.load(open('$EX/jira-board/issues.json'))}))")" >/dev/null
check "example static-hello live" "$(status "$(appurl static-hello)/")" "200"
check "example notes seeded" "$(sqlq notes 'SELECT count(*) AS n FROM notes' | jget rows.0.n)" "3"
check "example jira-board seeded" "$(sqlq jira-board 'SELECT count(*) AS n FROM issues' | jget rows.0.n)" "$COUNT"

echo
if [ $FAILS -eq 0 ]; then echo "ALL CHECKS PASSED"; else echo "$FAILS CHECK(S) FAILED"; exit 1; fi
