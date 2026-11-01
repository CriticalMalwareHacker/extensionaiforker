export type Site = "chatgpt" | "claude" | "gemini";

export interface CodeBlock {
  lang?: string;
  code: string;
}

export interface Message {
  index: number;
  role: "user" | "assistant";
  text: string;
  codeBlocks?: CodeBlock[];
  hasAttachments?: boolean;
}

export interface ChatRef {
  site: Site;
  conversationId: string;
  url: string;
  title?: string;
}

export interface BranchGroup {
  id: string;
  name: string;
  createdAt: number;
}

export interface BranchNode {
  id: string;
  parentId: string | null;
  groupId?: string | null;
  chat: ChatRef | null;
  forkedAtIndex: number | null;
  label: string;
  tags: string[];
  tokenEstimate: number;
  compaction: "none" | "summary";
  excludedIndexes: number[];
  createdAt: number;
  summary?: string;
  isMerged?: boolean;
  mergedAt?: number;
}

export interface ForkPayload {
  nodeId: string;
  targetSite: Site;
  primer: string;
  contextText: string;
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
  groupId?: string | null;
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

export type ExtensionMessage =
  | { type: "FORK_REQUEST"; payload: ForkOptions }
  | { type: "GET_PENDING_PAYLOAD"; tabId?: number }
  | { type: "PENDING_PAYLOAD_RESPONSE"; payload: ForkPayload | null }
  | { type: "REPORT_CHAT_URL"; nodeId: string; chat: ChatRef }
  | { type: "GET_ALL_NODES" }
  | { type: "GET_ALL_NODES_RESPONSE"; nodes: BranchNode[] }
  | { type: "SAVE_NODE"; node: BranchNode }
  | { type: "DELETE_NODE"; nodeId: string }
  | { type: "GET_ALL_GROUPS" }
  | { type: "GET_ALL_GROUPS_RESPONSE"; groups: BranchGroup[] }
  | { type: "CREATE_GROUP"; name: string }
  | { type: "DELETE_GROUP"; groupId: string }
  | { type: "ASSIGN_GROUP"; nodeId: string; groupId: string | null }
  | { type: "GET_ACTIVE_SITE_STATUS" }
  | { type: "TRIGGER_SELECTIVE_FORK"; messageIndex: number }
  | { type: "SHOW_TOAST"; message: string; durationMs?: number }
  | { type: "SUMMARIZE_REQUEST"; text: string; mode?: "compact" | "merge" }
  | { type: "SUMMARIZE_RESPONSE"; summary: string; error?: string }
  | { type: "AUTO_NAME_REQUEST"; contextText: string }
  | { type: "AUTO_NAME_RESPONSE"; title: string; error?: string };
