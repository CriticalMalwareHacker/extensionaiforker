import { SiteAdapter } from "../adapters";
import { ForkPayload } from "../shared/types";
import { showToast } from "./toast";

export async function waitForInputElement(
  adapter: SiteAdapter,
  timeoutMs: number = 8000
): Promise<HTMLElement | null> {
  const existing = adapter.getInputElement();
  if (existing) return existing;

  return new Promise((resolve) => {
    const startTime = Date.now();
    let resolved = false;

    const cleanup = (el: HTMLElement | null) => {
      if (resolved) return;
      resolved = true;
      clearInterval(intervalId);
      observer.disconnect();
      resolve(el);
    };

    // Fast 50ms interval probe for input element
    const intervalId = setInterval(() => {
      const input = adapter.getInputElement();
      if (input) {
        cleanup(input);
      } else if (Date.now() - startTime > timeoutMs) {
        cleanup(null);
      }
    }, 50);

    const observer = new MutationObserver(() => {
      const input = adapter.getInputElement();
      if (input) {
        cleanup(input);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
}

export async function injectForkPayload(
  adapter: SiteAdapter,
  payload: ForkPayload
): Promise<boolean> {
  // Pre-copy context immediately so the clipboard has it with zero delay
  try {
    await navigator.clipboard.writeText(payload.contextText);
  } catch {}

  const inputEl = await waitForInputElement(adapter);
  if (!inputEl) {
    showToast("Context ready on clipboard. Press Ctrl+V to paste.", 5000, "info");
    return true;
  }

  // Attempt insertion using adapter's multi-step mechanism
  let inserted = adapter.insertText(inputEl, payload.contextText);

  if (inserted) {
    showToast("Context loaded. Review and press Enter to start branch.", 4000, "success");
  } else {
    showToast("Context copied to clipboard. Press Ctrl+V and Enter.", 5000, "info");
  }

  return true;
}
