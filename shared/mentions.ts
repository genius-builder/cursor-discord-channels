import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { STATE_DIR } from './paths.js'

export type MentionEntry = { label: string; userId: string }

const DEFAULT_ROSTER_PATH = join(STATE_DIR, 'mentions.json')

function loadRoster(): MentionEntry[] {
  const path = process.env.CDC_MENTIONS_FILE ?? DEFAULT_ROSTER_PATH
  if (!existsSync(path)) return []
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as { entries?: MentionEntry[] }
    return (raw.entries ?? []).filter(e => e.label && e.userId)
  } catch {
    return []
  }
}

function mentionLines(entries: MentionEntry[]): string[] {
  const lines = [
    'Discord mentions (REQUIRED — copy exactly, including angle brackets):',
    'Plain @username does NOT notify. Always use <@user_id> snowflakes.',
  ]
  if (entries.length === 0) {
    lines.push(
      'Optional: add a roster at ~/.cursor/channels/discord/mentions.json:',
      '  { "entries": [{ "label": "Teammate", "userId": "123456789012345678" }] }',
    )
    return lines
  }
  for (const e of entries) {
    lines.push(`- ${e.label}: <@${e.userId}>`)
  }
  return lines
}

export function mentionPromptBlock(): string {
  return mentionLines(loadRoster()).join('\n')
}

/** Agent-neutral copy for shared Discord MCP server instructions. */
export function mentionMcpInstructions(): string {
  return [
    ...mentionLines(loadRoster()),
    'When replying to the sender, use user_id from inbound meta: <@their_user_id>.',
  ].join('\n')
}
