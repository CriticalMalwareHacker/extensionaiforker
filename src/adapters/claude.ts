import { SiteAdapter } from "./types";
import { Message, Site } from "../shared/types";

const SELECTORS = {
  messageGroup: [
    '[data-testid="user-message"]',
    'div.font-user-message',
    'div[class*="font-user"]',
    'div.human-message',
    'div.font-claude-response',
    'div.font-claude-message',
    'div[class*="font-claude"]',
    '[data-testid="assistant-message"]',
    '[data-testid*="assistant"]',
    'div.assistant-message',
    'div.progressive-markdown',
    'div[data-is-streaming]',
  ].join(", "),
  userMessage:
    '[data-testid="user-message"], div.font-user-message, div[class*="font-user"], div.human-message, [data-testid*="user"]',
  assistantMessage:
    'div.font-claude-response, div.font-claude-message, div[class*="font-claude"], [data-testid="assistant-message"], [data-testid*="assistant"], div.assistant-message, div.progressive-markdown, div[data-is-streaming]',
  codeBlock: "pre, .code-block",
  attachments: '[data-testid*="attachment"], [aria-label*="attachment" i], .file-thumbnail, img',
  inputBox: 'div.ProseMirror[contenteditable="true"], div[contenteditable="true"], textarea',
  chatContainer: 'main, [role="main"], div[data-testid="chat-scroll-container"]',
  title: 'title, header h1, [data-testid="chat-title"]',
};

export class ClaudeAdapter implements SiteAdapter {
  site: Site = "claude";

  matches(url: URL): boolean {
    return url.hostname === "claude.ai" || url.hostname.endsWith(".claude.ai");
  }

  getConversationId(url: URL): string | null {
    const match = url.pathname.match(/\/chat\/([a-zA-Z0-9-]+)/);
    return match ? match[1] : null;
  }

  getMessageElements(): HTMLElement[] {
    const rawList = Array.from(document.querySelectorAll<HTMLElement>(SELECTORS.messageGroup));
    if (rawList.length === 0) return [];

    // Filter out nested duplicates (e.g. progressive-markdown inside font-claude-response)
    const topTurns: HTMLElement[] = [];
    for (const el of rawList) {
      const hasParentTurn = rawList.some((other) => other !== el && other.contains(el));
      if (!hasParentTurn) {
        topTurns.push(el);
      }
    }

    return topTurns.length > 0 ? topTurns : rawList;
  }

  readMessage(el: HTMLElement, index: number): Message {
    const isUser =
      el.matches(SELECTORS.userMessage) ||
      Boolean(el.closest(SELECTORS.userMessage)) ||
      Boolean(el.querySelector(SELECTORS.userMessage));

    const role: "user" | "assistant" = isUser ? "user" : "assistant";

    // Extract code blocks
    const codeBlocks: { lang?: string; code: string }[] = [];
    const codeEls = el.querySelectorAll<HTMLElement>(SELECTORS.codeBlock);
    codeEls.forEach((preEl) => {
      const codeChild = preEl.querySelector("code") || preEl;
      let lang = "";
      const classList = Array.from(codeChild.classList).concat(Array.from(preEl.classList));
      for (const cls of classList) {
        if (cls.startsWith("language-")) {
          lang = cls.replace("language-", "");
          break;
        }
      }
      codeBlocks.push({
        lang: lang || undefined,
        code: codeChild.textContent || "",
      });
    });

    const hasAttachments = el.querySelectorAll(SELECTORS.attachments).length > 0;

    // Clean text by cloning and stripping out any injected forkline buttons
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(".forkline-btn-wrapper, .forkline-inline-row, .forkline-action-btn").forEach((b) => b.remove());
    const text = clone.innerText || clone.textContent || "";

    return {
      index,
      role,
      text: text.trim(),
      codeBlocks: codeBlocks.length > 0 ? codeBlocks : undefined,
      hasAttachments,
    };
  }

  getInputElement(): HTMLElement | null {
    return document.querySelector<HTMLElement>(SELECTORS.inputBox);
  }

  insertText(input: HTMLElement, text: string): boolean {
    try {
      input.focus();

      // ProseMirror usually responds well to execCommand or Synthetic paste
      if (document.execCommand("insertText", false, text)) {
        return true;
      }

      const dt = new DataTransfer();
      dt.setData("text/plain", text);
      const pasteEvent = new ClipboardEvent("paste", {
        clipboardData: dt,
        bubbles: true,
        cancelable: true,
      });
      if (input.dispatchEvent(pasteEvent)) {
        return true;
      }

      if (input.isContentEditable) {
        input.innerText = text;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      }
    } catch (err) {
      console.warn("[Forkline] Error inserting text in Claude:", err);
    }
    return false;
  }

  newChatUrl(): string {
    return "https://claude.ai/new";
  }

  getChatTitle(): string | null {
    const el = document.querySelector(SELECTORS.title);
    if (!el) return null;
    const text = el.textContent?.trim();
    return text ? text.replace("Claude", "").trim() : null;
  }

  getChatContainer(): HTMLElement | null {
    return document.querySelector<HTMLElement>(SELECTORS.chatContainer);
  }
}
