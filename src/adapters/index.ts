import { SiteAdapter } from "./types";
import { ChatGPTAdapter } from "./chatgpt";
import { ClaudeAdapter } from "./claude";
import { GeminiAdapter } from "./gemini";

export const ADAPTERS: SiteAdapter[] = [
  new ChatGPTAdapter(),
  new ClaudeAdapter(),
  new GeminiAdapter(),
];

export function getAdapterForUrl(urlInput: URL | string): SiteAdapter | null {
  try {
    const url = typeof urlInput === "string" ? new URL(urlInput) : urlInput;
    for (const adapter of ADAPTERS) {
      if (adapter.matches(url)) {
        return adapter;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export * from "./types";
export * from "./chatgpt";
export * from "./claude";
export * from "./gemini";

