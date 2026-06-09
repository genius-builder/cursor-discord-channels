/** Discord mention tokens — plain @name does NOT ping. */
export const DISCORD_MENTION_IDS = {
  lily: '1413733041842421800',
  jackie: '1477895765698547844',
  lucy: '1484459231624302673',
  bill: '1484381532201156658',
  andrej: '1485446312798457866',
} as const

function mentionLines(jackieLabel = 'Jackie'): string[] {
  return [
    'Discord mentions (REQUIRED — copy exactly, including angle brackets):',
    `- Lily: <@${DISCORD_MENTION_IDS.lily}>`,
    `- ${jackieLabel}: <@${DISCORD_MENTION_IDS.jackie}>`,
    `- Lucy / genius-growth: <@${DISCORD_MENTION_IDS.lucy}>`,
    `- Bill / genius-builder: <@${DISCORD_MENTION_IDS.bill}>`,
    `- Andrej / genius-researcher: <@${DISCORD_MENTION_IDS.andrej}>`,
    'NEVER use @username, @lilyzhng, or @genius-builder — those do not notify.',
  ]
}

export function mentionPromptBlock(): string {
  return mentionLines('Jackie (you)').join('\n')
}

/** Agent-neutral copy for shared Discord MCP server instructions. */
export function mentionMcpInstructions(): string {
  return [
    ...mentionLines(),
    'When replying to the sender, use user_id from inbound meta: <@their_user_id>.',
  ].join('\n')
}
