import Dexie, { Table } from "dexie";
import { BranchNode, BranchGroup, ForklineSettings } from "../shared/types";
import { DEFAULT_PRIMER_TEMPLATE } from "../core/primer";

export class ForklineDatabase extends Dexie {
  nodes!: Table<BranchNode, string>;
  groups!: Table<BranchGroup, string>;
  settings!: Table<{ key: string; value: any }, string>;

  constructor() {
    super("ForklineDB");
    this.version(1).stores({
      nodes: "id, parentId, createdAt, label, [chat.site+chat.conversationId]",
      settings: "key",
    });

    // Version 2: add groups and groupId index on nodes
    this.version(2).stores({
      nodes: "id, parentId, groupId, createdAt, label, [chat.site+chat.conversationId]",
      groups: "id, name, createdAt",
      settings: "key",
    });
  }
}

export const db = new ForklineDatabase();

export const DEFAULT_SETTINGS: ForklineSettings = {
  defaultTargetSite: "same",
  primerTemplate: DEFAULT_PRIMER_TEMPLATE,
  compactKeepRecent: 6,
  useGeminiNano: true,
  geminiApiKey: (typeof process !== "undefined" && (process.env?.GEMINI_API_KEY || process.env?.VITE_GEMINI_API_KEY)) || "",
  geminiModel: (typeof process !== "undefined" && (process.env?.GEMINI_MODEL || process.env?.VITE_GEMINI_MODEL)) || "gemini-2.0-flash",
  cloudProxyUrl: "",
  cloudProxyToken: "",
};

export async function getSettings(): Promise<ForklineSettings> {
  try {
    const records = await db.settings.toArray();
    const map = new Map(records.map((r) => [r.key, r.value]));
    return {
      defaultTargetSite: map.get("defaultTargetSite") ?? DEFAULT_SETTINGS.defaultTargetSite,
      primerTemplate: map.get("primerTemplate") ?? DEFAULT_SETTINGS.primerTemplate,
      compactKeepRecent: map.get("compactKeepRecent") ?? DEFAULT_SETTINGS.compactKeepRecent,
      useGeminiNano: map.get("useGeminiNano") ?? DEFAULT_SETTINGS.useGeminiNano,
      geminiApiKey: map.get("geminiApiKey") ?? DEFAULT_SETTINGS.geminiApiKey,
      geminiModel: map.get("geminiModel") ?? DEFAULT_SETTINGS.geminiModel,
      cloudProxyUrl: map.get("cloudProxyUrl") ?? DEFAULT_SETTINGS.cloudProxyUrl,
      cloudProxyToken: map.get("cloudProxyToken") ?? DEFAULT_SETTINGS.cloudProxyToken,
    };
  } catch (err) {
    console.error("[Forkline DB] Failed to get settings, returning defaults:", err);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSetting<K extends keyof ForklineSettings>(
  key: K,
  value: ForklineSettings[K]
): Promise<void> {
  await db.settings.put({ key, value });
}

export async function getAllNodes(): Promise<BranchNode[]> {
  return await db.nodes.orderBy("createdAt").reverse().toArray();
}

export async function saveNode(node: BranchNode): Promise<void> {
  await db.nodes.put(node);
}

export async function renameNode(nodeId: string, newLabel: string): Promise<void> {
  await db.nodes.update(nodeId, { label: newLabel.trim() });
}

export async function deleteNode(id: string): Promise<void> {
  await db.transaction("rw", db.nodes, async () => {
    const children = await db.nodes.where("parentId").equals(id).toArray();
    for (const child of children) {
      await db.nodes.update(child.id, { parentId: null });
    }
    await db.nodes.delete(id);
  });
}

export async function getAllGroups(): Promise<BranchGroup[]> {
  return await db.groups.orderBy("createdAt").toArray();
}

export async function createGroup(name: string): Promise<BranchGroup> {
  const group: BranchGroup = {
    id: crypto.randomUUID(),
    name: name.trim(),
    createdAt: Date.now(),
  };
  await db.groups.put(group);
  return group;
}

export async function deleteGroup(groupId: string): Promise<void> {
  await db.transaction("rw", db.groups, db.nodes, async () => {
    await db.groups.delete(groupId);
    // Unassign nodes from this group
    const assignedNodes = await db.nodes.where("groupId").equals(groupId).toArray();
    for (const node of assignedNodes) {
      await db.nodes.update(node.id, { groupId: null });
    }
  });
}

export async function assignNodeToGroup(nodeId: string, groupId: string | null): Promise<void> {
  await db.nodes.update(nodeId, { groupId });
}

export async function findNodeByChat(
  site: string,
  conversationId: string
): Promise<BranchNode | undefined> {
  return await db.nodes
    .filter((n) => n.chat?.site === site && n.chat?.conversationId === conversationId)
    .first();
}
