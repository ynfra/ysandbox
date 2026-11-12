#!/bin/sh
# Auto-update: cbm's own watcher only follows live MCP sessions, which supergateway
# does not keep open. So poll git HEAD of every repo that was indexed once
# (/data/heads/<name>) and re-index on change. Repos never indexed are ignored.
( while sleep "${WATCH_INTERVAL:-60}"; do
    for f in /data/heads/*; do
      [ -f "$f" ] || continue
      n=$(basename "$f"); p=/repos/$n
      h=$(git -C "$p" rev-parse HEAD 2>/dev/null) || continue
      [ "$h" = "$(cat "$f")" ] || { echo "[watch] $n changed, re-indexing"; /usr/local/bin/index.sh "$p" >/dev/null 2>&1 || echo "[watch] $n failed"; }
    done
  done ) &
exec "$@"
