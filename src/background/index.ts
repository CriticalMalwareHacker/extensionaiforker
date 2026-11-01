import {
  handleForkRequest,
  getPendingPayload,
  reportChatUrl,
  findNodeForTab,
} from "./forkService";
import {
  getAllNodes,
  saveNode,
  deleteNode,
  getSettings,
  saveSetting,
} from "./db";
import { ExtensionMessage } from "../shared/types";
import { nanoAvailable, nameBranchNano, summarizeNano } from "../ai/nano";
import { summarizeRemote, nameBranchRemote } from "../ai/remote";
import { buildMergeInsertText } from "../core/merge";

// Configure side panel to open on action click
if (chrome.sidePanel?.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
    console.debug("[Forkline ServiceWorker] setPanelBehavior:", err);
  });
}

chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  (async () => {
    try {
      switch (message.type) {
        case "FORK_REQUEST": {
          const res = await handleForkRequest(message.payload);
          sendResponse({ success: true, nodeIds: res.nodeIds });
          break;
        }

        case "GET_PENDING_PAYLOAD": {
          const targetTabId = message.tabId || tabId;
          if (targetTabId) {
            const payload = getPendingPayload(targetTabId);
            sendResponse({ type: "PENDING_PAYLOAD_RESPONSE", payload });
          } else {
            sendResponse({ type: "PENDING_PAYLOAD_RESPONSE", payload: null });
          }
          break;
        }

        case "REPORT_CHAT_URL": {
          await reportChatUrl(message.nodeId, message.chat.url, message.chat.title);
          sendResponse({ success: true });
          break;
        }

        case "GET_ALL_NODES": {
          const nodes = await getAllNodes();
          sendResponse({ type: "GET_ALL_NODES_RESPONSE", nodes });
          break;
        }

        case "SAVE_NODE": {
          await saveNode(message.node);
          sendResponse({ success: true });
          break;
        }

        case "DELETE_NODE": {
          await deleteNode(message.nodeId);
          sendResponse({ success: true });
          break;
        }

        case "SUMMARIZE_REQUEST": {
          const settings = await getSettings();
          let summary: string | null = null;

          if (settings.useGeminiNano && (await nanoAvailable())) {
            summary = await summarizeNano(message.text, message.mode);
          }
          if (!summary && settings.cloudProxyUrl) {
            summary = await summarizeRemote(message.text, message.mode, settings);
          }

          sendResponse({
            type: "SUMMARIZE_RESPONSE",
            summary: summary || "",
            error: summary ? undefined : "Summarization unavailable",
          });
          break;
        }

        case "AUTO_NAME_REQUEST": {
          const settings = await getSettings();
          let title: string | null = null;

          if (settings.useGeminiNano && (await nanoAvailable())) {
            title = await nameBranchNano(message.contextText);
          }
          if (!title && settings.cloudProxyUrl) {
            title = await nameBranchRemote(message.contextText, settings);
          }

          sendResponse({
            type: "AUTO_NAME_RESPONSE",
            title: title || "Branch Exploration",
          });
          break;
        }

        default:
          sendResponse({ error: "Unknown message type" });
      }
    } catch (err: any) {
      console.error("[Forkline ServiceWorker] Error processing message:", err);
      sendResponse({ error: err.message || "Unknown error" });
    }
  })();

  return true; // Keep message channel open for async response
});

// Watch tab updates to detect when a pending fork gets its real conversation URL
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    // Notify tab content script of URL change if needed
    try {
      chrome.tabs.sendMessage(tabId, {
        type: "TAB_URL_UPDATED",
        url: changeInfo.url,
      }).catch(() => {});
    } catch {}
  }
});

