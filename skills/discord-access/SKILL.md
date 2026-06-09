---
name: discord-access
description: Manage Discord channel access for cursor-discord-channels — pairing, allowlists, trustedBots. Use when configuring the bridge or when the user asks about Discord bot access.
---

# Discord Access (Cursor)

Same policy as Claude Code's `/discord:access` skill. State: `~/.cursor/channels/discord/access.json` (falls back to `~/.claude/` if migrating from GeniusTeam).

## Pair someone

When the bridge replies with a pairing code:

```bash
# Approve pending code (writes approved/<userId> with DM channel id)
mkdir -p ~/.cursor/channels/discord/approved
# Use the discord:access skill from claude-plugins-official, or edit access.json directly:
jq '.allowFrom += ["USER_ID"]' ~/.cursor/channels/discord/access.json > /tmp/a.json && mv /tmp/a.json ~/.cursor/channels/discord/access.json
```

## Bot-to-bot (GeniusTeam)

Add sibling bot IDs to `trustedBots` and ensure `groups["*"]` exists:

```json
{
  "groups": { "*": { "requireMention": true, "allowFrom": [] } },
  "trustedBots": ["1484381532201156658", "1484459231624302673"]
}
```

Run `npm run sync-mcp` to reconcile trustedBots into allowFrom.

## Env

`~/.cursor/channels/discord/.env`:

```
DISCORD_BOT_TOKEN=...
CURSOR_API_KEY=...
```

Bridge also reads `CURSOR_CWD` (agent repo root).
