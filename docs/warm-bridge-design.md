# Design Doc: A warm, persistent bridge for Cursor Agent

**Status:** Draft for review
**Author:** Bill (genius-builder)
**Question this answers:** Why can't we just copy the Claude Discord plugin to make Jackie (Cursor Agent) warm like the Claude Code agents? Is it because Claude and Cursor run differently?

---

## TL;DR

The Claude Discord plugin is a **channel**: it speaks a Claude-specific protocol (`notifications/claude/channel`) that **pushes** each Discord message into Claude Code. But a channel alone is not warmth — warmth comes from the **other half**: Claude Code's `--channels` **runtime**, which *consumes* those pushes into one long-lived, warm agent session.

**Cursor Agent has the channel-able side but not the consuming side.** Its MCP lets the agent *call* tools during a run; it has **no runtime that accepts an external push and wakes a warm, persistent session.** So you can't copy the plugin to get warmth — you'd be missing the half that makes it warm.

**The core problem to solve: build the missing "consuming end" for Cursor Agent** — make the bridge itself the persistent runtime that keeps a warm `cursor-agent` session alive and injects pushed Discord messages into it. That is the `--channels`-for-Cursor capability this repo exists to create. Today the bridge does the cheap stand-in (cold `cursor-agent -p` per message); this doc proposes the warm version.

---

## The core problem (what we're solving)

`notifications/claude/channel` is a **Claude-specific protocol with two ends**:
- **Channel end** (the plugin): connects to Discord, *pushes* messages, exposes reply tools. Portable.
- **Consuming end** (Claude Code's `--channels` runtime): accepts the pushes, injects each into **one warm, persistent agent session**, runs a turn. **Not portable — and the thing that makes it warm.**

**Cursor Agent has no consuming end.** MCP = "agent calls tools during a run," not "external source pushes a message into a warm session." So the work is: **build that consuming end for `cursor-agent`** — a bridge that holds a warm `cursor-agent` session and injects messages into it, instead of cold-spawning `-p` per message.

---

## How the Claude path is warm

Invocation: `claude --channels plugin:discord@claude-plugins-official`

It is a **two-ended, Claude-specific channel protocol**, and both ends matter:

1. **The discord plugin (`server.ts`) — the channel end.** It is an MCP server that *also speaks a Claude-specific channel protocol* (`claude/channel`). In the code:
   - it advertises the capability: `capabilities: { 'claude/channel': {} }` (~L462);
   - on each inbound Discord message it **actively pushes** to Claude Code: `mcp.notification({ method: 'notifications/claude/channel', ... })` (~L1064);
   - permission prompts flow through `notifications/claude/channel/permission` (~L982/L1029) and `…/permission_request` (~L496).
   It also connects to Discord (discord.js), applies access control, and exposes the I/O tools (`reply`, `fetch_messages`, `react`, `create_thread`, `edit_message`, `download_attachment`). So the plugin genuinely **is the channel** — that is why it is named "Discord Channels" — not a passive adapter.

2. **Claude Code's `--channels` runtime — the consuming end.** Claude Code runs **one long-lived agent session** and *consumes* the channel's `notifications/claude/channel` pushes, injecting each as a turn, then replying via the plugin's `reply` tool. The session stays **warm** between messages: conversation in memory, prompt cache hot, no process restart.

**The channel does not produce warmth by itself.** Warmth comes from Claude Code's runtime *consuming* the channel's pushes into a persistent session. The plugin (channel) and Claude Code (warm consumer) are the **two halves** of the Claude-specific `claude/channel` protocol.

## How the Cursor path works today (cold)

`cursor-discord-channels` is an **external bridge** (a Node daemon) that:
- listens to Discord itself, then
- for each message, runs `cursor-agent -p "<message>"`.

`-p` (print mode) is **one-shot**: spawn process → cold start (binary init + MCP handshake + re-read the thread's context) → run → exit. Every message pays that cold-start tax. The *bridge* is persistent; the *agent* is not. On the droplet that overhead dominates, which is why Jackie (a fast model, Composer 2.5) often answers last.

## Why we can't just copy the Claude plugin

- **The Discord tools are portable.** The plugin's MCP tools (`reply`, etc.) would work with any MCP-capable agent, and `cursor-agent` supports MCP. (`cursor-discord-channels` already has an MCP-reply mode.)
- **The channel protocol is not portable.** The plugin pushes messages via `notifications/claude/channel` — a **Claude-specific** protocol that only Claude Code's `--channels` runtime understands and consumes into a warm session. Copying the plugin still requires *the other half* (a runtime that consumes those pushes). `cursor-agent` is not that runtime, and exposes nothing equivalent:
  - `-p` — one-shot (spawn, run, exit)
  - interactive **TUI** — persistent, but human-driven (terminal UI, not a clean API)
  - `--resume` / `--continue` — conversation continuity, but the **process still cold-starts**
  - `worker` — a *Cursor-cloud-driven* worker (cloud claims it to run agents on your infra); not a local bridge feeding prompts
  - **MCP** — lets the agent *call* tools during a run; it does **not** let an external channel *push* a message that wakes a warm session

None of these is the primitive we need: *"external provider pushes a message → a warm, persistent agent session runs a turn."* That primitive simply does not exist in `cursor-agent`.

**So:** porting the plugin would give Cursor Agent the Discord *tools*, but not the warm *loop*. The warmth has to be supplied by us.

## So yes — Claude and Cursor genuinely run differently

- **Claude Code** = a persistent agent **runtime** with a plugin/channels API. The plugin attaches to it; warmth comes for free.
- **`cursor-agent`** = a one-shot CLI (or a human TUI). There is **no persistent runtime for an external channel to attach to.**

It is not that we forgot to copy the implementation. There is nothing to attach the implementation *to*. To get `--channels`-style warmth for Cursor, the bridge itself must *become* the persistent runtime that keeps a warm `cursor-agent` session alive and feeds it.

---

## Design options

### Option A — PTY-driven persistent interactive session (the true warm path)
Keep **one** `cursor-agent` interactive process (no `-p`) alive per channel, under a pseudo-terminal. The bridge writes messages to the PTY and reads responses; the process stays warm across messages.

- **Pros:** real warmth, no cold start — the genuine `--channels` equivalent, the new capability we want to bring to Cursor Agent.
- **Cons / risks:** we'd be driving an *unsupported* TUI. A quick probe confirmed it **boots and accepts stdin under a PTY**, but robustly driving it is real engineering: readiness detection, correct submit semantics, and parsing **response boundaries out of ANSI/TUI output** (including how tool-use is rendered). Brittle to Cursor UI changes.

### Option B — `-p --resume --output-format json` (cold process, warm session)
Use `--resume <chatId>` so the agent resumes its session (does **not** re-read the whole thread) with clean JSON output.

- **Pros:** supported and robust; kills the **biggest** cost (re-reading long-thread context); small, low-risk change.
- **Cons:** the process still cold-starts each message — a few seconds of fixed overhead remains, but the expensive re-read is gone.

### Option C — Migrate Jackie back to Claude Code
Warm for free, but loses Composer 2.5. Explicitly **not** the goal (the point is to bring this capability *to* Cursor Agent). Listed for completeness.

---

## Recommendation

A two-track plan that gives responsiveness now and builds the real thing:

1. **Now (low risk):** ship Option B — `--resume` + structured output — to remove the re-read tax and make Jackie usable immediately.
2. **In parallel (the real build):** Option A — prototype a robust PTY session driver, validate it can reliably feed-one / read-one, then swap the bridge from spawn-per-message to one warm session per channel. This is the novel `--channels`-for-Cursor capability.

## Open questions / risks for Option A
- Can we reliably detect "response complete" from the TUI stream?
- How does the TUI render tool-use / MCP calls, and can we parse around it?
- Session isolation: one warm process per Discord channel — what's the memory cost on the 3.8 GB box? (May need an LRU of warm sessions.)
- Resilience: a wedged warm session needs the existing watchdog (consecutive-timeout → restart) to apply per session.
