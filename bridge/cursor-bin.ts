import { spawn, spawnSync, type SpawnOptions } from 'child_process'

/** Cursor CLI binary: `agent` on Linux droplet, `cursor agent` on some Mac installs. */
export function agentBin(): string {
  return process.env.CDC_AGENT_BIN ?? 'agent'
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
  return spawnSync(agentBin(), agentArgs(subcommand, args), { encoding: 'utf8' })
}
