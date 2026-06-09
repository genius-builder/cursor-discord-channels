# Droplet Validation (Phase 0)

**Status:** Not started  
**Target host:** `genius-team-v2` @ `159.223.130.34`

## Checklist

- [ ] Cursor CLI installed
- [ ] `cursor agent login` done (subscription — see [AUTH.md](AUTH.md))
- [ ] Discord MCP configured in `~/.cursor/mcp.json`
- [ ] Headless agent calls `reply` tool successfully
- [ ] Flags documented: `--yolo`, `--approve-mcps`, `--resume`

## Commands

```bash
# 1. Install Cursor CLI (see cursor.com/docs/cli)
cursor agent --version

# 2. Smoke test
cursor agent status   # must show logged in
cd ~/GeniusTeam/genius-builder
cursor agent -p --yolo --approve-mcps \
  "Use the discord reply tool to send 'cursor bridge test ok' to channel <CHAT_ID>"
```

## Results

| Date | Test | Outcome | Notes |
|------|------|---------|-------|
| — | — | — | — |
