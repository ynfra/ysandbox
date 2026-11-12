#!/bin/sh
# Index one repo (full mode) and remember its HEAD so watch.sh keeps it fresh.
# usage: index.sh /repos/<name>
set -e
p="$1"; n=$(basename "$p")
codebase-memory-mcp cli --quiet index_repository --repo-path "$p" | head -c 400; echo
mkdir -p /data/heads
git -C "$p" rev-parse HEAD > "/data/heads/$n" 2>/dev/null || date +%s > "/data/heads/$n"
