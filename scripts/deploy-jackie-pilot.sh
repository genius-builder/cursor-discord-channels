#!/bin/bash
# Deploy Jackie Cursor bridge on the GeniusTeam droplet.
# Run from laptop: bash scripts/deploy-jackie-pilot.sh [droplet-ip]
#
# Prerequisites on droplet:
#   - cursor CLI installed (`curl https://cursor.com/install -fsS | bash`)
#   - cursor agent login (subscription — bash scripts/reauth.sh)
#   - Jackie's DISCORD_BOT_TOKEN in ~/.cursor/channels/discord-jackie/.env

set -euo pipefail

VPS_HOST="${1:-$(cat ~/.genius-vps-host 2>/dev/null)}"
VPS_USER="${VPS_USER:-genius}"
SSH="ssh ${VPS_USER}@${VPS_HOST}"

if [ -z "$VPS_HOST" ]; then
  echo "Usage: bash scripts/deploy-jackie-pilot.sh <droplet-ip>"
  exit 1
fi

echo "==> 1. Push cursor-discord-channels to droplet..."
$SSH "test -d ~/cursor-discord-channels || git clone https://github.com/lilyzhng/cursor-discord-channels.git ~/cursor-discord-channels"
$SSH "cd ~/cursor-discord-channels && git pull && npm install"

echo "==> 2. Jackie Discord state dir..."
$SSH 'mkdir -p ~/.cursor/channels/discord-jackie'
$SSH 'if [ ! -f ~/.cursor/channels/discord-jackie/.env ]; then
  mkdir -p ~/.cursor/channels/discord-jackie
  if [ -f ~/GeniusTeam/genius-product/.env ]; then
  grep -E "^DISCORD_BOT_TOKEN=" ~/GeniusTeam/genius-product/.env >> ~/.cursor/channels/discord-jackie/.env 2>/dev/null || true
  fi
  echo "Wrote ~/.cursor/channels/discord-jackie/.env — verify DISCORD_BOT_TOKEN"
fi'

echo "==> 3. Copy access.json from Claude Jackie config (if present)..."
$SSH 'if [ -f ~/.claude/channels/discord/access.json ] && [ ! -f ~/.cursor/channels/discord-jackie/access.json ]; then
  cp ~/.claude/channels/discord/access.json ~/.cursor/channels/discord-jackie/access.json
  echo "Copied access.json"
fi'

echo "==> 4. genius-product .cursor/mcp.json + rules..."
$SSH "cd ~/GeniusTeam && git pull"
$SSH 'test -f ~/GeniusTeam/genius-product/.cursor/mcp.json || echo "WARN: .cursor/mcp.json missing — git pull GeniusTeam"'

echo "==> 5. Install systemd unit..."
scp examples/systemd/cursor-genius-product.service "${VPS_USER}@${VPS_HOST}:/tmp/cursor-genius-product.service"
$SSH "sudo cp /tmp/cursor-genius-product.service /etc/systemd/system/ && sudo systemctl daemon-reload"

echo "==> 6. Stop Claude Jackie, start Cursor Jackie..."
$SSH "sudo systemctl stop genius-product 2>/dev/null || true"
$SSH "sudo systemctl disable genius-product 2>/dev/null || true"
$SSH "sudo systemctl enable cursor-genius-product"
$SSH "sudo systemctl restart cursor-genius-product"
sleep 5
$SSH "systemctl is-active cursor-genius-product && cursor agent status"

echo ""
echo "Done. Jackie is now on Cursor bridge."
echo "  logs:  ssh genius@${VPS_HOST} 'journalctl -u cursor-genius-product -f'"
echo "  test:  @Jackie in Discord"
echo "  rollback: sudo systemctl stop cursor-genius-product && sudo systemctl enable genius-product && sudo systemctl start genius-product"
