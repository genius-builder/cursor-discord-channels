#!/bin/bash
# Re-authenticate Cursor agent on the droplet (subscription OAuth).
# Mirror of GeniusTeam scripts/reauth.sh for Claude.
#
# Usage: bash scripts/reauth.sh [droplet-ip]

set -euo pipefail

VPS_HOST="${1:-$(cat ~/.genius-vps-host 2>/dev/null)}"
VPS_USER="${VPS_USER:-genius}"

if [ -z "$VPS_HOST" ]; then
  echo "Usage: bash scripts/reauth.sh <droplet-ip>"
  echo "Or: echo '1.2.3.4' > ~/.genius-vps-host"
  exit 1
fi

echo "Step 1: Login to Cursor locally (subscription, not API key)..."
cursor agent login

echo "Step 2: Copy CLI auth to ${VPS_USER}@${VPS_HOST}..."
ssh "${VPS_USER}@${VPS_HOST}" "mkdir -p ~/.cursor"
scp ~/.cursor/cli-config.json "${VPS_USER}@${VPS_HOST}:~/.cursor/cli-config.json"
# Token store path may vary by platform — if login fails on droplet, run cursor agent login there once.

echo "Step 3: Verify on droplet..."
ssh "${VPS_USER}@${VPS_HOST}" "cursor agent status"

echo "Step 4: Restart bridge (if installed)..."
ssh "${VPS_USER}@${VPS_HOST}" "sudo systemctl restart cursor-discord-bridge 2>/dev/null || true"

echo "Done."
