import { BranchNode, ForkOptions, ForkPayload, Site } from "../shared/types";
import { buildForkMessage } from "../core/primer";
import { estimateTokens } from "../core/tokens";
import { prepareCompaction, fallbackSummarize } from "../core/compact";
import { getAdapterForUrl, ADAPTERS } from "../adapters";
import { db, findNodeByChat, getSettings, saveNode } from "./db";
import { nanoAvailable, nameBranchNano, summarizeNano } from "../ai/nano";
import { nameBranchRemote, summarizeRemote } from "../ai/remote";
import { isGeminiConfigured, summarizeWithGemini, nameBranchWithGemini } from "../ai/gemini";

// MV3 workers can be suspended between opening a tab and the content script
// starting. Keep the hand-off in session storage instead of worker memory.
const pendingPayloadKey = (tabId: number) => `pendingFork:${tabId}`;
const PENDING_PAYLOAD_TTL_MS = 5 * 60 * 1000;

type StoredPayload = { payload: ForkPayload; createdAt: number };

async function savePendingPayload(tabId: number, payload: ForkPayload): Promise<void> {
  await chrome.storage.session.set({
    [pendingPayloadKey(tabId)]: { payload, createdAt: Date.now() } satisfies StoredPayload,
  });
}

function generateCleanFallbackTitle(messages: { role: string; text?: string }[], forkedAtIndex: number): string {
  const userMsgs = messages.filter((m) => m.role === "user");
  const targetMsg = userMsgs[userMsgs.length - 1] || messages[messages.length - 1];
  if (!targetMsg || !targetMsg.text?.trim()) {
    return `Branch #${forkedAtIndex + 1}`;
  }

  let text = targetMsg.text.trim();
  // Strip code blocks and markdown formatting
  text = text.replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, "");
  // Remove common conversational prefixes
  text = text.replace(/^(hey|hi|hello|please|can you|could you|help me|how do i|how to|what is|why is|explain)\b\s*/i, "");
  text = text.replace(/^(i want to|i am trying to|i need to|i am working on|we need to)\b\s*/i, "");
  text = text.replace(/[^\w\s-]/g, " ").replace(/\s+/g, " ").trim();

  const words = text.split(" ").filter((w) => w.length > 1).slice(0, 5);
  if (words.length >= 2) {
    return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
  }

  return `Branch Turn #${forkedAtIndex + 1}`;
}

async function getOrCreateParent(options: ForkOptions): Promise<BranchNode | null> {
  if (options.parentNodeId) {
    return (await db.nodes.get(options.parentNodeId)) || null;
  }
  if (!options.sourceChat) return null;

  const existing = await findNodeByChat(
    options.sourceChat.site,
    options.sourceChat.conversationId
  );
  if (existing) return existing;

  // A conversation can predate Forkline. Represent it once as a root so all
  // subsequently-created forks have a stable, visible parent.
  let rootLabel = options.sourceChat.title;
  if (!rootLabel || rootLabel.toLowerCase().includes("conversation") || rootLabel.toLowerCase() === "new chat") {
    try {
      const settings = await getSettings();
      if (await isGeminiConfigured(settings)) {
        const firstExchange = options.messages.slice(0, 4).map((m) => `[${m.role}]: ${m.text}`).join("\n\n");
        const rootAiTitle = await nameBranchWithGemini(firstExchange, settings);
        if (rootAiTitle) rootLabel = rootAiTitle;
      }
    } catch {}
  }

  const root: BranchNode = {
    id: crypto.randomUUID(),
    parentId: null,
    chat: options.sourceChat,
    forkedAtIndex: null,
    label: rootLabel || options.sourceChat.title || `${options.sourceChat.site} conversation`,
    tags: [options.sourceChat.site, "source"],
    tokenEstimate: 0,
    compaction: "none",
    excludedIndexes: [],
    createdAt: Date.now(),
  };
  await saveNode(root);
  return root;
}

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

  if (!targetSites.length || targetSites.some((site) => !ADAPTERS.some((adapter) => adapter.site === site))) {
    throw new Error("Choose at least one supported target site.");
  }

  const parent = await getOrCreateParent(options);

  // Filter messages up to forkedAtIndex
  const messagesToFork = messages.filter((m) => m.index <= forkedAtIndex);

  let summaryText: string | undefined = undefined;
  let activeMessages = messagesToFork;

  // Perform compaction if requested (intelligently compress older turns with Gemini LLM or Nano)
  if (compaction === "summary") {
    const plan = prepareCompaction(messagesToFork, settings.compactKeepRecent);
    if (plan.olderMessages.length > 0) {
      if (await isGeminiConfigured(settings)) {
        const geminiSummary = await summarizeWithGemini(plan.textToSummarize, "compact", settings);
        summaryText = geminiSummary || fallbackSummarize(plan);
      } else if (settings.useGeminiNano && (await nanoAvailable())) {
        const nanoSummary = await summarizeNano(plan.textToSummarize, "compact");
        summaryText = nanoSummary || fallbackSummarize(plan);
      } else if (settings.cloudProxyUrl) {
        const remoteSummary = await summarizeRemote(plan.textToSummarize, "compact", settings);
        summaryText = remoteSummary || fallbackSummarize(plan);
      } else {
        summaryText = fallbackSummarize(plan);
      }
      activeMessages = plan.recentMessages;
    }
  }

  // Build formatted context and full text immediately
  const { fullText, contextText, primer } = buildForkMessage(activeMessages, {
    excludedIndexes,
    summary: summaryText,
    template: options.primerTemplate || settings.primerTemplate,
  });

  const tokenEstimate = estimateTokens(fullText);

  // Resolve proper branch title: use user custom title or generate with Gemini LLM
  let branchTitle = options.label?.trim();

  if (!branchTitle) {
    if (await isGeminiConfigured(settings)) {
      // Feed the last relevant turns into Gemini for crisp, accurate branch titling
      const titleContext = messagesToFork
        .slice(-6)
        .map((m) => `[${m.role === "user" ? "User" : "Assistant"}]: ${m.text}`)
        .join("\n\n");
      const aiTitle = await nameBranchWithGemini(titleContext, settings);
      if (aiTitle) {
        branchTitle = aiTitle;
      }
    } else if (settings.useGeminiNano && (await nanoAvailable())) {
      const aiTitle = await nameBranchNano(contextText);
      if (aiTitle) {
        branchTitle = aiTitle;
      }
    } else if (settings.cloudProxyUrl) {
      const aiTitle = await nameBranchRemote(contextText, settings);
      if (aiTitle) {
        branchTitle = aiTitle;
      }
    }

    if (!branchTitle) {
      branchTitle = generateCleanFallbackTitle(messagesToFork, forkedAtIndex);
    }
  }

  // Iterate over all target sites (immediate tab creation without blocking)
  for (const targetSite of targetSites) {
    const nodeId = crypto.randomUUID();
    createdNodeIds.push(nodeId);

    const node: BranchNode = {
      id: nodeId,
      parentId: parent?.id || null,
      groupId: parent?.groupId || options.groupId || null,
      chat: null,
      forkedAtIndex,
      label: targetSites.length > 1 ? `${branchTitle} (${targetSite})` : branchTitle,
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

    // Create a neutral tab first, persist its payload, then navigate. Creating
    // directly at the provider URL races its document_idle content script.
    const tab = await chrome.tabs.create({ url: "about:blank", active: createdTabIds.length === 0 });
    if (tab.id) {
      await savePendingPayload(tab.id, payload);
      await chrome.tabs.update(tab.id, { url: targetUrl });
      createdTabIds.push(tab.id);
    }
  }

  // Multi-model tab grouping
  if (createdTabIds.length > 1 && chrome.tabGroups) {
    try {
      const groupId = await chrome.tabs.group({ tabIds: createdTabIds });
      await chrome.tabGroups.update(groupId, {
        title: `Forkline: ${branchTitle.slice(0, 24)}`,
        color: "grey",
      });
    } catch (err) {
      console.debug("[Forkline] Could not group tabs:", err);
    }
  }

  return { nodeIds: createdNodeIds };
}

export async function getPendingPayload(tabId: number): Promise<ForkPayload | null> {
  const key = pendingPayloadKey(tabId);
  const stored = (await chrome.storage.session.get(key))[key] as StoredPayload | undefined;
  if (!stored || Date.now() - stored.createdAt > PENDING_PAYLOAD_TTL_MS) {
    await chrome.storage.session.remove(key);
    return null;
  }
  return stored.payload;
}

export async function acknowledgePendingPayload(tabId: number): Promise<void> {
  await chrome.storage.session.remove(pendingPayloadKey(tabId));
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
