import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getActiveGeminiApiKey,
  getActiveGeminiModel,
  isGeminiConfigured,
  summarizeWithGemini,
  nameBranchWithGemini,
} from "../src/ai/gemini";
import { ForklineSettings } from "../src/shared/types";

// Mock the dexie database call
vi.mock("../src/background/db", () => ({
  getSettings: vi.fn().mockResolvedValue({
    geminiApiKey: "",
    geminiModel: "gemini-2.0-flash",
  }),
}));

describe("Gemini LLM Integration", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("Configuration resolution", () => {
    it("resolves API key from custom settings override", async () => {
      const custom: ForklineSettings = {
        geminiApiKey: "AIzaCustomKey123",
      } as any;
      const key = await getActiveGeminiApiKey(custom);
      expect(key).toBe("AIzaCustomKey123");
    });

    it("identifies when Gemini is configured", async () => {
      const configured = await isGeminiConfigured({ geminiApiKey: "AIzaTestKey456" } as any);
      expect(configured).toBe(true);

      const notConfigured = await isGeminiConfigured({ geminiApiKey: "" } as any);
      expect(notConfigured).toBe(false);
    });

    it("resolves model with default fallback", async () => {
      const model = await getActiveGeminiModel({ geminiModel: "gemini-1.5-pro" } as any);
      expect(model).toBe("gemini-1.5-pro");

      const defaultModel = await getActiveGeminiModel({ geminiModel: "" } as any);
      expect(defaultModel).toBe("gemini-2.0-flash");
    });
  });

  describe("summarizeWithGemini", () => {
    it("returns null if no API key is configured", async () => {
      const result = await summarizeWithGemini("Sample text", "compact", { geminiApiKey: "" } as any);
      expect(result).toBeNull();
    });

    it("successfully sends prompt to Gemini REST API and extracts response", async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: "## Context & Objectives\nUser is building an AI RAG system." }],
            },
          },
        ],
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await summarizeWithGemini("User: How do I build RAG?", "compact", {
        geminiApiKey: "AIzaValidKey",
        geminiModel: "gemini-2.0-flash",
      } as any);

      expect(result).toBe("## Context & Objectives\nUser is building an AI RAG system.");
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("gemini-2.0-flash:generateContent?key=AIzaValidKey"),
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    it("handles API HTTP errors gracefully without throwing", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => "API key expired",
      });

      const result = await summarizeWithGemini("Sample text", "compact", {
        geminiApiKey: "AIzaInvalidKey",
      } as any);

      expect(result).toBeNull();
    });
  });

  describe("nameBranchWithGemini", () => {
    it("generates a clean 3-5 word branch title", async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: '"Redis Queue Architecture"\nExtra notes' }],
            },
          },
        ],
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const title = await nameBranchWithGemini("User discussing Redis queue design", {
        geminiApiKey: "AIzaValidKey",
      } as any);

      expect(title).toBe("Redis Queue Architecture");
    });
  });
});
