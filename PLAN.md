# Plan: cursor-discord-channels

**Goal:** Replicate GeniusTeam's always-on Discord agent stack for Cursor CLI on a droplet, then publish as a Cursor Marketplace plugin.

**Owner:** lilyzhng  
**Repo:** https://github.com/lilyzhng/cursor-discord-channels  
**Started:** 2026-06-09

---

## North star

A user can:

1. `npm install -g @lilyzhng/cursor-discord-channels` (or clone + systemd)
2. Configure bot token + `access.json` (pairing / allowlist / trustedBots)
3. Run `cursor-discord-bridge` as a systemd service on a droplet
4. @mention the bot in Discord → `cursor agent` runs in repo cwd → replies via MCP `reply`

Same mental model as `claude --channels plugin:discord`, but for Cursor.

---

## Phases

### Phase 0 — Validate assumptions (1–2 days)

**Before writing the bridge, prove the stack works on the droplet.**

| # | Task | Done when |
|---|------|-----------|
| 0.1 | Install Cursor CLI on `genius-team-v2` droplet | `cursor agent --version` works |
| 0.2 | `cursor agent login` on droplet (subscription OAuth) | `cursor agent status` shows logged in |
| 0.3 | Run headless agent with Discord MCP | `cursor agent -p --yolo --approve-mcps "reply to channel X with pong"` uses `reply` tool |
| 0.4 | Document CLI flags that work | Note in `docs/DROPLET_VALIDATION.md` |

**Exit criteria:** One successful round-trip: manual prompt → agent → Discord `reply` (even without inbound bridge).

**Risk:** [Forum reports](https://forum.cursor.com/t/cursor-agent-p-mode-does-not-inject-mcp-server-tools-into-agent-context/155275) of MCP not injecting in `-p` mode. Mitigation: `--yolo --approve-mcps`.

---

### Phase 1 — MVP bridge (1 week) 🚧 IN PROGRESS

**Shipped in repo (2026-06-09):**
- `shared/` access + gate + inbound formatting
- `bridge/daemon.ts` — Discord → `cursor agent -p`
- `mcp/server.ts` — ported fork, `CDC_MCP_ONLY=1` for tool-only mode
- `examples/mcp.json`, systemd unit, sync script skeleton


**Minimal inbound: Discord message → spawn agent → reply.**

| Component | Description |
|-----------|-------------|
| `mcp/server.ts` | Port Lily's fork; state dir `~/.cursor/channels/discord/` |
| `bridge/daemon.ts` | Long-running process: Discord gateway → gate → `cursor agent -p` |
| `skills/discord-access/` | Port `/discord:access` skill for pairing + allowlist |
| `examples/systemd/` | `cursor-discord-bridge.service` for droplet |

**MVP behavior:**

- Single agent, single repo cwd
- @mention or reply-to-bot triggers agent
- Access control: pairing + `groups["*"]` + `trustedBots` (from fork)
- Agent receives inbound as structured prompt (mirror `<channel>` block format)
- Agent must call `reply` MCP tool (not stdout)

**Out of scope for MVP:**

- Multi-agent fleet routing
- Discord permission buttons (`claude/channel/permission` — use Cursor CLI approvals instead)
- Voice module
- Cloud Agent mode

**Exit criteria:**

- [ ] Message in `#task-tracker` → Bill-equivalent bot replies within 60s on droplet
- [ ] `access.json` pairing flow works
- [ ] Bot-to-bot messages work when both IDs in `trustedBots`
- [ ] systemd unit survives restart

---

### Phase 2 — GeniusTeam parity (1–2 weeks)

| # | Task |
|---|------|
| 2.1 | Port `sync-discord-plugin.sh` → `sync-discord-mcp.sh` for Cursor paths |
| 2.2 | tmux attach story (optional: log streaming for debugging) |
| 2.3 | Multi-session fleet routing (port fleet-discord claim/busy/sticky logic) |
| 2.4 | Tool-stream live status message in Discord |
| 2.5 | Integrate with `genius` CLI (`genius restart`, watchdog) |

**Exit criteria:** Drop-in replacement candidate for one GeniusTeam agent (start with `genius-builder`).

---

### Phase 3 — Cursor plugin packaging (3–5 days)

Package as installable Cursor plugin per [plugin docs](https://cursor.com/docs/plugins).

```
.cursor-plugin/
  plugin.json          # manifest
mcp/
  server.ts            # stdio MCP
bridge/
  daemon.ts            # optional: headless only
skills/
  discord-access/
examples/
  mcp.json
  systemd/
  genius-builder.service
```

| # | Task |
|---|------|
| 3.1 | Write `.cursor-plugin/plugin.json` with `mcpServers` + skills |
| 3.2 | MCP deeplink for one-click install |
| 3.3 | README + setup guide (droplet + local IDE) |
| 3.4 | Submit to [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish) |

**Positioning:** *"Always-on Discord agents for Cursor — self-hosted, access-controlled, droplet-ready."*

---

## Architecture (target)

```
Discord Gateway
      │
      ▼
┌─────────────────┐     spawn      ┌──────────────────┐
│  bridge/daemon  │ ──────────────►│  cursor agent -p │
│  (gate, queue)  │                │  --yolo          │
└────────┬────────┘                └────────┬─────────┘
         │                                  │
         │         stdio MCP                │
         └──────────────┬───────────────────┘
                        ▼
              ┌─────────────────┐
              │  mcp/server.ts  │
              │  reply, react,  │
              │  fetch_messages │
              └─────────────────┘
```

**Key design choice:** Bridge owns the Discord gateway connection. MCP server handles outbound tools only (same as Claude Code plugin). Bridge injects inbound messages into the agent prompt.

---

## What we reuse vs build

| Asset | Source | Action |
|-------|--------|--------|
| MCP server + access control | [lilyzhng/claude-plugins-official](https://github.com/lilyzhng/claude-plugins-official) | Port; change state paths to `~/.cursor/` |
| Fleet routing | [fleet-discord](https://github.com/Agent-Crafting-Table/fleet-discord) | Phase 2; adapt from Claude-only |
| systemd / tmux patterns | GeniusTeam | Copy as examples |
| Inbound bridge | — | **Build** (~300–500 LOC) |
| IDE-only Discord | Cursor built-in plugin | Keep for local dev; not droplet |

---

## Success metrics

| Tier | Metric |
|------|--------|
| MVP | 1 droplet agent, 24h uptime, <5% missed @mentions |
| Parity | genius-builder runs on Cursor bridge for 1 week without regression |
| Product | Plugin listed on Cursor Marketplace; 10 external installs |

---

## Open questions

1. **Session continuity** — `cursor agent --resume` vs fresh spawn per message?
2. **Concurrent messages** — queue vs fleet claim (defer to Phase 2)?
3. **MCP process model** — one MCP server per bridge, or shared?
4. **Cursor approval UX** — can `--yolo` run unattended on droplet safely with sandbox?

---

## Next action

Run **Phase 0** on the droplet: validate `cursor agent -p` + Discord MCP end-to-end before writing the bridge.

```bash
# On genius-team-v2 (after Cursor CLI install)
cursor agent login   # once — subscription, not API key
cd ~/GeniusTeam/genius-builder
cursor agent -p --yolo --approve-mcps \
  "Use the discord reply tool to send 'cursor bridge test ok' to channel CHAT_ID"
```

Record result in `docs/DROPLET_VALIDATION.md`.
