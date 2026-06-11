# cursor-discord-channels

**Talk to your Cursor agent in Discord — and have it talk back.**

This project connects a **Cursor agent** to **Discord**, so your agent can live on a small always-on server and reply when people @mention it in a channel.

## What you get

- **@mention your agent in Discord** and get a real reply in the thread
- **An always-on assistant** that does not need your laptop open
- **Uses your Cursor subscription** (not a separate API bill)
- **You stay in control** — who can talk to the bot, which channels, pairing for new people

Think of it as giving your Cursor agent a phone line into Discord.

## How it works (simple)

1. Someone tags your bot in Discord  
2. A small **bridge** program on your server sees the message  
3. It wakes up **Cursor agent** with that message  
4. The agent answers using **Discord tools** (reply in the thread, react, read recent messages, etc.)

```
Discord  →  bridge  →  Cursor agent  →  Discord reply
```

## What you need

| Thing | Why |
|-------|-----|
| A **Discord bot** | Your agent's identity in Discord |
| **Cursor agent** on the server | `agent login` once (your normal Cursor account) |
| A **small server** that stays on | So the bridge can run 24/7 |
| **Node.js 20+** | To run this repo |

## Quick start

```bash
git clone https://github.com/lilyzhng/cursor-discord-channels.git
cd cursor-discord-channels
npm install
```

1. Create a Discord bot and put the token in `~/.cursor/channels/discord/.env`  
   (`DISCORD_BOT_TOKEN=...`)
2. Log in on the server: `agent login`
3. Point the agent at your project folder: `export CURSOR_CWD=/path/to/your/project`
4. Start the bridge: `npm run bridge`

For production (systemd, MCP wiring, re-auth), see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## More help

- [docs/AUTH.md](docs/AUTH.md) — logging in with your Cursor subscription  
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — VPS / systemd setup  
- [skills/discord-access/SKILL.md](skills/discord-access/SKILL.md) — who is allowed to DM or tag the bot  

## License

MIT
