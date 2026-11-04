import { getAdapterForUrl } from "../adapters";
import { injectForkButtons } from "./forkButton";
import { injectForkPayload } from "./inject";
import { showToast } from "./toast";
import {
  ExtensionMessage,
  ForkOptions,
  ForkPayload,
  Message,
  Site,
} from "../shared/types";

console.log("[Forkline] Content script initialized on:", window.location.href);

const adapter = getAdapterForUrl(window.location.href);

function hasExtensionContext(): boolean {
  try {
    return Boolean(chrome.runtime?.id);
  } catch {
    return false;
  }
}

if (!adapter) {
  console.debug("[Forkline] No matching adapter for current URL.");
} else {
  console.log(`[Forkline] Active site adapter: ${adapter.site}`);

  let lastUrl = window.location.href;
  let activeNodeId: string | null = null;

  // 1. Check for pending fork payload to inject into this chat
  if (hasExtensionContext()) {
    chrome.runtime.sendMessage(
      { type: "GET_PENDING_PAYLOAD" } as ExtensionMessage,
      (response) => {
        if (chrome.runtime.lastError) {
          console.debug("[Forkline] Runtime error checking payload:", chrome.runtime.lastError);
          return;
        }
        if (response?.payload) {
          const payload: ForkPayload = response.payload;
          activeNodeId = payload.nodeId;
          injectForkPayload(adapter, payload).finally(() => {
            if (hasExtensionContext()) {
              chrome.runtime.sendMessage({ type: "ACK_PENDING_PAYLOAD" } as ExtensionMessage);
            }
          });
        }
      }
    );
  }

  // 2. Debounced button injection
  let debounceTimer: any = null;

  function scheduleButtonInjection() {
    if (!hasExtensionContext()) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      injectForkButtons(adapter, (index, customOptions) => {
        handleForkClick(index, customOptions);
      });
    }, 350);
  }

  // 3. Handle user clicking fork on a message
  function handleForkClick(
    index: number,
    customOptions?: {
      excludedIndexes?: number[];
      compaction?: "none" | "summary";
      targetSites?: Site[];
      label?: string;
    }
  ) {
    if (!hasExtensionContext()) {
      showToast("Forkline was updated. Reload this chat page, then try again.", 5000, "info");
      return;
    }
    try {
      const elements = adapter.getMessageElements();
      const messages: Message[] = elements.map((el, i) => adapter.readMessage(el, i));

      const currentConvId = adapter.getConversationId(new URL(window.location.href));
      const targetSites = customOptions?.targetSites || [adapter.site === "google" ? "chatgpt" : adapter.site];

      const forkPayload: ForkOptions = {
        sourceSite: adapter.site,
        targetSites,
        messages,
        forkedAtIndex: index,
        label: customOptions?.label,
        excludedIndexes: customOptions?.excludedIndexes || [],
        compaction: customOptions?.compaction || "none",
        sourceChat: currentConvId
          ? {
              site: adapter.site,
              conversationId: currentConvId,
              url: window.location.href,
              title: adapter.getChatTitle?.() || undefined,
            }
          : null,
      };

      showToast(
        `Forking conversation to ${targetSites.join(", ")}...`,
        3000,
        "info"
      );

      chrome.runtime.sendMessage(
        {
          type: "FORK_REQUEST",
          payload: forkPayload,
        } as ExtensionMessage,
        (res) => {
          if (chrome.runtime.lastError) {
            showToast("Failed to fork chat: " + chrome.runtime.lastError.message, 4000, "warning");
          } else {
            showToast("Branch created! Check your new tab.", 4000, "success");
          }
        }
      );
    } catch (err: any) {
      console.error("[Forkline] Error during fork extraction:", err);
      showToast("Could not read chat turns: " + err.message, 4000, "warning");
    }
  }

  // Initial injection
  scheduleButtonInjection();

  // 4. MutationObserver on chat container / body
  const observer = new MutationObserver(() => {
    scheduleButtonInjection();
    checkUrlChange();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // 5. Watch for URL changes to report conversation ID
  function checkUrlChange() {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      const convId = adapter.getConversationId(new URL(window.location.href));
      if (convId && activeNodeId && hasExtensionContext()) {
        chrome.runtime.sendMessage({
          type: "REPORT_CHAT_URL",
          nodeId: activeNodeId,
          chat: {
            site: adapter.site,
            conversationId: convId,
            url: window.location.href,
            title: adapter.getChatTitle?.() || document.title,
          },
        } as ExtensionMessage);
      }
    }
  }

  window.addEventListener("popstate", checkUrlChange);

  // Listen for background tab updates
  if (hasExtensionContext()) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === "TAB_URL_UPDATED") {
        checkUrlChange();
      }
    });
  }
}

