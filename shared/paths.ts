import { existsSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

/** Prefer ~/.cursor; fall back to ~/.claude for GeniusTeam migration. */
export function stateDir(): string {
  const cursor = join(homedir(), '.cursor', 'channels', 'discord')
  const claude = join(homedir(), '.claude', 'channels', 'discord')
  if (existsSync(join(cursor, '.env')) || existsSync(join(cursor, 'access.json'))) {
    return cursor
  }
  if (existsSync(claude)) return claude
  return cursor
}

export const STATE_DIR = stateDir()
export const ACCESS_FILE = join(STATE_DIR, 'access.json')
export const APPROVED_DIR = join(STATE_DIR, 'approved')
export const ENV_FILE = join(STATE_DIR, '.env')
export const INBOX_DIR = join(STATE_DIR, 'inbox')
export const SESSIONS_FILE = join(STATE_DIR, 'sessions.json')
