import { Message } from "../shared/types";
import { estimateTokens } from "./tokens";

export interface CompactionPlan {
  olderMessages: Message[];
  recentMessages: Message[];
  preservedCodeBlocks: { lang?: string; code: string; messageIndex: number }[];
  textToSummarize: string;
  originalTokens: number;
}

/**
 * Prepares messages for compaction by splitting into older and recent messages,
 * and extracting all code blocks from older messages so they remain intact.
 */
export function prepareCompaction(
  messages: Message[],
  keepRecentCount: number = 6
): CompactionPlan {
  const originalFullText = messages.map((m) => m.text).join("\n\n");
  const originalTokens = estimateTokens(originalFullText);

  if (messages.length <= keepRecentCount) {
    return {
      olderMessages: [],
      recentMessages: [...messages],
      preservedCodeBlocks: [],
      textToSummarize: "",
      originalTokens,
    };
  }

  const splitIndex = messages.length - keepRecentCount;
  const olderMessages = messages.slice(0, splitIndex);
  const recentMessages = messages.slice(splitIndex);

  // Preserve all code blocks from older messages
  const preservedCodeBlocks: { lang?: string; code: string; messageIndex: number }[] = [];
  const olderTextParts: string[] = [];

  for (const msg of olderMessages) {
    olderTextParts.push(`[${msg.role === "user" ? "User" : "Assistant"}]: ${msg.text}`);
    if (msg.codeBlocks) {
      for (const block of msg.codeBlocks) {
        preservedCodeBlocks.push({
          ...block,
          messageIndex: msg.index,
        });
      }
    }
  }

  return {
    olderMessages,
    recentMessages,
    preservedCodeBlocks,
    textToSummarize: olderTextParts.join("\n\n"),
    originalTokens,
  };
}

/**
 * Fallback heuristic summarizer when Gemini Nano or Cloud proxy is unavailable
 */
export function fallbackSummarize(plan: CompactionPlan): string {
  const { olderMessages, preservedCodeBlocks } = plan;
  if (olderMessages.length === 0) return "";

  const lines: string[] = [];
  lines.push(`(Digest of ${olderMessages.length} earlier turns):`);

  // Extract key sentences or user intentions
  for (const msg of olderMessages) {
    if (msg.role === "user") {
      const firstLine = msg.text.trim().split("\n")[0].slice(0, 150);
      lines.push(`- User discussed: "${firstLine}${msg.text.length > 150 ? "..." : ""}"`);
    }
  }

  // Mention preserved code snippets
  if (preservedCodeBlocks.length > 0) {
    lines.push(`\nKey code snippets preserved from earlier:`);
    for (const b of preservedCodeBlocks.slice(0, 5)) {
      lines.push(`\`\`\`${b.lang || ""}\n${b.code}\n\`\`\``);
    }
    if (preservedCodeBlocks.length > 5) {
      lines.push(`(...and ${preservedCodeBlocks.length - 5} additional snippets)`);
    }
  }

  return lines.join("\n");
}

