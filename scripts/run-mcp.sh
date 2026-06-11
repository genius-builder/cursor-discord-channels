#!/usr/bin/env bash
# Start Discord MCP with token/state from CDC_STATE_DIR (required).
# Use in .cursor/mcp.json so replies use the same bot as the bridge.
set -euo pipefail

DIR="${CDC_STATE_DIR:?CDC_STATE_DIR required — set in mcp.json env}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ -f "$DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$DIR/.env"
  set +a
fi

export CDC_STATE_DIR="$DIR"
export CDC_MCP_ONLY=1
exec "$ROOT/node_modules/.bin/tsx" "$ROOT/mcp/server.ts"
