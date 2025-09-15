#!/bin/bash

# Simple tester for nginx-swr cache status
# Usage: ./tester.sh [endpoint]
# Examples:
#   ./tester.sh        # default to http://localhost:8080
#   ./tester.sh 10s    # http://localhost:8080/10s
#   ./tester.sh 60s    # http://localhost:8080/60s

BASE_URL="http://localhost:8080"
ENDPOINT="${1:-}"
URL="${BASE_URL}${ENDPOINT:+/$ENDPOINT}"
SLEEP="${SLEEP:-0.5}"

echo "Testing: $URL (Press Ctrl+C to stop)"
echo ""

while true; do
    # Get current datetime
    DATETIME=$(date '+%Y-%m-%d %H:%M:%S')

    # Make request and capture headers and body
    RESPONSE=$(curl -s -D - "$URL" 2>/dev/null)

    # Extract X-Cache-Status header
    CACHE_STATUS=$(echo "$RESPONSE" | grep -i "^X-Cache-Status:" | sed 's/X-Cache-Status: //i' | tr -d '\r\n')

    # Extract body (everything after empty line)
    BODY=$(echo "$RESPONSE" | sed -n '/^\r*$/,$p' | tail -n +2 | tr -d '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

    # Print in single line
    echo "[$DATETIME] Cache: ${CACHE_STATUS:-NONE} | Body: ${BODY}"

    # Wait time
    sleep "$SLEEP"
done
