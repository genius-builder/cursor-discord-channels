---
name: discord-access
description: Manage Discord channel access for cursor-discord-channels — pairing, allowlists, trustedBots. Use when configuring the bridge or when the user asks about Discord bot access.
---

# Discord Access (Cursor)

State file: `~/.cursor/channels/discord/access.json`

## Pair someone

When the bridge replies with a pairing code, approve the user:

```bash
mkdir -p ~/.cursor/channels/discord/approved
jq '.allowFrom += ["USER_ID"]' ~/.cursor/channels/discord/access.json > /tmp/a.json && mv /tmp/a.json ~/.cursor/channels/discord/access.json
```

Or use the `/discord:access` skill if you have the Claude Discord plugin installed — policy is the same.

## Bot-to-bot

Add sibling bot IDs to `trustedBots` and ensure `groups["*"]` exists:

```json
{
  "groups": { "*": { "requireMention": true, "allowFrom": [] } },
  "trustedBots": ["BOT_USER_ID_1", "BOT_USER_ID_2"]
}
```

Run `npm run sync-mcp` to reconcile trustedBots into allowFrom.

## Env

`~/.cursor/channels/discord/.env`:

```
DISCORD_BOT_TOKEN=...
```

Cursor auth: `cursor agent login` (subscription). Do **not** use API key for always-on agents — see `docs/AUTH.md`.

Bridge also reads `CURSOR_CWD` (agent repo root).
