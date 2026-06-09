import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { SESSIONS_FILE, STATE_DIR } from '../shared/paths.js'

type Sessions = Record<string, string>

function readSessions(): Sessions {
  try {
    return JSON.parse(readFileSync(SESSIONS_FILE, 'utf8')) as Sessions
  } catch {
    return {}
  }
}

function writeSessions(s: Sessions): void {
  mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 })
  const tmp = `${SESSIONS_FILE}.tmp`
  writeFileSync(tmp, JSON.stringify(s, null, 2) + '\n', { mode: 0o600 })
  renameSync(tmp, SESSIONS_FILE)
}

/** Per-channel Cursor agent session id for --resume. */
export function getSessionId(chatId: string): string | undefined {
  return readSessions()[chatId]
}

export function setSessionId(chatId: string, sessionId: string): void {
  const s = readSessions()
  s[chatId] = sessionId
  writeSessions(s)
}
