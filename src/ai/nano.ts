/**
 * Wrapper for Chrome Built-in AI (Gemini Nano)
 * Handles both the modern spec (`ai.languageModel` / `ai.summarizer`)
 * and legacy window global shapes (`LanguageModel` / `Summarizer`).
 */

export async function nanoAvailable(): Promise<boolean> {
  try {
    // Check modern Chrome AI API
    if (typeof (globalThis as any).ai?.languageModel?.capabilities === "function") {
      const caps = await (globalThis as any).ai.languageModel.capabilities();
      return caps.available !== "no";
    }
    // Check modern Prompt API format
    if (typeof (globalThis as any).LanguageModel?.availability === "function") {
      const status = await (globalThis as any).LanguageModel.availability();
      return status !== "unavailable";
    }
  } catch (err) {
    console.debug("[Forkline Nano] Availability check error:", err);
  }
  return false;
}

export async function nameBranchNano(contextText: string): Promise<string | null> {
  try {
    const promptText =
      "Give a concise, descriptive 3 to 6 word title for this conversation branch. " +
      "Reply with the title only, no quotes, no preamble:\n\n" +
      contextText.slice(0, 4000);

    // Try modern API
    if (typeof (globalThis as any).ai?.languageModel?.create === "function") {
      const session = await (globalThis as any).ai.languageModel.create({
        systemPrompt: "You are a concise titling assistant. Output 3-6 words only.",
      });
      const result = await session.prompt(promptText);
      session.destroy?.();
      return result.trim().replace(/^["']|["']$/g, "");
    }

    // Try LanguageModel global
    if (typeof (globalThis as any).LanguageModel?.create === "function") {
      const session = await (globalThis as any).LanguageModel.create();
      const result = await session.prompt(promptText);
      session.destroy?.();
      return result.trim().replace(/^["']|["']$/g, "");
    }
  } catch (err) {
    console.warn("[Forkline Nano] Branch naming failed:", err);
  }
  return null;
}

export async function summarizeNano(
  text: string,
  mode: "compact" | "merge" = "compact"
): Promise<string | null> {
  try {
    // Try Chrome Summarizer API
    if (typeof (globalThis as any).ai?.summarizer?.create === "function") {
      const summarizer = await (globalThis as any).ai.summarizer.create({
        type: mode === "merge" ? "tl;dr" : "key-points",
        format: "markdown",
        length: mode === "merge" ? "short" : "medium",
      });
      const summary = await summarizer.summarize(text.slice(0, 30000));
      summarizer.destroy?.();
      return summary.trim();
    }

    // Try Summarizer global
    if (typeof (globalThis as any).Summarizer?.create === "function") {
      const summarizer = await (globalThis as any).Summarizer.create({
        type: mode === "merge" ? "tl;dr" : "key-points",
        format: "markdown",
        length: mode === "merge" ? "short" : "medium",
      });
      const summary = await summarizer.summarize(text.slice(0, 30000));
      summarizer.destroy?.();
      return summary.trim();
    }

    // Fallback to languageModel prompt if summarizer is not present
    if (typeof (globalThis as any).ai?.languageModel?.create === "function") {
      const session = await (globalThis as any).ai.languageModel.create();
      const instruction =
        mode === "merge"
          ? "Summarize the key conclusions and decisions in under 150 words:"
          : "Summarize this conversation concisely. Preserve important technical details and decisions:";
      const result = await session.prompt(`${instruction}\n\n${text.slice(0, 8000)}`);
      session.destroy?.();
      return result.trim();
    }
  } catch (err) {
    console.warn("[Forkline Nano] Summarization failed:", err);
  }
  return null;
}
