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

// Mapping from nodeId to tabId
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

  // Perform compaction if requested
  if (compaction === "summary") {
    const plan = prepareCompaction(messagesToFork, settings.compactKeepRecent);
    if (plan.olderMessages.length > 0) {
      // 1. Try Nano
      if (settings.useGeminiNano && (await nanoAvailable())) {
        const nanoSummary = await summarizeNano(plan.textToSummarize, "compact");
        if (nanoSummary) summaryText = nanoSummary;
      }
      // 2. Try Remote
      if (!summaryText && settings.cloudProxyUrl) {
        const remoteSummary = await summarizeRemote(plan.textToSummarize, "compact", settings);
        if (remoteSummary) summaryText = remoteSummary;
      }
      // 3. Fallback
      if (!summaryText) {
        summaryText = fallbackSummarize(plan);
      }
      activeMessages = plan.recentMessages;
    }
  }

  // Build formatted context and full text
  const { fullText, contextText, primer } = buildForkMessage(activeMessages, {
    excludedIndexes,
    summary: summaryText,
    template: options.primerTemplate || settings.primerTemplate,
  });

  const tokenEstimate = estimateTokens(fullText);

  // Auto-name branch
  let branchLabel = options.label;
  if (!branchLabel) {
    if (settings.useGeminiNano && (await nanoAvailable())) {
      branchLabel = (await nameBranchNano(contextText)) || undefined;
    }
    if (!branchLabel && settings.cloudProxyUrl) {
      branchLabel = (await nameBranchRemote(contextText, settings)) || undefined;
    }
    if (!branchLabel) {
      const lastMsg = messagesToFork[messagesToFork.length - 1];
      const preview = lastMsg?.text.slice(0, 30).trim() || "Branch";
      branchLabel = `Fork: "${preview}..."`;
    }
  }

  // Iterate over all target sites (supports single fork and multi-model fork)
  for (const targetSite of targetSites) {
    const nodeId = crypto.randomUUID();
    createdNodeIds.push(nodeId);

    const node: BranchNode = {
      id: nodeId,
      parentId: parentNodeId || null,
      chat: null, // to be populated when URL is reported
      forkedAtIndex,
      label: targetSites.length > 1 ? `${branchLabel} (${targetSite})` : branchLabel,
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

    // Open target tab
    const tab = await chrome.tabs.create({ url: targetUrl, active: true });
    if (tab.id) {
      pendingPayloads.set(tab.id, payload);
      nodeToTab.set(nodeId, tab.id);
      createdTabIds.push(tab.id);
    }
  }

  // Multi-model tab grouping if more than one tab opened and tabGroups supported
  if (createdTabIds.length > 1 && chrome.tabGroups) {
    try {
      const groupId = await chrome.tabs.group({ tabIds: createdTabIds });
      await chrome.tabGroups.update(groupId, {
        title: `Forkline: ${branchLabel.slice(0, 20)}`,
        color: "blue",
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
    // Keep it for a short time in case tab reloads, but clean up after 15s
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
