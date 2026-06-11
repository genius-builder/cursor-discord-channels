import { randomBytes } from 'crypto'
import { ChannelType, type Client, type Message } from 'discord.js'
import { type Access, loadAccess, pruneExpired, saveAccess } from './access.js'

export type GateResult =
  | { action: 'deliver'; access: Access }
  | { action: 'drop' }
  | { action: 'pair'; code: string; isResend: boolean }

const recentSentIds = new Set<string>()
const RECENT_SENT_CAP = 200

export function noteSent(id: string): void {
  recentSentIds.add(id)
  if (recentSentIds.size > RECENT_SENT_CAP) {
    const first = recentSentIds.values().next().value
    if (first) recentSentIds.delete(first)
  }
}

/** True when the message @mentions someone other than this bot (multi-bot channels). */
export function mentionsAnotherActor(botUserId: string | undefined, msg: Message): boolean {
  if (msg.mentions.users.size === 0) return false
  if (!botUserId) return true
  for (const [, user] of msg.mentions.users) {
    if (user.id !== botUserId) return true
  }
  return false
}

async function replyThreadCountsAsMention(
  botUserId: string | undefined,
  msg: Message,
  recentSentIds: Set<string>,
): Promise<boolean> {
  // @another-bot (or @user) in the same message → only that target should wake.
  if (mentionsAnotherActor(botUserId, msg)) return false

  const refId = msg.reference?.messageId
  if (!refId) return false
  if (recentSentIds.has(refId)) return true
  try {
    const ref = await msg.fetchReference()
    return ref.author.id === botUserId
  } catch {
    return false
  }
}

async function isMentioned(
  client: Client,
  msg: Message,
  extraPatterns?: string[],
  recentSentIds: Set<string> = new Set(),
): Promise<boolean> {
  const botId = client.user?.id
  if (botId && msg.mentions.has(botId)) return true

  // @everyone / @here are not user mentions — Discord.js sets everyone separately.
  if (msg.mentions.everyone) return true
  if (/\B@here\b/i.test(msg.content)) return true

  if (await replyThreadCountsAsMention(botId, msg, recentSentIds)) return true

  for (const pat of extraPatterns ?? []) {
    try {
      if (new RegExp(pat, 'i').test(msg.content)) return true
    } catch {}
  }
  return false
}

export async function gate(client: Client, msg: Message): Promise<GateResult> {
  const access = loadAccess()
  const pruned = pruneExpired(access)
  if (pruned) saveAccess(access)

  if (access.dmPolicy === 'disabled') return { action: 'drop' }

  const senderId = msg.author.id
  const isDM = msg.channel.type === ChannelType.DM

  if (isDM) {
    if (access.allowFrom.includes(senderId)) return { action: 'deliver', access }
    if (access.dmPolicy === 'allowlist') return { action: 'drop' }

    for (const [code, p] of Object.entries(access.pending)) {
      if (p.senderId === senderId) {
        if ((p.replies ?? 1) >= 2) return { action: 'drop' }
        p.replies = (p.replies ?? 1) + 1
        saveAccess(access)
        return { action: 'pair', code, isResend: true }
      }
    }
    if (Object.keys(access.pending).length >= 3) return { action: 'drop' }

    const code = randomBytes(3).toString('hex')
    const now = Date.now()
    access.pending[code] = {
      senderId,
      chatId: msg.channelId,
      createdAt: now,
      expiresAt: now + 60 * 60 * 1000,
      replies: 1,
    }
    saveAccess(access)
    return { action: 'pair', code, isResend: false }
  }

  const channelId = msg.channel.isThread() ? (msg.channel.parentId ?? msg.channelId) : msg.channelId
  const policy = access.groups[channelId] ?? access.groups['*']
  if (!policy) return { action: 'drop' }
  if ((policy.allowFrom?.length ?? 0) > 0 && !policy.allowFrom.includes(senderId)) {
    return { action: 'drop' }
  }
  if ((policy.requireMention ?? true) && !(await isMentioned(client, msg, access.mentionPatterns, recentSentIds))) {
    return { action: 'drop' }
  }
  return { action: 'deliver', access }
}
