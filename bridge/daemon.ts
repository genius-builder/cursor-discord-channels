#!/usr/bin/env tsx
/**
 * Cursor Discord bridge — inbound gateway.
 * Discord message → access gate → cursor agent -p → agent replies via MCP.
 */

import {
  ChannelType,
  Client,
  GatewayIntentBits,
  Partials,
  type Message,
} from 'discord.js'
import {
  loadAccess,
  reconcileTrustedBots,
  startApprovalPoller,
} from '../shared/access.js'
import { loadStateEnv } from '../shared/env.js'
import { buildAgentPrompt, formatChannelBlock } from '../shared/format-inbound.js'
import { gate } from '../shared/gate.js'
import { ENV_FILE } from '../shared/paths.js'
import { runCursorAgent } from './run-agent.js'

loadStateEnv()
reconcileTrustedBots()

const TOKEN = process.env.DISCORD_BOT_TOKEN
if (!TOKEN) {
  process.stderr.write(`bridge: DISCORD_BOT_TOKEN required (set in ${ENV_FILE})\n`)
  process.exit(1)
}

if (!process.env.CURSOR_API_KEY) {
  process.stderr.write('bridge: CURSOR_API_KEY required for headless cursor agent\n')
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

async function fetchTextChannel(id: string) {
  const ch = await client.channels.fetch(id)
  if (!ch?.isTextBased()) throw new Error(`channel ${id} not text-based`)
  return ch
}

startApprovalPoller(async (channelId, text) => {
  const ch = await fetchTextChannel(channelId)
  if ('send' in ch) await ch.send(text)
})

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

  try {
    const out = await runCursorAgent({ cwd: CWD, prompt, chatId: msg.channelId })
    if (out.exitCode !== 0) {
      process.stderr.write(`bridge: agent exited ${out.exitCode}\n${out.stderr}\n`)
      await msg.reply(`Agent error (exit ${out.exitCode}). Check bridge logs.`).catch(() => {})
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
