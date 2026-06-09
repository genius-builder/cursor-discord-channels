# Jackie Pilot — Cursor Agent replaces Claude Code on Droplet

**Goal:** Stop `genius-product.service` (Claude Jackie). Run `cursor-genius-product.service` instead. Bill, Lucy, Andrej stay on Claude Code.

## Why Jackie first

- Jackie is supervisor + career agent, good test of skills/rules + Discord threads
- You work with Jackie locally on Mac already
- Heartbeat `@everyone` pings all agents — disable Claude Jackie so only Cursor Jackie answers

## Architecture

```
Discord @Jackie
    → cursor-genius-product (systemd)
    → bridge/daemon.ts
    → cursor agent -p  (subscription login, not API key)
    → genius-product worktree + .cursor/rules/jackie.mdc
    → discord MCP reply
```

## Prerequisites (droplet)

```bash
# Cursor CLI
curl https://cursor.com/install -fsS | bash

# Subscription auth (from laptop)
bash ~/cursor-discord-channels/scripts/reauth.sh 159.223.130.34

# Jackie's bot token
# ~/.cursor/channels/discord-jackie/.env
DISCORD_BOT_TOKEN=<jackie bot token from genius-product/.env>
```

## Deploy (from laptop)

```bash
cd cursor-discord-channels
bash scripts/deploy-jackie-pilot.sh 159.223.130.34
```

## agent-pulse.yml change

Watchdog should monitor `cursor-genius-product` instead of `genius-product`:

```yaml
AGENTS="genius-builder genius-growth genius-researcher cursor-genius-product"
```

Heartbeat stays — Cursor Jackie will receive `@everyone` pings like Claude Jackie did.

## Rollback

```bash
ssh genius@159.223.130.34
sudo systemctl stop cursor-genius-product
sudo systemctl disable cursor-genius-product
sudo systemctl enable genius-product
sudo systemctl start genius-product
```

## Test checklist

- [ ] `systemctl status cursor-genius-product` → active
- [ ] `journalctl -u cursor-genius-product` → `connected as Jackie#...`
- [ ] Discord: @Jackie "ping" → reply in thread via `reply` tool
- [ ] Heartbeat thread: Jackie reports changes (not silent)
- [ ] Bill/Lucy/Andrej still on Claude, unaffected

## Known gaps (pilot)

- Project `.cursor/mcp.json` may need global `~/.cursor/mcp.json` on droplet (CLI discovery quirk)
- Session `--resume` may need tuning for multi-turn threads
- Skills in `~/.claude/skills/` not auto-loaded — port key skills to `~/.cursor/skills/` as needed
