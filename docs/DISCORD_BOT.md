# Create a Discord bot (first-time setup)

**Yes — you need your own bot.** This repo does not ship a shared bot token. Each user creates a free application in Discord's Developer Portal, invites it to their server, and pastes the token locally.

Plan ~10 minutes if you've never done this before.

## 1. Create an application

1. Open [Discord Developer Portal](https://discord.com/developers/applications) and log in.
2. Click **New Application**.
3. Name it (e.g. `My Cursor Agent`) → **Create**.

## 2. Create the bot user

1. Open your application → **Bot** (left sidebar).
2. Click **Add Bot** (or **Reset Token** if you already have one).
3. Under **Token**, click **Reset Token** → **Copy** and save it somewhere safe.  
   You won't see the full token again — if you lose it, reset and copy a new one.

## 3. Enable Message Content Intent (required)

Still on the **Bot** page, scroll to **Privileged Gateway Intents**:

- Turn on **Message Content Intent**

Without this, the bridge cannot read @mentions or message text in most servers.

Optional but useful:

- **Server Members Intent** — only if you need member lists (not required for basic @mention)

## 4. Invite the bot to your server

1. **OAuth2** → **URL Generator** (left sidebar).
2. **Scopes:** check `bot`.
3. **Bot Permissions** (minimum for this project):

   | Permission | Why |
   |------------|-----|
   | View Channels | See channels |
   | Send Messages | Reply |
   | Read Message History | Context for the agent |
   | Add Reactions | Optional 👀 ack on incoming messages |
   | Embed Links | Rich replies (optional) |

4. Copy the generated URL at the bottom → open in browser → pick your server → **Authorize**.

You need **Manage Server** (or admin) on that Discord server to invite bots.

## 5. Save the token on your machine

```bash
mkdir -p ~/.cursor/channels/discord
cat > ~/.cursor/channels/discord/.env <<'EOF'
DISCORD_BOT_TOKEN=paste_your_token_here
EOF
chmod 600 ~/.cursor/channels/discord/.env
```

**Never commit this file or paste the token in chat.**

## 6. Confirm the bot is online

After you start the bridge ([LOCAL_SETUP.md](./LOCAL_SETUP.md)), the bot should appear **online** in your server's member list. In a channel where the bot can read/send:

```
@YourBotName ping
```

You should get a reply in the thread (after Cursor MCP and `agent login` are configured).

## Multiple agents = multiple bots

Each bridge process needs its **own Discord application and token**. To run 2–3 agents locally, create 2–3 applications in the portal and use separate state dirs:

```bash
~/.cursor/channels/discord-bot-a/.env   # DISCORD_BOT_TOKEN for bot A
~/.cursor/channels/discord-bot-b/.env   # DISCORD_BOT_TOKEN for bot B
```

Set `CDC_STATE_DIR` to match when starting each bridge.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Bot offline | Bridge not running, or invalid token |
| Bot online, ignores @mentions | Message Content Intent not enabled |
| `401 / Invalid token` | Reset token in portal, update `.env` |
| Bot can't see channel | Re-invite with **View Channels**; check channel permissions for the bot role |
| "Pairing required" in DMs | Expected — approve via `access.json` ([discord-access skill](../skills/discord-access/SKILL.md)) |

Next: [LOCAL_SETUP.md](./LOCAL_SETUP.md) or [VPS_SETUP.md](./VPS_SETUP.md).
