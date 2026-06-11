# Production deployment

Run the bridge on a small always-on server (VPS, home lab, etc.) so your agent can reply in Discord without your laptop.

## Prerequisites

- Node.js 20+
- [Cursor CLI](https://cursor.com/docs/cli) installed on the server (`agent login` once)
- A Discord bot token ([Discord Developer Portal](https://discord.com/developers/applications))

## 1. Install

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

Set the agent workspace (your project with rules, skills, MCP config):

```bash
export CURSOR_CWD=/path/to/your/project
export CURSOR_MODEL=composer-2.5   # optional
```

Access control lives in `~/.cursor/channels/discord/access.json`. See [skills/discord-access/SKILL.md](../skills/discord-access/SKILL.md).

Optional mention roster for your team (`mentions.json` in the same directory):

```json
{
  "entries": [
    { "label": "Alice", "userId": "123456789012345678" }
  ]
}
```

## 3. Run manually

```bash
npm run bridge
```

## 4. systemd (auto-restart on boot)

Copy and edit the example unit:

```bash
sudo cp examples/systemd/cursor-discord-bridge.service /etc/systemd/system/
# Edit User, paths, CURSOR_CWD, token env file
sudo systemctl daemon-reload
sudo systemctl enable --now cursor-discord-bridge
journalctl -u cursor-discord-bridge -f
```

## 5. MCP in your project

Add the Discord MCP server to your project's `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "discord": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/path/to/cursor-discord-channels"
    }
  }
}
```

## Re-authenticate from your laptop

If subscription login expires on the server:

```bash
bash scripts/reauth.sh user@your-server-ip
```

See [AUTH.md](./AUTH.md) for subscription vs API key.
