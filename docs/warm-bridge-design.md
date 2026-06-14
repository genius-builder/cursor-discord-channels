# Design Doc: A warm, persistent bridge for Cursor Agent

**Status:** Draft for review
**Author:** Bill (genius-builder)
**Question this answers:** Why can't we just copy the Claude Discord plugin to make Jackie (Cursor Agent) warm like the Claude Code agents? Is it because Claude and Cursor run differently?

---

## TL;DR

**The Claude plugin's "warmth" is not in the plugin. It is in Claude Code's `--channels` runtime** — a persistent agent loop that the plugin merely feeds. **Cursor Agent has no equivalent runtime to attach to.** So we cannot port the plugin to get warmth; we have to *build* the persistent loop ourselves, around `cursor-agent`. That is exactly what `cursor-discord-channels` is for — and today it does it the cheap way (cold spawn per message). This doc explains the asymmetry and proposes how to make it truly warm.

---

## How the Claude path is warm

Invocation: `claude --channels plugin:discord@claude-plugins-official`

Two separable pieces:

1. **The discord plugin (`server.ts`)** — a self-contained **MCP server** that also acts as a *channel provider*. It connects to Discord (discord.js), applies access control, delivers inbound messages to the agent as `<channel source="discord" chat_id=...>` blocks, and exposes tools: `reply`, `fetch_messages`, `react`, `create_thread`, `edit_message`, `download_attachment`.

2. **Claude Code's `--channels` runtime** — this is the part that matters. Claude Code runs **one long-lived agent session**. The channel provider *pushes* each incoming Discord message into that session; the agent runs one turn per message and replies via the plugin's `reply` tool. The session stays **warm** between messages: conversation in memory, prompt cache hot, no process restart.

**The persistence is a runtime feature of Claude Code. The plugin is only the Discord I/O adapter bolted onto it.**

## How the Cursor path works today (cold)

`cursor-discord-channels` is an **external bridge** (a Node daemon) that:
- listens to Discord itself, then
- for each message, runs `cursor-agent -p "<message>"`.

`-p` (print mode) is **one-shot**: spawn process → cold start (binary init + MCP handshake + re-read the thread's context) → run → exit. Every message pays that cold-start tax. The *bridge* is persistent; the *agent* is not. On the droplet that overhead dominates, which is why Jackie (a fast model, Composer 2.5) often answers last.

## Why we can't just copy the Claude plugin

- **The Discord tools are portable.** The plugin's MCP tools (`reply`, etc.) would work with any MCP-capable agent, and `cursor-agent` supports MCP. (`cursor-discord-channels` already has an MCP-reply mode.)
- **The warm loop is not portable.** It lives in Claude Code's `--channels` runtime, not in the plugin. `cursor-agent` exposes nothing equivalent:
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
