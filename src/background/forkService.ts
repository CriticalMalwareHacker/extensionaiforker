import { BranchNode, ForkOptions, ForkPayload, Site } from "../shared/types";
import { buildForkMessage } from "../core/primer";
import { estimateTokens } from "../core/tokens";
import { prepareCompaction, fallbackSummarize } from "../core/compact";
import { getAdapterForUrl, ADAPTERS } from "../adapters";
import { db, getSettings, saveNode } from "./db";
import { nanoAvailable, nameBranchNano, summarizeNano } from "../ai/nano";
import { nameBranchRemote, summarizeRemote } from "../ai/remote";

// Memory cache for payloads waiting to be injected into new tabs
const pendingPayloads = new Map<number, ForkPayload>();
const nodeToTab = new Map<string, number>();

export async function handleForkRequest(options: ForkOptions): Promise<{ nodeIds: string[] }> {
  const settings = await getSettings();
  const createdNodeIds: string[] = [];
  const createdTabIds: number[] = [];

  const {
    messages,
    forkedAtIndex,
    excludedIndexes = [],
    compaction = "none",
    targetSites,
    parentNodeId,
    sourceChat,
  } = options;

  // Filter messages up to forkedAtIndex
  const messagesToFork = messages.filter((m) => m.index <= forkedAtIndex);

  let summaryText: string | undefined = undefined;
  let activeMessages = messagesToFork;

  // Perform compaction if requested (use fast fallback first to avoid blocking tab open)
  if (compaction === "summary") {
    const plan = prepareCompaction(messagesToFork, settings.compactKeepRecent);
    if (plan.olderMessages.length > 0) {
      summaryText = fallbackSummarize(plan);
      activeMessages = plan.recentMessages;

      // Asynchronously refine summary in background if AI is available
      (async () => {
        try {
          let refinedSummary: string | null = null;
          if (settings.useGeminiNano && (await nanoAvailable())) {
            refinedSummary = await summarizeNano(plan.textToSummarize, "compact");
          } else if (settings.cloudProxyUrl) {
            refinedSummary = await summarizeRemote(plan.textToSummarize, "compact", settings);
          }
          if (refinedSummary) {
            for (const id of createdNodeIds) {
              const n = await db.nodes.get(id);
              if (n) {
                n.summary = refinedSummary;
                await saveNode(n);
              }
            }
          }
        } catch {}
      })();
    }
  }

  // Build formatted context and full text immediately
  const { fullText, contextText, primer } = buildForkMessage(activeMessages, {
    excludedIndexes,
    summary: summaryText,
    template: options.primerTemplate || settings.primerTemplate,
  });

  const tokenEstimate = estimateTokens(fullText);

  // Compute instantaneous branch label from message preview
  const lastMsg = messagesToFork[messagesToFork.length - 1];
  const preview = lastMsg?.text.slice(0, 32).trim() || "Turn";
  const instantLabel = options.label || `Turn #${forkedAtIndex + 1}: "${preview}..."`;

  // Iterate over all target sites (immediate tab creation without blocking)
  for (const targetSite of targetSites) {
    const nodeId = crypto.randomUUID();
    createdNodeIds.push(nodeId);

    const node: BranchNode = {
      id: nodeId,
      parentId: parentNodeId || null,
      chat: null,
      forkedAtIndex,
      label: targetSites.length > 1 ? `${instantLabel} (${targetSite})` : instantLabel,
      tags: [targetSite, compaction === "summary" ? "compacted" : "full"],
      tokenEstimate,
      compaction,
      excludedIndexes,
      createdAt: Date.now(),
      summary: summaryText,
    };

    await saveNode(node);

    // Find adapter to get newChatUrl
    const adapter = ADAPTERS.find((a) => a.site === targetSite);
    const targetUrl = adapter ? adapter.newChatUrl() : `https://${targetSite}.com/`;

    const payload: ForkPayload = {
      nodeId,
      targetSite,
      primer,
      contextText: fullText,
    };

    // Open target tab immediately
    const tab = await chrome.tabs.create({ url: targetUrl, active: true });
    if (tab.id) {
      pendingPayloads.set(tab.id, payload);
      nodeToTab.set(nodeId, tab.id);
      createdTabIds.push(tab.id);
    }
  }

  // Async background auto-naming without blocking tab launch
  if (!options.label) {
    (async () => {
      try {
        let aiTitle: string | null = null;
        if (settings.useGeminiNano && (await nanoAvailable())) {
          aiTitle = await nameBranchNano(contextText);
        } else if (settings.cloudProxyUrl) {
          aiTitle = await nameBranchRemote(contextText, settings);
        }

        if (aiTitle) {
          for (const id of createdNodeIds) {
            const n = await db.nodes.get(id);
            if (n) {
              n.label = targetSites.length > 1 ? `${aiTitle} (${n.tags[0]})` : aiTitle;
              await saveNode(n);
            }
          }
        }
      } catch (err) {
        console.debug("[Forkline] Background naming skipped:", err);
      }
    })();
  }

  // Multi-model tab grouping
  if (createdTabIds.length > 1 && chrome.tabGroups) {
    try {
      const groupId = await chrome.tabs.group({ tabIds: createdTabIds });
      await chrome.tabGroups.update(groupId, {
        title: `Forkline: ${instantLabel.slice(0, 20)}`,
        color: "grey",
      });
    } catch (err) {
      console.debug("[Forkline] Could not group tabs:", err);
    }
  }

  return { nodeIds: createdNodeIds };
}

export function getPendingPayload(tabId: number): ForkPayload | null {
  const payload = pendingPayloads.get(tabId) || null;
  if (payload) {
    // Keep for 15s in case of tab navigation/redirect
    setTimeout(() => {
      pendingPayloads.delete(tabId);
    }, 15000);
  }
  return payload;
}

export async function reportChatUrl(nodeId: string, url: string, title?: string): Promise<void> {
  const node = await db.nodes.get(nodeId);
  if (!node) return;

  const adapter = getAdapterForUrl(url);
  const convId = adapter ? adapter.getConversationId(new URL(url)) : null;

  node.chat = {
    site: adapter ? adapter.site : (node.tags[0] as Site) || "chatgpt",
    conversationId: convId || encodeURIComponent(url),
    url,
    title: title || node.label,
  };

  await saveNode(node);
}

export async function findNodeForTab(url: string): Promise<BranchNode | null> {
  const adapter = getAdapterForUrl(url);
  if (!adapter) return null;
  const convId = adapter.getConversationId(new URL(url));
  if (!convId) return null;

  const node = await db.nodes
    .filter((n) => n.chat?.conversationId === convId && n.chat?.site === adapter.site)
    .first();
  return node || null;
}
