# VPS setup (always-on, multi-agent)

Run the bridge on a **small always-on server** (DigitalOcean, Fly, home lab, etc.).

Best for: 24/7 without your laptop, multiple bots/agents, teams.

## Tradeoffs

| Pros | Cons |
|------|------|
| No laptop dependency | Small **monthly VM cost** |
| RAM on the server, not your Mac | One-time server + `agent login` setup |
| Run **several agents** (one bot + `CDC_STATE_DIR` each) | You maintain the box (updates, restarts) |

For the fastest first run, try [LOCAL_SETUP.md](./LOCAL_SETUP.md) on your Mac first.

## Prerequisites

- Node.js 20+ on the server
- [Cursor CLI](https://cursor.com/docs/cli) on the server
- Discord bot token(s)
- SSH access

## 1. Install on the server

```bash
git clone https://github.com/lilyzhng/cursor-discord-channels.git
cd cursor-discord-channels
npm install
```

## 2. Configure

```bash
mkdir -p ~/.cursor/channels/discord
cat > ~/.cursor/channels/discord/.env <<'EOF'
DISCORD_BOT_TOKEN=your_bot_token_here
EOF
```

```bash
export CURSOR_CWD=/path/to/your/project   # agent workspace on the server
export CURSOR_MODEL=composer-2.5          # optional
```

Wire MCP in that project's `.cursor/mcp.json` (same as local — see [LOCAL_SETUP.md §4](./LOCAL_SETUP.md#4-wire-discord-mcp-into-your-project)).

Access control: [discord-access skill](../skills/discord-access/SKILL.md).

## 3. Authenticate on the server

```bash
cursor agent login    # use SSH port-forward if headless browser is awkward
cursor agent status
```

From your laptop (copy auth to server):

```bash
bash scripts/reauth.sh user@your-server-ip
```

See [AUTH.md](./AUTH.md).

## 4. Test manually

```bash
npm run bridge
```

## 5. systemd (auto-restart on boot)

```bash
sudo cp examples/systemd/cursor-discord-bridge.service /etc/systemd/system/
# Edit: User, WorkingDirectory, EnvironmentFile, CURSOR_CWD
sudo systemctl daemon-reload
sudo systemctl enable --now cursor-discord-bridge
journalctl -u cursor-discord-bridge -f
```

## Multiple agents on one VPS

Run one bridge process per Discord bot. Give each its own state directory and workspace:

```bash
# Agent A
export CDC_STATE_DIR=~/.cursor/channels/discord-bot-a
export CURSOR_CWD=/path/to/project-a

# Agent B (separate systemd unit or tmux pane)
export CDC_STATE_DIR=~/.cursor/channels/discord-bot-b
export CURSOR_CWD=/path/to/project-b
```

Each `CDC_STATE_DIR` needs its own `.env` (`DISCORD_BOT_TOKEN`) and `access.json`.

## Troubleshooting

Same as local — check `agent status`, `CURSOR_CWD`, and MCP config. Logs via `journalctl -u cursor-discord-bridge`.
