# Local setup (recommended to start)

Run the bridge on **your Mac or laptop**. No VPS bill — only your **Cursor subscription** (Composer usage when the agent runs).

Best for: trying it out, solo use, a small fleet (2–3 bots), small teams.

## How it works on your machine

```
Discord @mention
  → bridge (Node, background via nohup)
      → spawns `cursor agent -p` per message (default model: Composer 2.5)
          → agent writes reply text → bridge posts it as this bot (default)
```

- The **bridge** is a small Node process (`npm run bridge`).
- Each message starts a **Cursor CLI agent** run — same subscription as the IDE, not a separate API key.
- By default the bridge **posts replies itself** — no Discord MCP wiring required.
- Optional **Discord MCP** (`npm run mcp`) is for IDE-side agents or legacy outbound mode — see [Advanced: Discord MCP](docs/LOCAL_SETUP.md#advanced-discord-mcp-optional).

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
- **A Discord bot you create yourself** — see [DISCORD_BOT.md](./DISCORD_BOT.md) (required; ~10 min first time)

## 1. Install

```bash
git clone https://github.com/lilyzhng/cursor-discord-channels.git
cd cursor-discord-channels
npm install
```

## 2. Create a Discord bot and save the token

If you don't have a bot yet, follow **[DISCORD_BOT.md](./DISCORD_BOT.md)** first (Developer Portal → new application → bot token → invite to your server → Message Content Intent).

Then save the token:

```bash
mkdir -p ~/.cursor/channels/discord
cat > ~/.cursor/channels/discord/.env <<'EOF'
DISCORD_BOT_TOKEN=your_bot_token_here
EOF
chmod 600 ~/.cursor/channels/discord/.env
```

## 3. Cursor auth

```bash
agent login
agent status    # should show logged in
```

## 4. Point the bridge at your project

```bash
export CURSOR_CWD=/absolute/path/to/your/project
export CURSOR_MODEL=composer-2.5   # optional; default is composer-2.5
export CDC_STATE_DIR=~/.cursor/channels/discord   # token + access.json live here
```

No `.cursor/mcp.json` is required for the default setup — the bridge posts replies itself.

Access control: `$CDC_STATE_DIR/access.json` — see [discord-access skill](../skills/discord-access/SKILL.md).

Optional team mention list: copy [examples/mentions.json](../examples/mentions.json) to `$CDC_STATE_DIR/mentions.json`.

## 5. Run (foreground — good for first test)

```bash
cd cursor-discord-channels
export CURSOR_CWD=/path/to/your/project
export CDC_STATE_DIR=~/.cursor/channels/discord
npm run bridge
```

In Discord: `@YourBot ping` — you should get a reply in the thread from **your bot's avatar**.

## 6. Run in background (nohup)

Keep the bridge up without a terminal tab:

```bash
export CURSOR_CWD=/path/to/your/project
export CDC_STATE_DIR=~/.cursor/channels/discord
bash scripts/start-bridge-local.sh
```

Logs: `$CDC_STATE_DIR/bridge.log`  
Stop: `kill $(cat $CDC_STATE_DIR/bridge.pid)`

Or manually:

```bash
nohup npm run bridge >> "$CDC_STATE_DIR/bridge.log" 2>&1 &
echo $! > "$CDC_STATE_DIR/bridge.pid"
```

## Outbound mode: bridge vs MCP

| Env | Behavior | When to use |
|-----|----------|-------------|
| `CDC_BRIDGE_OUTBOUND=bridge` (default) | Agent writes plain text; bridge calls `msg.reply()` | **Recommended** — correct avatar even with Cursor Discord plugin installed |
| `CDC_BRIDGE_OUTBOUND=mcp` | Agent uses Discord MCP `reply` tool; bridge does not post stdout | Headless VPS with no conflicting Discord MCP plugins |

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

Each bot also needs its **own workspace** when using MCP outbound mode. Do not point two bots at the same `mcp.json` without per-bot `CDC_STATE_DIR`.

**Multiple bots in one channel:** They can coexist. Each bridge only wakes on `@ThatBot`. If you **reply in bot A's thread** while `@bot-b`, bot A may also wake (reply-chain logic). Use a **new top-level message** `@bot-b …` or run the latest gate fix on all bridges.

For a larger fleet without melting your laptop, use [VPS_SETUP.md](./VPS_SETUP.md).

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Bridge exits on start | `agent status` — re-run `agent login` |
| Bot online, no reply | `CURSOR_CWD` set; check `$CDC_STATE_DIR/bridge.log` for empty stdout |
| Wrong avatar (bot A typing, bot B avatar) | Default is bridge outbound — do not set `CDC_BRIDGE_OUTBOUND=mcp` on machines with the Cursor Discord plugin |
| Another bot wakes when you @mention yours in its thread | Post a **new top-level** message; ensure all bridges run the latest gate fix |
| Agent error in Discord | `tail -f $CDC_STATE_DIR/bridge.log` |
| Pairing message | Approve user in `access.json` (see discord-access skill) |

Auth details: [AUTH.md](./AUTH.md)

## Advanced: Discord MCP (optional)

**You do not need this for the default bridge setup.**

Discord MCP is a separate Cursor tool server (`npm run mcp`) that gives agents Discord actions: `reply`, `fetch_messages`, `react`, polls, attachments, etc.

| Use case | Need MCP? |
|----------|-----------|
| `@mention → agent reply` via bridge (default) | **No** — bridge posts for you |
| Agent replies via MCP tools (`CDC_BRIDGE_OUTBOUND=mcp`) | Yes |
| Cursor IDE agent with Discord tools while you code | Yes |

If you want MCP, add to **your project's** `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "discord": {
      "command": "bash",
      "args": ["scripts/run-mcp.sh"],
      "cwd": "/absolute/path/to/cursor-discord-channels",
      "env": {
        "CDC_STATE_DIR": "/Users/you/.cursor/channels/discord"
      }
    }
  }
}
```

Use `scripts/run-mcp.sh` (not `npm run mcp` directly) so the MCP loads the token from `CDC_STATE_DIR/.env`. Copy [examples/mcp.json](../examples/mcp.json) and fix paths.

**Important:** `CDC_STATE_DIR` must match the bridge's state dir when both run. Do not add a global `~/.cursor/mcp.json` `discord` entry without `CDC_STATE_DIR` — Cursor may merge configs and pick the wrong bot token.
