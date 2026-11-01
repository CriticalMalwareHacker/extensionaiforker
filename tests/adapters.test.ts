import { describe, it, expect, beforeEach } from "vitest";
import { ChatGPTAdapter } from "../src/adapters/chatgpt";
import { ClaudeAdapter } from "../src/adapters/claude";
import { GeminiAdapter } from "../src/adapters/gemini";
import fs from "fs";
import path from "path";

describe("Site Adapters", () => {
  describe("ChatGPTAdapter", () => {
    const adapter = new ChatGPTAdapter();

    it("matches ChatGPT URLs and extracts conversation ID", () => {
      expect(adapter.matches(new URL("https://chatgpt.com/c/abcd-1234"))).toBe(true);
      expect(adapter.matches(new URL("https://chat.openai.com/c/5678-efgh"))).toBe(true);
      expect(adapter.matches(new URL("https://claude.ai/"))).toBe(false);

      expect(adapter.getConversationId(new URL("https://chatgpt.com/c/12345678-abcd"))).toBe(
        "12345678-abcd"
      );
    });

    it("extracts messages from ChatGPT HTML fixture", () => {
      const fixtureHtml = fs.readFileSync(
        path.join(__dirname, "../src/adapters/__fixtures__/chatgpt.html"),
        "utf-8"
      );
      document.body.innerHTML = fixtureHtml;

      const elements = adapter.getMessageElements();
      expect(elements.length).toBe(3);

      const msg0 = adapter.readMessage(elements[0], 0);
      expect(msg0.role).toBe("user");
      expect(msg0.text).toContain("TypeScript function to debounce");

      const msg1 = adapter.readMessage(elements[1], 1);
      expect(msg1.role).toBe("assistant");
      expect(msg1.codeBlocks?.length).toBe(1);
      expect(msg1.codeBlocks?.[0].lang).toBe("typescript");
      expect(msg1.codeBlocks?.[0].code).toContain("clearTimeout(timer)");

      const msg2 = adapter.readMessage(elements[2], 2);
      expect(msg2.role).toBe("user");
      expect(msg2.hasAttachments).toBe(true);
    });
  });

  describe("ClaudeAdapter", () => {
    const adapter = new ClaudeAdapter();

    it("matches Claude URLs and extracts conversation ID", () => {
      expect(adapter.matches(new URL("https://claude.ai/chat/claude-uuid-123"))).toBe(true);
      expect(adapter.getConversationId(new URL("https://claude.ai/chat/claude-uuid-123"))).toBe(
        "claude-uuid-123"
      );
    });

    it("extracts messages from Claude HTML fixture", () => {
      const fixtureHtml = fs.readFileSync(
        path.join(__dirname, "../src/adapters/__fixtures__/claude.html"),
        "utf-8"
      );
      document.body.innerHTML = fixtureHtml;

      const elements = adapter.getMessageElements();
      expect(elements.length).toBe(2);

      const msg0 = adapter.readMessage(elements[0], 0);
      expect(msg0.role).toBe("user");
      expect(msg0.text).toContain("LRU Cache");

      const msg1 = adapter.readMessage(elements[1], 1);
      expect(msg1.role).toBe("assistant");
      expect(msg1.codeBlocks?.length).toBe(1);
      expect(msg1.codeBlocks?.[0].code).toContain("class LRUCache");
    });
  });

  describe("GeminiAdapter", () => {
    const adapter = new GeminiAdapter();

    it("matches Gemini URLs and extracts conversation ID", () => {
      expect(adapter.matches(new URL("https://gemini.google.com/app/gemini-thread-456"))).toBe(
        true
      );
      expect(
        adapter.getConversationId(new URL("https://gemini.google.com/app/gemini-thread-456"))
      ).toBe("gemini-thread-456");
    });

    it("extracts messages from Gemini HTML fixture", () => {
      const fixtureHtml = fs.readFileSync(
        path.join(__dirname, "../src/adapters/__fixtures__/gemini.html"),
        "utf-8"
      );
      document.body.innerHTML = fixtureHtml;

      const elements = adapter.getMessageElements();
      expect(elements.length).toBe(2);

      const msg0 = adapter.readMessage(elements[0], 0);
      expect(msg0.role).toBe("user");
      expect(msg0.text).toContain("Manifest V3 service workers");

      const msg1 = adapter.readMessage(elements[1], 1);
      expect(msg1.role).toBe("assistant");
      expect(msg1.codeBlocks?.length).toBe(1);
      expect(msg1.codeBlocks?.[0].code).toContain("chrome.runtime.onMessage");
    });
  });
});

