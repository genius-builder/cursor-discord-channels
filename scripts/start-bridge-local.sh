#!/bin/bash
# Run the Discord bridge in the background on your laptop (nohup).
# Requires CURSOR_CWD (and optionally CURSOR_MODEL) in the environment or shell profile.
#
# Usage:
#   export CURSOR_CWD=/path/to/your/project
#   bash scripts/start-bridge-local.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STATE="${CDC_STATE_DIR:-$HOME/.cursor/channels/discord}"
LOG="${CDC_BRIDGE_LOG:-$STATE/bridge.log}"
PIDFILE="$STATE/bridge.pid"

mkdir -p "$STATE"

if [ -z "${CURSOR_CWD:-}" ]; then
  echo "Set CURSOR_CWD to your agent project root, e.g.:"
  echo "  export CURSOR_CWD=/path/to/your/project"
  exit 1
fi

if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  echo "Bridge already running (PID $(cat "$PIDFILE")). Stop with: kill \$(cat $PIDFILE)"
  exit 1
fi

cd "$ROOT"
nohup npm run bridge >>"$LOG" 2>&1 &
echo $! >"$PIDFILE"
echo "Bridge started PID $(cat "$PIDFILE")"
echo "  log: $LOG"
echo "  stop: kill \$(cat $PIDFILE)"
