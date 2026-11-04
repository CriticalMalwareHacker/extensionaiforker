import { ForklineSettings } from "../shared/types";
import { getSettings } from "../background/db";

const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

const COMPACT_SYSTEM_INSTRUCTION = `You are a world-class context compressor for AI conversation branching.
Your job is to digest earlier conversation turns into a dense, high-fidelity context brief so that an AI in a newly forked branch can seamlessly continue the discussion without losing any context.

Format your output in clean Markdown with the following structured sections:
## Context & Objectives
1-2 concise sentences outlining the primary problem, goal, or exploration topic.

## Technical Decisions & Parameters
Bullet points containing exact architectural choices, libraries, constants, API names, endpoints, file paths, constraints, and dependencies agreed upon.

## Code & Implementation Summary
Dense summary of functions, modules, algorithms, or components implemented so far. (Do not dump verbose boilerplate, but preserve key signatures, logic patterns, and structural decisions).

## Current State & Next Steps
Exactly where the conversation left off, what was solved, and what task or open question the user is addressing next.

RULES:
- Be dense, factual, and strictly objective.
- Never omit key technical decisions, configurations, or error details.
- No conversational filler or pleasantries.`;

const MERGE_SYSTEM_INSTRUCTION = `You are a technical synthesizer for conversation branches.
Summarize the findings, solution, architectural changes, and key takeaways from this side branch exploration in under 200 words. Focus strictly on conclusions, actionable code snippets, and decisions ready to integrate back into the main thread.`;

const TITLE_SYSTEM_INSTRUCTION = `You are an expert at naming conversation branches for software developers and researchers.
Analyze the provided conversation history and generate a concise, highly descriptive 3 to 5 word title that captures the core technical topic, question, or goal being explored in this branch.

Examples of great titles:
- "OpenRouter RAG Implementation"
- "Redis Queue Stream Architecture"
- "Docker Multi-Stage Build Fix"
- "FastAPI JWT Authentication"
- "Next.js Hydration Error Debug"

RULES:
- Exactly 3 to 5 words.
- Specific, professional, and descriptive.
- Capitalize Major Words (Title Case).
- Output ONLY the plain text title.
- Do NOT include quotes, brackets, markdown, prefixes like "Branch:", or ending punctuation.`;

/**
 * Resolves the active Gemini API key from settings or Vite/process environment.
 */
export async function getActiveGeminiApiKey(customSettings?: ForklineSettings): Promise<string> {
  if (customSettings?.geminiApiKey?.trim()) {
    return customSettings.geminiApiKey.trim();
  }

  try {
    const settings = await getSettings();
    if (settings?.geminiApiKey?.trim()) {
      return settings.geminiApiKey.trim();
    }
  } catch {}

  // Check compile-time injected environment variable
  if (typeof process !== "undefined" && process.env?.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY.trim();
  }

  return "";
}

/**
 * Resolves the active Gemini model name from settings or environment.
 */
export async function getActiveGeminiModel(customSettings?: ForklineSettings): Promise<string> {
  if (customSettings?.geminiModel?.trim()) {
    return customSettings.geminiModel.trim();
  }

  try {
    const settings = await getSettings();
    if (settings?.geminiModel?.trim()) {
      return settings.geminiModel.trim();
    }
  } catch {}

  if (typeof process !== "undefined" && process.env?.GEMINI_MODEL) {
    return process.env.GEMINI_MODEL.trim();
  }

  return DEFAULT_GEMINI_MODEL;
}

/**
 * Checks whether a valid Gemini API key is configured.
 */
export async function isGeminiConfigured(customSettings?: ForklineSettings): Promise<boolean> {
  const key = await getActiveGeminiApiKey(customSettings);
  return Boolean(key && key.length > 5);
}

/**
 * Summarizes long chat context using Google Gemini API (supporting 1M+ token context windows).
 */
export async function summarizeWithGemini(
  text: string,
  mode: "compact" | "merge" = "compact",
  customSettings?: ForklineSettings
): Promise<string | null> {
  const apiKey = await getActiveGeminiApiKey(customSettings);
  if (!apiKey) {
    return null;
  }

  const model = await getActiveGeminiModel(customSettings);
  const systemInstruction = mode === "merge" ? MERGE_SYSTEM_INSTRUCTION : COMPACT_SYSTEM_INSTRUCTION;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: mode === "merge" ? 1024 : 2048,
        },
      }),
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errBody = await response.text();
      console.warn(`[Forkline Gemini API] Request failed (${response.status}):`, errBody);
      return null;
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const textOutput = candidate?.content?.parts?.[0]?.text;

    if (textOutput && typeof textOutput === "string") {
      return textOutput.trim();
    }

    return null;
  } catch (err) {
    console.warn("[Forkline Gemini API] Failed to summarize with Gemini:", err);
    return null;
  }
}

/**
 * Generates an intelligent 3-5 word branch title using Google Gemini.
 */
export async function nameBranchWithGemini(
  contextText: string,
  customSettings?: ForklineSettings
): Promise<string | null> {
  const apiKey = await getActiveGeminiApiKey(customSettings);
  if (!apiKey) {
    return null;
  }

  const model = await getActiveGeminiModel(customSettings);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: TITLE_SYSTEM_INSTRUCTION }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: contextText.slice(0, 12000) }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 64,
        },
      }),
    });
    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const data = await response.json();
    const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (textOutput && typeof textOutput === "string") {
      const firstLine = textOutput.trim().replace(/\r?\n.*/s, "").trim();
      let cleanTitle = firstLine
        .replace(/^(Branch|Title|Topic|Name)\s*:\s*/i, "")
        .replace(/^["'`#*_\-:\s]+|["'`#*_\-:\s]+$/g, "")
        .trim();
      if (cleanTitle.length >= 3) {
        return cleanTitle;
      }
    }

    return null;
  } catch (err) {
    console.debug("[Forkline Gemini API] Title generation error:", err);
    return null;
  }
}
