#!/bin/bash
# Re-authenticate Cursor agent on a remote server (subscription OAuth).
#
# Usage: bash scripts/reauth.sh [user@host]

set -euo pipefail

TARGET="${1:-}"

if [ -z "$TARGET" ]; then
  echo "Usage: bash scripts/reauth.sh user@your-server"
  exit 1
fi

echo "Step 1: Login to Cursor locally (subscription, not API key)..."
cursor agent login

echo "Step 2: Copy CLI auth to ${TARGET}..."
ssh "${TARGET}" "mkdir -p ~/.cursor"
scp ~/.cursor/cli-config.json "${TARGET}:~/.cursor/cli-config.json"
# Token store path may vary by platform — if login fails on the server, run cursor agent login there once.

echo "Step 3: Verify on server..."
ssh "${TARGET}" "cursor agent status"

echo "Step 4: Restart bridge (if installed)..."
ssh "${TARGET}" "sudo systemctl restart cursor-discord-bridge 2>/dev/null || true"

echo "Done."
