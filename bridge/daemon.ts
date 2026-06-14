#!/usr/bin/env tsx
/**
 * Cursor Discord bridge — inbound gateway.
 * Discord message → access gate → cursor agent -p → bridge posts reply (default).
 * Set CDC_BRIDGE_OUTBOUND=mcp for legacy agent-side Discord MCP replies.
 */

import { Client, GatewayIntentBits, Partials, type Message } from 'discord.js'
import {
  loadAccess,
  reconcileTrustedBots,
  startApprovalPoller,
} from '../shared/access.js'
import { loadStateEnv } from '../shared/env.js'
import { buildAgentPrompt, extractBridgeReply, formatChannelBlock } from '../shared/format-inbound.js'
import { gate } from '../shared/gate.js'
import { ENV_FILE } from '../shared/paths.js'
import { ensureCursorSubscriptionAuth } from './auth.js'
import { runCursorAgent } from './run-agent.js'

loadStateEnv()
reconcileTrustedBots()
ensureCursorSubscriptionAuth()

const TOKEN = process.env.DISCORD_BOT_TOKEN
if (!TOKEN) {
  process.stderr.write(`bridge: DISCORD_BOT_TOKEN required (set in ${ENV_FILE})\n`)
  process.exit(1)
}

const CWD = process.env.CURSOR_CWD ?? process.cwd()

const client = new Client({
  intents: [
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
})

let busy = false
const queue: Message[] = []

// Watchdog: agent runs are drained serially, so a single hung run (SIGTERM'd
// at the timeout) blocks every channel. The process stays alive, so systemd's
// Restart=always never fires and the bot goes silently dead. Count consecutive
// timeouts and self-exit once they cross the threshold — systemd then restarts
// the unit fresh (re-running ExecStartPre MCP sync + auth), clearing the wedge.
const MAX_CONSECUTIVE_TIMEOUTS = Number(process.env.CDC_MAX_CONSECUTIVE_TIMEOUTS ?? 2)
let consecutiveTimeouts = 0

async function fetchTextChannel(id: string) {
  const ch = await client.channels.fetch(id)
  if (!ch?.isTextBased()) throw new Error(`channel ${id} not text-based`)
  return ch
}

startApprovalPoller(async (channelId, text) => {
  const ch = await fetchTextChannel(channelId)
  if ('send' in ch) await ch.send(text)
})

// Post a reply without dumping into a main-channel feed. The bridge (not the
// agent) decides where the reply lands, so this is the only place that can keep
// replies in threads. If the inbound message is already in a thread, reply
// there. If it arrived in a parent channel, reply inside that message's thread,
// creating one if needed — that's what stops the bot replying in the channel
// feed when it's @-mentioned on a top-level message (e.g. a PR announcement).
async function postReply(msg: Message, text: string): Promise<void> {
  if (msg.channel?.isThread?.()) {
    await msg.reply(text)
    return
  }
  let thread = msg.thread ?? null
  if (!thread) {
    try {
      thread = await msg.startThread({
        name: (msg.author.username || 'reply').slice(0, 90),
        autoArchiveDuration: 1440,
      })
    } catch {
      thread = null
    }
  }
  if (thread) await thread.send(text)
  else await msg.reply(text)
}

async function processMessage(msg: Message): Promise<void> {
  const result = await gate(client, msg)

  if (result.action === 'drop') return

  if (result.action === 'pair') {
    const lead = result.isResend ? 'Still pending' : 'Pairing required'
    await msg.reply(
      `${lead} — run on the server:\n\n/discord:access pair ${result.code}`,
    )
    return
  }

  if ('sendTyping' in msg.channel) void msg.channel.sendTyping().catch(() => {})
  const ack = result.access.ackReaction ?? '👀'
  if (ack) void msg.react(ack).catch(() => {})

  const prompt = buildAgentPrompt(formatChannelBlock(msg))
  process.stderr.write(`bridge: agent run chat=${msg.channelId} user=${msg.author.username}\n`)

  const bridgeOutbound = process.env.CDC_BRIDGE_OUTBOUND !== 'mcp'

  try {
    const out = await runCursorAgent({ cwd: CWD, prompt, chatId: msg.channelId })
    if (out.timedOut) {
      consecutiveTimeouts++
      process.stderr.write(
        `bridge: agent run timed out (${consecutiveTimeouts}/${MAX_CONSECUTIVE_TIMEOUTS} consecutive)\n`,
      )
      await postReply(msg, 'Agent timed out. Restarting if this keeps happening.').catch(() => {})
      if (consecutiveTimeouts >= MAX_CONSECUTIVE_TIMEOUTS) {
        process.stderr.write(
          `bridge: ${consecutiveTimeouts} consecutive timeouts — exiting for systemd restart\n`,
        )
        client.destroy()
        process.exit(1)
      }
      return
    }
    consecutiveTimeouts = 0

    if (out.exitCode !== 0) {
      process.stderr.write(`bridge: agent exited ${out.exitCode}\n${out.stderr}\n`)
      await postReply(msg, `Agent error (exit ${out.exitCode}). Check bridge logs.`).catch(() => {})
      return
    }

    if (bridgeOutbound) {
      const text = extractBridgeReply(out.stdout)
      if (!text) {
        process.stderr.write('bridge: agent returned empty stdout; no Discord post\n')
        return
      }
      await postReply(msg, text.slice(0, 2000)).catch(err => {
        process.stderr.write(`bridge: reply failed: ${err instanceof Error ? err.message : String(err)}\n`)
      })
    }
  } catch (err) {
    const text = err instanceof Error ? err.message : String(err)
    process.stderr.write(`bridge: agent spawn failed: ${text}\n`)
    await msg.reply(`Failed to start agent: ${text}`).catch(() => {})
  }
}

async function drainQueue(): Promise<void> {
  if (busy) return
  busy = true
  try {
    while (queue.length > 0) {
      const msg = queue.shift()!
      await processMessage(msg)
    }
  } finally {
    busy = false
  }
}

function enqueue(msg: Message): void {
  queue.push(msg)
  void drainQueue()
}

client.on('messageCreate', msg => {
  if (msg.author.id === client.user?.id) return
  if (msg.author.bot) {
    const trusted = loadAccess().trustedBots ?? []
    if (!trusted.includes(msg.author.id)) return
  }
  enqueue(msg)
})

client.once('ready', c => {
  process.stderr.write(`bridge: connected as ${c.user.tag}, cwd=${CWD}\n`)
})

client.on('error', e => {
  process.stderr.write(`bridge: client error: ${e.message}\n`)
})

process.on('SIGINT', () => {
  client.destroy()
  process.exit(0)
})
process.on('SIGTERM', () => {
  client.destroy()
  process.exit(0)
})

await client.login(TOKEN)
