import { readFileSync } from 'fs'
import { ENV_FILE } from './paths.js'

/** Load ~/.cursor/channels/discord/.env — real process.env wins. */
export function loadStateEnv(): void {
  try {
    for (const line of readFileSync(ENV_FILE, 'utf8').split('\n')) {
      const m = line.match(/^(\w+)=(.*)$/)
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2]
    }
  } catch {
    // no .env yet
  }
}
