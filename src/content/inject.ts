import { SiteAdapter } from "../adapters";
import { ForkPayload } from "../shared/types";
import { showToast } from "./toast";

export async function waitForInputElement(
  adapter: SiteAdapter,
  timeoutMs: number = 10000
): Promise<HTMLElement | null> {
  const existing = adapter.getInputElement();
  if (existing) return existing;

  return new Promise((resolve) => {
    const startTime = Date.now();

    const observer = new MutationObserver(() => {
      const input = adapter.getInputElement();
      if (input) {
        observer.disconnect();
        resolve(input);
        return;
      }
      if (Date.now() - startTime > timeoutMs) {
        observer.disconnect();
        resolve(null);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      resolve(adapter.getInputElement());
    }, timeoutMs);
  });
}

export async function injectForkPayload(
  adapter: SiteAdapter,
  payload: ForkPayload
): Promise<boolean> {
  showToast("Forkline: Preparing chat context...", 2000, "info");

  const inputEl = await waitForInputElement(adapter);
  if (!inputEl) {
    showToast("Could not find input box. Copying context to clipboard...", 4000, "warning");
    try {
      await navigator.clipboard.writeText(payload.contextText);
      showToast("Context copied to clipboard! Paste with Ctrl+V and press Enter.", 6000, "success");
      return true;
    } catch {
      return false;
    }
  }

  // Attempt insertion using adapter's multi-step mechanism
  let inserted = adapter.insertText(inputEl, payload.contextText);

  if (!inserted) {
    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(payload.contextText);
      showToast("Context copied to clipboard! Click input and press Ctrl+V.", 6000, "warning");
      inserted = true;
    } catch (err) {
      console.error("[Forkline] Clipboard fallback failed:", err);
    }
  } else {
    showToast("Context loaded! Review and press Enter to start branch.", 5000, "success");
  }

  return inserted;
}

