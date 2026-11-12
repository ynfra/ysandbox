#!/bin/sh
# gen.sh <repo> [codewiki generate flags...]  (codewiki generate has no path arg: it runs in cwd)
set -e
repo="$1"; shift
mkdir -p "/data/out/$repo"
cd "/repos/$repo"
exec codewiki generate --output "/data/out/$repo" "$@"
