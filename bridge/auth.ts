import { spawnAgentSync } from './cursor-bin.js'

/** Subscription login via `agent login` — not API key billing. */
export function ensureCursorSubscriptionAuth(): void {
  const r = spawnAgentSync('status', [])
  const out = String(r.stdout ?? '') + String(r.stderr ?? '')
  if (r.status === 0 && /logged in/i.test(out)) return

  process.stderr.write(
    [
      'bridge: Cursor subscription login required (not CURSOR_API_KEY).',
      'Run: agent login',
      'On a droplet: SSH in and login once, or use scripts/reauth.sh from your laptop.',
      'This uses your Pro/Max subscription quota — same as running the agent in your IDE.',
      '',
    ].join('\n'),
  )
  process.exit(1)
}
