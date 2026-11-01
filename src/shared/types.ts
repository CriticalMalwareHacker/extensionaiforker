export type Site = "chatgpt" | "claude" | "gemini";

export interface CodeBlock {
  lang?: string;
  code: string;
}

export interface Message {
  index: number;
  role: "user" | "assistant";
  text: string;               // plain text or markdown
  codeBlocks?: CodeBlock[];
  hasAttachments?: boolean;   // true if we saw files or images we cannot copy
}

export interface ChatRef {
  site: Site;
  conversationId: string;     // from the URL
  url: string;
  title?: string;
}

export interface BranchNode {
  id: string;                 // uuid
  parentId: string | null;
  chat: ChatRef | null;       // null until the new chat gets its URL
  forkedAtIndex: number | null;
  label: string;              // auto or user supplied
  tags: string[];
  tokenEstimate: number;
  compaction: "none" | "summary";
  excludedIndexes: number[];  // messages the user unchecked
  createdAt: number;
  summary?: string;           // summary if compacted or merged
  isMerged?: boolean;
  mergedAt?: number;
}

export interface ForkPayload {
  nodeId: string;
  targetSite: Site;
  primer: string;
  contextText: string;        // final text to insert
  autoSend?: boolean;
}

export interface ForkOptions {
  sourceSite: Site;
  targetSites: Site[];
  messages: Message[];
  forkedAtIndex: number;
  excludedIndexes?: number[];
  compaction?: "none" | "summary";
  parentNodeId?: string | null;
  sourceChat?: ChatRef | null;
  label?: string;
  primerTemplate?: string;
}

export interface ForklineSettings {
  defaultTargetSite?: Site | "same";
  primerTemplate: string;
  compactKeepRecent: number;
  useGeminiNano: boolean;
  cloudProxyUrl?: string;
  cloudProxyToken?: string;
}

// Background <-> Content / SidePanel communication protocol
export type ExtensionMessage =
  | { type: "FORK_REQUEST"; payload: ForkOptions }
  | { type: "GET_PENDING_PAYLOAD"; tabId?: number }
  | { type: "PENDING_PAYLOAD_RESPONSE"; payload: ForkPayload | null }
  | { type: "REPORT_CHAT_URL"; nodeId: string; chat: ChatRef }
  | { type: "GET_ALL_NODES" }
  | { type: "GET_ALL_NODES_RESPONSE"; nodes: BranchNode[] }
  | { type: "SAVE_NODE"; node: BranchNode }
  | { type: "DELETE_NODE"; nodeId: string }
  | { type: "GET_ACTIVE_SITE_STATUS" }
  | { type: "TRIGGER_SELECTIVE_FORK"; messageIndex: number }
  | { type: "SHOW_TOAST"; message: string; durationMs?: number }
  | { type: "SUMMARIZE_REQUEST"; text: string; mode?: "compact" | "merge" }
  | { type: "SUMMARIZE_RESPONSE"; summary: string; error?: string }
  | { type: "AUTO_NAME_REQUEST"; contextText: string }
  | { type: "AUTO_NAME_RESPONSE"; title: string; error?: string };

