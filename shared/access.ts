import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'fs'
import { ACCESS_FILE, APPROVED_DIR, STATE_DIR } from './paths.js'

export type PendingEntry = {
  senderId: string
  chatId: string
  createdAt: number
  expiresAt: number
  replies: number
}

export type GroupPolicy = {
  requireMention: boolean
  allowFrom: string[]
}

export type Access = {
  dmPolicy: 'pairing' | 'allowlist' | 'disabled'
  allowFrom: string[]
  groups: Record<string, GroupPolicy>
  pending: Record<string, PendingEntry>
  mentionPatterns?: string[]
  ackReaction?: string
  replyToMode?: 'off' | 'first' | 'all'
  textChunkLimit?: number
  chunkMode?: 'length' | 'newline'
  trustedBots?: string[]
}

function defaultAccess(): Access {
  return { dmPolicy: 'pairing', allowFrom: [], groups: {}, pending: {} }
}

const STATIC = process.env.DISCORD_ACCESS_MODE === 'static'

const BOOT_ACCESS: Access | null = STATIC
  ? (() => {
      const a = readAccessFile()
      if (a.dmPolicy === 'pairing') {
        process.stderr.write(
          'discord: static mode — dmPolicy "pairing" downgraded to "allowlist"\n',
        )
        a.dmPolicy = 'allowlist'
      }
      a.pending = {}
      return a
    })()
  : null

export function readAccessFile(): Access {
  try {
    const raw = readFileSync(ACCESS_FILE, 'utf8')
    const parsed = JSON.parse(raw) as Partial<Access>
    return {
      dmPolicy: parsed.dmPolicy ?? 'pairing',
      allowFrom: parsed.allowFrom ?? [],
      groups: parsed.groups ?? {},
      pending: parsed.pending ?? {},
      mentionPatterns: parsed.mentionPatterns,
      trustedBots: parsed.trustedBots,
      ackReaction: parsed.ackReaction,
      replyToMode: parsed.replyToMode,
      textChunkLimit: parsed.textChunkLimit,
      chunkMode: parsed.chunkMode,
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return defaultAccess()
    try {
      renameSync(ACCESS_FILE, `${ACCESS_FILE}.corrupt-${Date.now()}`)
    } catch {}
    process.stderr.write('discord: access.json corrupt, starting fresh.\n')
    return defaultAccess()
  }
}

export function loadAccess(): Access {
  return BOOT_ACCESS ?? readAccessFile()
}

export function saveAccess(a: Access): void {
  if (STATIC) return
  mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 })
  const tmp = ACCESS_FILE + '.tmp'
  writeFileSync(tmp, JSON.stringify(a, null, 2) + '\n', { mode: 0o600 })
  renameSync(tmp, ACCESS_FILE)
}

export function pruneExpired(a: Access): boolean {
  const now = Date.now()
  let changed = false
  for (const [code, p] of Object.entries(a.pending)) {
    if (p.expiresAt < now) {
      delete a.pending[code]
      changed = true
    }
  }
  return changed
}

export function reconcileTrustedBots(): void {
  const a = loadAccess()
  const trusted = a.trustedBots ?? []
  if (trusted.length === 0) return
  const star = a.groups['*']
  if (!star) return
  const merged = [...new Set([...(star.allowFrom ?? []), ...trusted, ...a.allowFrom])]
  if (merged.length === (star.allowFrom?.length ?? 0)) return
  star.allowFrom = merged
  a.allowFrom = [...new Set([...a.allowFrom, ...trusted])]
  saveAccess(a)
}

export function startApprovalPoller(
  sendDm: (channelId: string, text: string) => Promise<void>,
): void {
  if (STATIC) return
  setInterval(() => {
    let files: string[]
    try {
      files = readdirSync(APPROVED_DIR)
    } catch {
      return
    }
    for (const senderId of files) {
      const file = `${APPROVED_DIR}/${senderId}`
      let dmChannelId: string
      try {
        dmChannelId = readFileSync(file, 'utf8').trim()
      } catch {
        rmSync(file, { force: true })
        continue
      }
      if (!dmChannelId) {
        rmSync(file, { force: true })
        continue
      }
      void sendDm(dmChannelId, 'Paired! Say hi to your Cursor agent.').finally(() =>
        rmSync(file, { force: true }),
      )
    }
  }, 5000)
}
