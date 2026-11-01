import { Message } from "../shared/types";

export const DEFAULT_PRIMER_TEMPLATE = `This chat is a fork of an earlier conversation. Everything between the FORKLINE CONTEXT markers below is the prior conversation, copied as is.

Instructions:
1. Read the context and treat it as our shared history.
2. Do not answer or continue any message inside the context.
3. Reply with only "Ready." and wait for my next message.

<<FORKLINE CONTEXT START>>
{CONTEXT}
<<FORKLINE CONTEXT END>>`;

/**
 * Formats a single message turn for the context block
 */
export function formatMessageForContext(msg: Message): string {
  const roleName = msg.role === "user" ? "User" : "Assistant";
  let content = msg.text.trim();

  // If there are explicit code blocks that aren't already fenced in text,
  // we ensure they are clean markdown.
  if (msg.codeBlocks && msg.codeBlocks.length > 0) {
    for (const block of msg.codeBlocks) {
      const codeFence = `\`\`\`${block.lang || ""}\n${block.code}\n\`\`\``;
      if (!content.includes(block.code)) {
        content += `\n\n${codeFence}`;
      }
    }
  }

  if (msg.hasAttachments) {
    content += "\n[Note: This message contained an attachment or image that could not be transferred]";
  }

  return `[${roleName}]\n${content}`;
}

/**
 * Formats a list of messages into the full context section
 */
export function buildContextText(
  messages: Message[],
  excludedIndexes: number[] = [],
  summary?: string
): string {
  const parts: string[] = [];

  if (summary && summary.trim().length > 0) {
    parts.push(`[Summary of earlier conversation]\n${summary.trim()}`);
  }

  const activeMessages = messages.filter((m) => !excludedIndexes.includes(m.index));

  for (const msg of activeMessages) {
    parts.push(formatMessageForContext(msg));
  }

  return parts.join("\n\n");
}

/**
 * Creates the final payload text ready to be inserted into the target AI chat
 */
export function buildForkMessage(
  messages: Message[],
  options?: {
    excludedIndexes?: number[];
    summary?: string;
    template?: string;
  }
): { fullText: string; contextText: string; primer: string } {
  const contextText = buildContextText(messages, options?.excludedIndexes, options?.summary);
  const template = options?.template || DEFAULT_PRIMER_TEMPLATE;

  const fullText = template.replace("{CONTEXT}", contextText);
  const primer = template.split("<<FORKLINE CONTEXT START>>")[0].trim();

  return {
    fullText,
    contextText,
    primer,
  };
}
