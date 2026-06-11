# cursor-discord-channels

**Talk to your cursor agents in Discord, get the work done**

Discord bridge + MCP tools for Cursor. When someone @mentions your bot, a small **bridge** wakes the **Cursor CLI agent** (Composer by default); the agent replies via **Discord MCP** (`reply`, `react`, read history, etc.).

```
Discord  →  bridge  →  cursor agent  →  Discord MCP  →  reply in thread
```

Uses your **Cursor subscription** — no separate API bill. No VPS required to get started.

## Choose your setup

| | **Local (start here)** | **VPS (always-on)** |
|---|---|---|
| **Cost** | No VM — subscription only | ~$5–10/mo server |
| **Difficulty** | Easiest (`nohup` on your Mac) | SSH + systemd |
| **RAM** | Uses your laptop while agent runs | Uses server RAM |
| **Uptime** | Laptop on & awake | 24/7 without your machine |
| **Agents** | One bot comfortably | Several bots / workspaces |
| **Guide** | [docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md) | [docs/VPS_SETUP.md](docs/VPS_SETUP.md) |

## Quick start (local)

```bash
git clone https://github.com/lilyzhng/cursor-discord-channels.git
cd cursor-discord-channels
npm install
```

1. Discord bot token → `~/.cursor/channels/discord/.env` (`DISCORD_BOT_TOKEN=...`)
2. `agent login`
3. Add Discord MCP to your project's `.cursor/mcp.json` (see [LOCAL_SETUP.md](docs/LOCAL_SETUP.md))
4. `export CURSOR_CWD=/path/to/your/project`
5. `npm run bridge` — or `bash scripts/start-bridge-local.sh` for background

Full walkthrough: **[docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md)**

## What you get

- **@mention your bot** → real reply in the thread
- **Subscription auth** — same quota as Cursor IDE / CLI
- **Access control** — pairing, allowlists, trusted bots
- **Self-hosted** — your token, your rules

## More help

- [docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md) — Mac/laptop + nohup (recommended first)
- [docs/VPS_SETUP.md](docs/VPS_SETUP.md) — systemd, multi-agent on a server
- [docs/AUTH.md](docs/AUTH.md) — subscription vs API key
- [skills/discord-access/SKILL.md](skills/discord-access/SKILL.md) — who can talk to the bot

## License

MIT
