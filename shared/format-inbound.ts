import type { Message } from 'discord.js'

function safeAttName(name: string, id: string): string {
  return (name ?? id).replace(/[\[\]\r\n;]/g, '_')
}

export function formatChannelBlock(msg: Message): string {
  const atts: string[] = []
  for (const att of msg.attachments.values()) {
    const kb = (att.size / 1024).toFixed(0)
    atts.push(`${safeAttName(att.name ?? '', att.id)} (${att.contentType ?? 'unknown'}, ${kb}KB)`)
  }

  const resolved = msg.content.replace(/<@!?(\d+)>/g, (match, id) => {
    const user = msg.mentions.users.get(id) ?? msg.client.users.cache.get(id)
    return user ? `@${user.username}` : match
  })

  const content = resolved || (atts.length > 0 ? '(attachment)' : '')
  const attAttrs =
    atts.length > 0
      ? ` attachment_count="${atts.length}" attachments="${atts.join('; ')}"`
      : ''

  return [
    `<channel source="discord" chat_id="${msg.channelId}" message_id="${msg.id}" user="${msg.author.username}" ts="${msg.createdAt.toISOString()}"${attAttrs}>`,
    content,
    '</channel>',
  ].join('\n')
}

export function buildAgentPrompt(channelBlock: string): string {
  return [
    'You received a Discord message. The sender reads Discord, not this terminal.',
    'You MUST reply using the discord `reply` tool with the chat_id from the channel block.',
    'Do not rely on stdout — only the reply tool reaches Discord.',
    '',
    channelBlock,
  ].join('\n')
}
