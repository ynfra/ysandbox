#!/usr/bin/env bash
# Wait until ygitbox reports every repo mirror ready.
set -euo pipefail
for i in $(seq 1 60); do
  if curl -fsS http://localhost:8790/healthz >/dev/null 2>&1; then
    echo "ygitbox ready: http://localhost:8790  (MCP: http://localhost:8790/mcp)"
    exit 0
  fi
  sleep 2
done
echo "ygitbox did not become healthy; see: docker compose logs ygitbox" >&2
exit 1
