#!/bin/sh
# Wire codewiki to the lab LiteLLM (idempotent), then run whatever was asked.
set -e
mkdir -p /data/.codewiki-home
codewiki config set --provider openai-compatible \
  --api-key "${LAB_KEY:-sk-codebase-lab}" \
  --base-url "${LLM_BASE_URL:-http://litellm:4000/v1}" \
  --main-model "${CODEWIKI_MODEL:-chat}" \
  --cluster-model "${CODEWIKI_MODEL:-chat}" \
  --fallback-model "${CODEWIKI_MODEL:-chat}" >/dev/null
git config --global --add safe.directory '*'
exec "$@"
