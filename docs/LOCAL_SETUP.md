# Local setup (recommended to start)

Run the bridge on **your Mac or laptop**. No VPS bill — only your **Cursor subscription** (Composer usage when the agent runs).

Best for: trying it out, solo use, a small fleet (2–3 bots), small teams.

## How it works on your machine

```
Discord @mention
  → bridge (Node, background via nohup)
      → spawns `cursor agent -p` per message (default model: Composer 2.5)
          → agent calls Discord MCP tools → reply in thread
```

- The **bridge** is a small Node process (`npm run bridge`).
- Each message starts a **Cursor CLI agent** run — same subscription as the IDE, not a separate API key.
- The **Discord MCP server** (`npm run mcp`) gives the agent `reply`, `react`, `fetch_messages`, etc.

## Tradeoffs

| Pros | Cons |
|------|------|
| Free infra (no VM) | Uses **local RAM** while the agent is thinking |
| `agent login` already done on your Mac | Mac must stay **powered on and not sleep** for 24/7 (lid closed is fine — see below) |
| Fastest path to a working bot | **2–3 agents** is usually fine; **4–5+** can OOM and heat the machine fast |

For always-on without babysitting sleep settings, see [VPS_SETUP.md](./VPS_SETUP.md).

## Keep running with the lid closed

macOS sleeps when the lid closes unless you prevent it. The bridge only needs the **machine awake on the network** — the display can be off and the lid can be shut.

**Option A — `caffeinate` (built in):**

```bash
# Prevent sleep while bridge runs (good for testing)
caffeinate -dims npm run bridge
```

Or wrap the background script:

```bash
caffeinate -dims bash scripts/start-bridge-local.sh
```

**Option B — Amphetamine / Caffeine** (menu-bar apps that block sleep indefinitely).

**Option C — clamshell mode** — MacBook on power + external display/keyboard; lid closed, still awake.

If the Mac actually sleeps, the Discord connection drops and @mentions won't wake the agent until you're back.

## Prerequisites

- macOS or Linux (Windows: WSL)
- Node.js 20+
- [Cursor CLI](https://cursor.com/docs/cli) — `agent login` once
- A Discord bot token ([Developer Portal](https://discord.com/developers/applications))

## 1. Install

```bash
git clone https://github.com/lilyzhng/cursor-discord-channels.git
cd cursor-discord-channels
npm install
```

## 2. Discord bot token

```bash
mkdir -p ~/.cursor/channels/discord
cat > ~/.cursor/channels/discord/.env <<'EOF'
DISCORD_BOT_TOKEN=your_bot_token_here
EOF
```

Enable **Message Content Intent** on the bot. Invite it to your server with permissions to read/send messages.

## 3. Cursor auth

```bash
agent login
agent status    # should show logged in
```

## 4. Wire Discord MCP into your project

The agent needs Discord tools. Add to **your project's** `.cursor/mcp.json` (the folder you want the agent to work in):

```json
{
  "mcpServers": {
    "discord": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/absolute/path/to/cursor-discord-channels"
    }
  }
}
```

Or copy [examples/mcp.json](../examples/mcp.json) and fix `cwd`.

## 5. Point the bridge at your project

```bash
export CURSOR_CWD=/absolute/path/to/your/project
export CURSOR_MODEL=composer-2.5   # optional; default is composer-2.5
```

Access control: `~/.cursor/channels/discord/access.json` — see [discord-access skill](../skills/discord-access/SKILL.md).

Optional team mention list: copy [examples/mentions.json](../examples/mentions.json) to `~/.cursor/channels/discord/mentions.json`.

## 6. Run (foreground — good for first test)

```bash
cd cursor-discord-channels
export CURSOR_CWD=/path/to/your/project
npm run bridge
```

In Discord: `@YourBot ping` — you should get a reply in the thread.

## 7. Run in background (nohup)

Keep the bridge up without a terminal tab:

```bash
bash scripts/start-bridge-local.sh
```

Logs: `~/.cursor/channels/discord/bridge.log`  
Stop: `kill $(cat ~/.cursor/channels/discord/bridge.pid)`

Or manually:

```bash
nohup npm run bridge >> ~/.cursor/channels/discord/bridge.log 2>&1 &
echo $! > ~/.cursor/channels/discord/bridge.pid
```

## Multiple agents on one Mac

You can run **several bots locally** — one bridge process per Discord bot. In practice **2–3 runs fine**; beyond that (especially 4–5+) concurrent agent work tends to **spike RAM** and **heat the machine** quickly.

Each agent needs its own state dir and workspace:

```bash
# Terminal / tmux pane A
export CDC_STATE_DIR=~/.cursor/channels/discord-bot-a
export CURSOR_CWD=/path/to/project-a
npm run bridge

# Terminal / tmux pane B
export CDC_STATE_DIR=~/.cursor/channels/discord-bot-b
export CURSOR_CWD=/path/to/project-b
npm run bridge
```

Each `CDC_STATE_DIR` gets its own `.env` (`DISCORD_BOT_TOKEN`) and `access.json`.

For a larger fleet without melting your laptop, use [VPS_SETUP.md](./VPS_SETUP.md).

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Bridge exits on start | `agent status` — re-run `agent login` |
| Bot online, no reply | `CURSOR_CWD` must contain `.cursor/mcp.json` with discord server |
| Agent error in Discord | `tail -f ~/.cursor/channels/discord/bridge.log` |
| Pairing message | Approve user in `access.json` (see discord-access skill) |

Auth details: [AUTH.md](./AUTH.md)
