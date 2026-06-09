import type { Message } from 'discord.js'
import { mentionPromptBlock } from './mentions.js'

function safeAttName(name: string, id: string): string {
  return (name ?? id).replace(/[\[\]\r\n;]/g, '_')
}

export function formatChannelBlock(msg: Message): string {
  const atts: string[] = []
  for (const att of msg.attachments.values()) {
    const kb = (att.size / 1024).toFixed(0)
    atts.push(`${safeAttName(att.name ?? '', att.id)} (${att.contentType ?? 'unknown'}, ${kb}KB)`)
  }

  // Keep <@snowflake> — converting to @username trains agents to ping wrong.
  const content = msg.content.trim() || (atts.length > 0 ? '(attachment)' : '')
  const attAttrs =
    atts.length > 0
      ? ` attachment_count="${atts.length}" attachments="${atts.join('; ')}"`
      : ''

  return [
    `<channel source="discord" chat_id="${msg.channelId}" message_id="${msg.id}" user="${msg.author.username}" user_id="${msg.author.id}" ts="${msg.createdAt.toISOString()}"${attAttrs}>`,
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
    'Latency contract: send your FIRST discord reply immediately — short, conversational.',
    'Do not run shell, grep, or file reads before that first reply.',
    'If research is needed, reply first with a quick take, then follow up after reading.',
    '',
    mentionPromptBlock(),
    '',
    'To notify the sender, tag them with <@user_id> from the channel block or list above.',
    '',
    channelBlock,
  ].join('\n')
}
