import { SiteAdapter } from "./types";
import { Message, Site } from "../shared/types";

const SELECTORS = {
  messageTurn: "user-query, model-response, [data-test-id=\"message-container\"]",
  userTurn: "user-query",
  modelTurn: "model-response",
  codeBlock: "pre, code-block, .code-container",
  attachments: "img[src*=\"blob\"], img[src*=\"data:image\"], file-chip, .attachment-item",
  inputBox: "div.ql-editor[contenteditable=\"true\"], rich-textarea div[contenteditable=\"true\"], textarea",
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
    const list = Array.from(document.querySelectorAll<HTMLElement>(SELECTORS.messageTurn));
    return list;
  }

  readMessage(el: HTMLElement, index: number): Message {
    const tagName = el.tagName.toLowerCase();
    const isUser = tagName === "user-query" || Boolean(el.closest(SELECTORS.userTurn));
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
    const text = el.innerText || el.textContent || "";

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

      // Quill editor (Gemini uses Quill or similar contenteditable)
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
        // Fallback for Quill: append a p tag or set innerText
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
