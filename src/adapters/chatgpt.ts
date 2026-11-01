import { SiteAdapter } from "./types";
import { Message, Site } from "../shared/types";

const SELECTORS = {
  authorRole: "[data-message-author-role]",
  messageTurn: "[data-testid^=\"conversation-turn\"], [data-message-author-role], article",
  codeBlock: "pre",
  attachments: "img[alt*=\"Uploaded\"], [data-testid*=\"attachment\"], [aria-label*=\"attachment\" i]",
  inputBox: "#prompt-textarea, textarea[data-id=\"root\"], div#prompt-textarea[contenteditable=\"true\"]",
  chatContainer: "main, [role=\"main\"], .conversation-container",
  title: "title, header h1, [data-testid=\"conversation-title\"]",
};

export class ChatGPTAdapter implements SiteAdapter {
  site: Site = "chatgpt";

  matches(url: URL): boolean {
    return (
      url.hostname === "chatgpt.com" ||
      url.hostname === "chat.openai.com" ||
      url.hostname.endsWith(".chatgpt.com")
    );
  }

  getConversationId(url: URL): string | null {
    const match = url.pathname.match(/\/c\/([a-zA-Z0-9-]+)/);
    return match ? match[1] : null;
  }

  getMessageElements(): HTMLElement[] {
    // 1. Primary: [data-message-author-role] is ChatGPT's universal turn marker
    const roleElements = Array.from(document.querySelectorAll<HTMLElement>(SELECTORS.authorRole));
    if (roleElements.length > 0) {
      return roleElements;
    }

    // 2. Fallback: conversation turns with data-testid
    const turns = Array.from(
      document.querySelectorAll<HTMLElement>("[data-testid^=\"conversation-turn\"]")
    );
    if (turns.length > 0) {
      return turns;
    }

    // 3. Last fallback: article turns
    return Array.from(document.querySelectorAll<HTMLElement>(SELECTORS.messageTurn));
  }

  readMessage(el: HTMLElement, index: number): Message {
    let roleAttr = el.getAttribute("data-message-author-role");
    if (!roleAttr) {
      const childRole = el.querySelector<HTMLElement>(SELECTORS.authorRole);
      roleAttr = childRole ? childRole.getAttribute("data-message-author-role") : null;
    }

    const role: "user" | "assistant" = roleAttr === "user" ? "user" : "assistant";

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

    // Detect attachments
    const hasAttachments = el.querySelectorAll(SELECTORS.attachments).length > 0;

    // Clean text by cloning and stripping out any injected fork buttons
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(".forkline-btn-wrapper, .forkline-action-btn").forEach((b) => b.remove());
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

      // Approach 1: execCommand
      if (document.execCommand("insertText", false, text)) {
        return true;
      }

      // Approach 2: Dispatch synthetic paste event with DataTransfer
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

      // Approach 3: Direct value setting for textarea
      if (input instanceof HTMLTextAreaElement) {
        input.value = text;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      }

      // Approach 4: contenteditable innerText
      if (input.isContentEditable) {
        input.innerText = text;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      }
    } catch (err) {
      console.warn("[Forkline] Error inserting text in ChatGPT:", err);
    }
    return false;
  }

  newChatUrl(): string {
    return "https://chatgpt.com/";
  }

  getChatTitle(): string | null {
    const el = document.querySelector(SELECTORS.title);
    if (!el) return null;
    const text = el.textContent?.trim();
    return text ? text.replace(" - ChatGPT", "").trim() : null;
  }

  getChatContainer(): HTMLElement | null {
    return document.querySelector<HTMLElement>(SELECTORS.chatContainer);
  }
}
