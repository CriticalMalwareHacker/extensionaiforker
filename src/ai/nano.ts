/**
 * Wrapper for Chrome Built-in AI (Gemini Nano)
 * Handles both the modern spec (`ai.languageModel` / `ai.summarizer`)
 * and legacy window global shapes (`LanguageModel` / `Summarizer`).
 * Includes strict timeouts to prevent any blocking of the user experience.
 */

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export async function nanoAvailable(): Promise<boolean> {
  try {
    const checkPromise = (async () => {
      // Check modern Chrome AI API
      if (typeof (globalThis as any).ai?.languageModel?.capabilities === "function") {
        const caps = await (globalThis as any).ai.languageModel.capabilities();
        return caps.available === "readily";
      }
      // Check modern Prompt API format
      if (typeof (globalThis as any).LanguageModel?.availability === "function") {
        const status = await (globalThis as any).LanguageModel.availability();
        return status === "readily";
      }
      return false;
    })();

    // 500ms timeout for availability check
    return await withTimeout(checkPromise, 500, false);
  } catch {
    return false;
  }
}

export async function nameBranchNano(contextText: string): Promise<string | null> {
  try {
    const promptText =
      "Give a concise, descriptive 3 to 6 word title for this conversation branch. " +
      "Reply with the title only, no quotes, no preamble:\n\n" +
      contextText.slice(0, 3000);

    const callPromise = (async () => {
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
      return null;
    })();

    // 1500ms max timeout for title generation
    return await withTimeout(callPromise, 1500, null);
  } catch (err) {
    console.debug("[Forkline Nano] Branch naming skipped or timed out:", err);
    return null;
  }
}

export async function summarizeNano(
  text: string,
  mode: "compact" | "merge" = "compact"
): Promise<string | null> {
  try {
    const callPromise = (async () => {
      // Try Chrome Summarizer API
      if (typeof (globalThis as any).ai?.summarizer?.create === "function") {
        const summarizer = await (globalThis as any).ai.summarizer.create({
          type: mode === "merge" ? "tl;dr" : "key-points",
          format: "markdown",
          length: mode === "merge" ? "short" : "medium",
        });
        const summary = await summarizer.summarize(text.slice(0, 15000));
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
        const summary = await summarizer.summarize(text.slice(0, 15000));
        summarizer.destroy?.();
        return summary.trim();
      }

      // Fallback to languageModel prompt
      if (typeof (globalThis as any).ai?.languageModel?.create === "function") {
        const session = await (globalThis as any).ai.languageModel.create();
        const instruction =
          mode === "merge"
            ? "Summarize the key conclusions and decisions in under 150 words:"
            : "Summarize this conversation concisely. Preserve important technical details and decisions:";
        const result = await session.prompt(`${instruction}\n\n${text.slice(0, 6000)}`);
        session.destroy?.();
        return result.trim();
      }
      return null;
    })();

    // 2500ms max timeout for summarization
    return await withTimeout(callPromise, 2500, null);
  } catch (err) {
    console.debug("[Forkline Nano] Summarization skipped or timed out:", err);
    return null;
  }
}
