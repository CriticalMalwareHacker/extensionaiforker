import { SiteAdapter } from "./types";
import { Message, Site } from "../shared/types";

const SELECTORS = {
  messageTurn:
    "user-query, model-response, response-container, [data-test-id=\"message-container\"], div[class*=\"response-container\"], div[class*=\"model-response\"], message-content",
  userTurn: "user-query, div[class*=\"user-query\"]",
  modelTurn:
    "model-response, response-container, div[class*=\"model-response\"], div[class*=\"response-container\"], message-content",
  codeBlock: "pre, code-block, .code-container",
  attachments: "img[src*=\"blob\"], img[src*=\"data:image\"], file-chip, .attachment-item",
  inputBox:
    "div.ql-editor[contenteditable=\"true\"], rich-textarea div[contenteditable=\"true\"], div[contenteditable=\"true\"][role=\"textbox\"], textarea",
  chatContainer: "chat-window, .chat-history, main",
  title: "title, .conversation-title",
};

export class GeminiAdapter implements SiteAdapter {
  site: Site = "gemini";

  matches(url: URL): boolean {
    return url.hostname === "gemini.google.com" || url.hostname.endsWith(".google.com/gemini");
  }

  getConversationId(url: URL): string | null {
    const match = url.pathname.match(/\/app\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }

  getMessageElements(): HTMLElement[] {
    // 1. Direct query of top-level turns (user query and model response)
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(
        "user-query, model-response, response-container, [data-test-id=\"message-container\"], div[class*=\"response-container\"], div[class*=\"model-response\"]"
      )
    );

    if (elements.length > 0) {
      // Filter out nested duplicates (e.g. if response-container is inside model-response)
      const topTurns: HTMLElement[] = [];
      for (const el of elements) {
        const hasParentTurn = elements.some((other) => other !== el && other.contains(el));
        if (!hasParentTurn) {
          topTurns.push(el);
        }
      }
      return topTurns.length > 0 ? topTurns : elements;
    }

    return Array.from(document.querySelectorAll<HTMLElement>(SELECTORS.messageTurn));
  }

  readMessage(el: HTMLElement, index: number): Message {
    const tagName = el.tagName.toLowerCase();
    const isUser =
      tagName === "user-query" ||
      Boolean(el.closest(SELECTORS.userTurn)) ||
      Boolean(el.querySelector(SELECTORS.userTurn)) ||
      Boolean(el.classList?.contains("user-query"));

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

    // Clean text by cloning and stripping out action bars & injected buttons
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(".forkline-btn-wrapper, .forkline-action-btn, message-actions").forEach((b) => b.remove());
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

      // Quill editor (Gemini uses Quill or custom contenteditable)
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
      console.warn("[Forkline] Error inserting text in Gemini:", err);
    }
    return false;
  }

  newChatUrl(): string {
    return "https://gemini.google.com/app";
  }

  getChatTitle(): string | null {
    const el = document.querySelector(SELECTORS.title);
    if (!el) return null;
    const text = el.textContent?.trim();
    return text ? text.replace("Gemini", "").trim() : null;
  }

  getChatContainer(): HTMLElement | null {
    return document.querySelector<HTMLElement>(SELECTORS.chatContainer);
  }
}
