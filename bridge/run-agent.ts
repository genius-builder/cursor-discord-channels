import { getSessionId, setSessionId } from './sessions.js'
import { spawnAgent } from './cursor-bin.js'

export type RunAgentOptions = {
  cwd: string
  prompt: string
  chatId: string
  model?: string
  timeoutMs?: number
}

export type RunAgentResult = {
  exitCode: number | null
  stdout: string
  stderr: string
  sessionId?: string
  /** True when the bridge had to SIGTERM the agent for exceeding timeoutMs. */
  timedOut: boolean
}

const SESSION_RE = /(?:chat|session)[\s_-]*id[:\s]+([a-zA-Z0-9-]+)/i

/**
 * Spawn `cursor agent -p` for one inbound Discord message.
 * Uses --resume when a per-channel session id is stored.
 */
export function runCursorAgent(opts: RunAgentOptions): Promise<RunAgentResult> {
  const model = opts.model ?? process.env.CURSOR_MODEL ?? 'composer-2.5'
  const timeoutMs = opts.timeoutMs ?? Number(process.env.CURSOR_AGENT_TIMEOUT_MS ?? 600_000)
  const existing = getSessionId(opts.chatId)

  const bridgeOutbound = process.env.CDC_BRIDGE_OUTBOUND !== 'mcp'
  const args = [
    '-p',
    '--yolo',
    ...(bridgeOutbound ? [] : ['--approve-mcps']),
    '--trust',
    '--output-format',
    'text',
    '--model',
    model,
  ]
  if (existing) args.push('--resume', existing)
  args.push('--workspace', opts.cwd)
  args.push(opts.prompt)

  return new Promise((resolve, reject) => {
    const child = spawnAgent('', args, {
      cwd: opts.cwd,
      env: {
        ...process.env,
        CURSOR_CWD: opts.cwd,
        CDC_STATE_DIR: process.env.CDC_STATE_DIR,
        // Ensure MCP subprocess replies as this bridge's bot, not a fallback token.
        DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    let timedOut = false
    child.stdout?.on('data', (b: Buffer) => {
      stdout += b.toString()
    })
    child.stderr?.on('data', (b: Buffer) => {
      stderr += b.toString()
    })

    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')
    }, timeoutMs)

    child.on('error', err => {
      clearTimeout(timer)
      reject(err)
    })

    child.on('close', code => {
      clearTimeout(timer)
      const combined = stdout + '\n' + stderr
      const m = SESSION_RE.exec(combined)
      const sessionId = m?.[1]
      if (sessionId) setSessionId(opts.chatId, sessionId)
      resolve({ exitCode: code, stdout, stderr, sessionId, timedOut })
    })
  })
}
