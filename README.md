# cursor-discord-channels

**Claude Code `--channels plugin:discord` for Cursor** — always-on Discord agents on your own server (droplet, VPS, or local).

## Problem

[GeniusTeam](https://github.com/lilyzhng/GeniusTeam) runs four always-on agents (Bill, Lucy, Andrej, Jackie) on a DigitalOcean droplet via:

```bash
claude --channels plugin:discord@claude-plugins-official --dangerously-skip-permissions
```

Cursor has Discord MCP tools in the IDE (ported from `claude-plugins-official`), but **no headless channels bridge** for `cursor agent` on a server. This repo fills that gap.

## What exists vs what's missing

| Layer | Status |
|-------|--------|
| Discord MCP (`reply`, `fetch_messages`, access control) | ✅ Port from [lilyzhng/claude-plugins-official](https://github.com/lilyzhng/claude-plugins-official) fork |
| Inbound push (Discord → agent session) | ❌ **This repo** |
| Headless `cursor agent -p` + MCP | ⚠️ Validate on droplet (`--yolo --approve-mcps`) |
| Multi-agent fleet routing | 🔜 Phase 2 (port [fleet-discord](https://github.com/Agent-Crafting-Table/fleet-discord) ideas) |

## Docs

- [PLAN.md](PLAN.md) — phases, milestones, success criteria
- [docs/REPLICATION_SPEC.md](docs/REPLICATION_SPEC.md) — architecture, components, API surface

## Status

**MVP in progress** — bridge daemon + ported MCP server. Phase 0 droplet validation pending.

### Quick start (local)

```bash
git clone https://github.com/lilyzhng/cursor-discord-channels.git
cd cursor-discord-channels
npm install

# ~/.cursor/channels/discord/.env
# DISCORD_BOT_TOKEN=...

cursor agent login   # subscription OAuth — NOT API key (see docs/AUTH.md)

# Copy MCP config into your agent repo
cp examples/mcp.json /path/to/your-repo/.cursor/mcp.json
# Edit cwd in mcp.json to this repo path

export CURSOR_CWD=/path/to/your-repo
npm run bridge
```

See [PLAN.md](PLAN.md) for phases.

## Related

- Lily's Discord fork: [lilyzhng/claude-plugins-official](https://github.com/lilyzhng/claude-plugins-official) (`trustedBots`, `groups["*"]`)
- GeniusTeam droplet setup: `GeniusTeam/scripts/sync-discord-plugin.sh`, `genius-builder.service`
- Closest prior art: [cursor-claw](https://github.com/Agent-Crafting-Table/cursor-claw) (editor-first, slash commands — not drop-in)

## License

MIT
