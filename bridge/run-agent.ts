import { spawn } from 'child_process'
import { getSessionId, setSessionId } from './sessions.js'

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

  const args = [
    'agent',
    '-p',
    '--yolo',
    '--approve-mcps',
    '--output-format',
    'text',
    '--model',
    model,
  ]
  if (existing) args.push('--resume', existing)
  args.push(opts.prompt)

  return new Promise((resolve, reject) => {
    const child = spawn('cursor', args, {
      cwd: opts.cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', (b: Buffer) => {
      stdout += b.toString()
    })
    child.stderr?.on('data', (b: Buffer) => {
      stderr += b.toString()
    })

    const timer = setTimeout(() => {
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
      resolve({ exitCode: code, stdout, stderr, sessionId })
    })
  })
}
