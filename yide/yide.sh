#!/usr/bin/env bash
set -euo pipefail

VARIANTS=(codercom linuxserver openvscode theia)
PORTS=(3010 3020 3030 3040)
URLS=(
  "http://localhost:3010  (password: coder)"
  "http://localhost:3020  (password: coder)"
  "http://localhost:3030/?tkn=coder"
  "http://localhost:3040  (no auth)"
)

usage() {
  echo "Usage: $0 <variant> [up|down|logs]"
  echo ""
  echo "Variants:"
  for i in "${!VARIANTS[@]}"; do
    printf "  %-12s  port %s  →  %s\n" "${VARIANTS[$i]}" "${PORTS[$i]}" "${URLS[$i]}"
  done
  echo ""
  echo "Examples:"
  echo "  $0 codercom        # start codercom variant"
  echo "  $0 openvscode      # start openvscode variant"
  echo "  $0 theia down      # stop theia variant"
  echo "  $0 linuxserver logs"
  exit 1
}

[[ $# -eq 0 ]] && usage

VARIANT=$1
CMD=${2:-up}

valid=0
for v in "${VARIANTS[@]}"; do [[ "$v" == "$VARIANT" ]] && valid=1; done
[[ $valid -eq 0 ]] && { echo "Unknown variant: $VARIANT"; echo ""; usage; }

case "$CMD" in
  up)
    echo "Starting $VARIANT..."
    docker compose up -d "$VARIANT"
    for i in "${!VARIANTS[@]}"; do
      if [[ "${VARIANTS[$i]}" == "$VARIANT" ]]; then
        echo "Ready at: ${URLS[$i]}"
      fi
    done
    ;;
  down)
    echo "Stopping $VARIANT..."
    docker compose stop "$VARIANT"
    docker compose rm -f "$VARIANT"
    ;;
  logs)
    docker compose logs -f "$VARIANT"
    ;;
  *)
    echo "Unknown command: $CMD (use up, down, or logs)"
    exit 1
    ;;
esac
