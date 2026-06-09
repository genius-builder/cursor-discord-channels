import { spawn, spawnSync, type SpawnOptions } from 'child_process'

import { existsSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

/** Cursor CLI binary: `agent` on Linux droplet, `cursor agent` on some Mac installs. */
export function agentBin(): string {
  if (process.env.CDC_AGENT_BIN) return process.env.CDC_AGENT_BIN
  const local = join(homedir(), '.local', 'bin', 'agent')
  if (existsSync(local)) return local
  return 'agent'
}

export function agentArgs(subcommand: string, rest: string[]): string[] {
  const bin = agentBin()
  if (bin === 'cursor') {
    return subcommand ? ['agent', subcommand, ...rest] : ['agent', ...rest]
  }
  return subcommand ? [subcommand, ...rest] : rest
}

export function spawnAgent(
  subcommand: string,
  args: string[],
  opts: SpawnOptions,
): ReturnType<typeof spawn> {
  return spawn(agentBin(), agentArgs(subcommand, args), opts)
}

export function spawnAgentSync(subcommand: string, args: string[]): ReturnType<typeof spawnSync> {
  return spawnSync(agentBin(), agentArgs(subcommand, args), {
    encoding: 'utf8',
    env: process.env,
  })
}
