# Droplet Validation (Phase 0)

**Status:** Partial — local smoke tests passed, full E2E pending  
**Target host:** `genius-team-v2` @ `159.223.130.34`

## Checklist

- [x] Cursor CLI installed (local: `2026.06.04-5fd875e`)
- [x] `cursor agent login` — subscription, no API key (local: Pro+)
- [x] Discord MCP configured (`~/.cursor/mcp.json` — project-level `.cursor/mcp.json` not picked up by CLI yet)
- [x] MCP tools visible (`reply`, `fetch_messages`, … — 9 tools)
- [x] Bridge starts, connects as `genius-builder#1001`
- [ ] Full E2E: @mention → agent → `reply` on Discord
- [ ] Droplet validation

## Local smoke (2026-06-09)

| Test | Result |
|------|--------|
| `unset CURSOR_API_KEY && cursor agent -p --trust "..."` | ✅ subscription auth works |
| `npm run bridge` | ✅ gateway connected |
| `cursor agent mcp list-tools discord` | ✅ 9 tools after `mcp enable discord` |
| @mention E2E | ⏳ not run (avoid conflicting with live droplet bot) |

## E2E test procedure

```bash
cd cursor-discord-channels
export CURSOR_CWD=~/Documents/lily-memory/GeniusTeam/genius-builder
npm run bridge
# In Discord: @genius-builder "ping — reply with pong using discord reply tool"
```

**Note:** Stop droplet `genius-builder` systemd first if using the same bot token locally.

## Droplet commands

```bash
cursor agent login
cursor agent status
cd ~/cursor-discord-channels && npm install
# ~/.cursor/mcp.json + systemd unit
sudo systemctl start cursor-discord-bridge
```
