import { Message } from "../shared/types";
import { SiteAdapter } from "./types";

/** Treat a Google results page as one forkable research context. */
export class GoogleSearchAdapter implements SiteAdapter {
  site = "google" as const;

  matches(url: URL): boolean {
    return /^www\.google\.[a-z.]+$/i.test(url.hostname) && url.pathname === "/search";
  }

  getConversationId(url: URL): string | null {
    const query = url.searchParams.get("q")?.trim();
    return query ? `search:${query.toLowerCase()}` : null;
  }

  getMessageElements(): HTMLElement[] {
    const results = document.querySelector<HTMLElement>("#search");
    return results ? [results] : [];
  }

  readMessage(el: HTMLElement, index: number): Message {
    const query = new URL(window.location.href).searchParams.get("q")?.trim() || "Google search";
    const copySection = (section: HTMLElement) => {
      const clone = section.cloneNode(true) as HTMLElement;
      clone.querySelectorAll(".forkline-inline-row, .forkline-btn-wrapper").forEach((node) => node.remove());
      return (clone.innerText || clone.textContent || "").trim();
    };

    // Use the entire rendered result set rather than a hand-picked digest.
    // `#rhs` contains Google's knowledge panel when it is present.
    const resultText = copySection(el);
    const knowledgePanel = document.querySelector<HTMLElement>("#rhs");
    const knowledgeText = knowledgePanel ? copySection(knowledgePanel) : "";

    return {
      index,
      role: "user",
      text: [
        `Google search query: ${query}`,
        "Full rendered search results:",
        resultText || "No results were available.",
        knowledgeText ? `Knowledge panel:\n${knowledgeText}` : "",
      ].filter(Boolean).join("\n\n"),
    };
  }

  getInputElement(): HTMLElement | null { return null; }
  insertText(): boolean { return false; }
  newChatUrl(): string { return "https://chatgpt.com/"; }
  getChatTitle(): string | null { return new URL(window.location.href).searchParams.get("q"); }
}
