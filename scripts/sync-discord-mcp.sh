#!/bin/bash
# Overlay Lily's forked discord MCP server.ts on a canonical install path.
# Idempotent — safe to run on every bridge startup.

set -euo pipefail

REPO_DIR="${CDC_REPO_DIR:-$HOME/cursor-discord-channels}"
FORK_RAW_URL="${CDC_FORK_URL:-https://raw.githubusercontent.com/lilyzhng/claude-plugins-official/main/external_plugins/discord/server.ts}"
TARGET="${CDC_MCP_TARGET:-$REPO_DIR/mcp/server.ts}"

if [ ! -d "$REPO_DIR" ]; then
  echo "[sync-mcp] repo not found at $REPO_DIR, skipping"
  exit 0
fi

TMP=$(mktemp)
if ! curl -fsSL "$FORK_RAW_URL" -o "$TMP"; then
  echo "[sync-mcp] failed to fetch fork server.ts"
  rm -f "$TMP"
  exit 0
fi

# Only patch if upstream fork changed — local Cursor ports stay in git.
if cmp -s "$TMP" "$TARGET.upstream-fork.ts" 2>/dev/null; then
  echo "[sync-mcp] fork unchanged"
  rm -f "$TMP"
  exit 0
fi

cp "$TMP" "$TARGET.upstream-fork.ts"
rm -f "$TMP"
echo "[sync-mcp] saved upstream fork snapshot to $TARGET.upstream-fork.ts"
echo "[sync-mcp] re-apply Cursor patches in mcp/server.ts if needed (paths, CDC_MCP_ONLY, bridge split)"

ACCESS="${CDC_ACCESS_FILE:-$HOME/.cursor/channels/discord/access.json}"
if [ -f "$ACCESS" ] && command -v jq >/dev/null 2>&1; then
  if jq -e '(.trustedBots // []) - (.groups["*"].allowFrom // []) | length > 0' "$ACCESS" >/dev/null 2>&1; then
    jq '.groups["*"].allowFrom = ((.groups["*"].allowFrom // []) + (.trustedBots // []) | unique) |
        .allowFrom = ((.allowFrom // []) + (.trustedBots // []) | unique)' \
      "$ACCESS" > "$ACCESS.tmp" && mv "$ACCESS.tmp" "$ACCESS"
    echo "[sync-mcp] reconciled trustedBots into allowFrom"
  fi
fi
