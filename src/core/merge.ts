import { Message } from "../shared/types";

export interface MergePayload {
  parentNodeId: string;
  sourceNodeId: string;
  parentChatUrl?: string;
  summary: string;
  formattedInsertText: string;
}

export function buildMergeInsertText(summary: string, branchLabel: string): string {
  return `[Update from side branch: "${branchLabel}"]

${summary.trim()}

Please integrate these insights and decisions as we continue our conversation.`;
}

/**
 * Filters messages that were generated after the fork point
 */
export function getBranchExclusiveMessages(
  messages: Message[],
  forkedAtIndex: number | null
): Message[] {
  if (forkedAtIndex === null) return messages;
  return messages.filter((m) => m.index > forkedAtIndex);
}

/**
 * Fallback heuristic summary for merge if AI is offline
 */
export function fallbackMergeSummary(messages: Message[]): string {
  if (messages.length === 0) {
    return "Branch exploration completed without additional new turns.";
  }

  const lines: string[] = [];
  lines.push(`Summary of conclusions and solutions developed in this branch:`);

  const assistantTurns = messages.filter((m) => m.role === "assistant");
  if (assistantTurns.length > 0) {
    const lastTurn = assistantTurns[assistantTurns.length - 1];
    lines.push(`- Key outcome: ${lastTurn.text.slice(0, 300).trim()}...`);
  }

  // Count code solutions
  let totalCodeBlocks = 0;
  for (const m of messages) {
    if (m.codeBlocks) totalCodeBlocks += m.codeBlocks.length;
  }
  if (totalCodeBlocks > 0) {
    lines.push(`- Includes ${totalCodeBlocks} code implementation snippet(s) verified in branch.`);
  }

  return lines.join("\n");
}
