import { SiteAdapter } from "./types";
import { Message, Site } from "../shared/types";

const SELECTORS = {
  // Matches message elements or conversation turns
  messageTurn: "article[data-testid^=\"conversation-turn\"], [data-message-author-role]",
  authorRole: "[data-message-author-role]",
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
    // Prefer article turns because they wrap both the message content and action button toolbars
    const turns = Array.from(
      document.querySelectorAll<HTMLElement>("article[data-testid^=\"conversation-turn\"], article")
    );
    if (turns.length > 0) {
      return turns;
    }
    // Fallback: elements with data-message-author-role
    const elements = Array.from(document.querySelectorAll<HTMLElement>(SELECTORS.authorRole));
    if (elements.length > 0) {
      return elements;
    }
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

    // Clean text: clone element to sanitize code blocks or copy text
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
