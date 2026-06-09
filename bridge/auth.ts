import { spawnSync } from 'child_process'

/** Subscription login via `cursor agent login` — not API key billing. */
export function ensureCursorSubscriptionAuth(): void {
  const r = spawnSync('cursor', ['agent', 'status'], { encoding: 'utf8' })
  const out = (r.stdout ?? '') + (r.stderr ?? '')
  if (r.status === 0 && /logged in/i.test(out)) return

  process.stderr.write(
    [
      'bridge: Cursor subscription login required (not CURSOR_API_KEY).',
      'Run: cursor agent login',
      'On a droplet: SSH in and login once, or use scripts/reauth.sh from your laptop.',
      'This uses your Pro/Max subscription quota — same economics as claude --channels.',
      '',
    ].join('\n'),
  )
  process.exit(1)
}
