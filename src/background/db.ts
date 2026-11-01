import Dexie, { Table } from "dexie";
import { BranchNode, ForklineSettings } from "../shared/types";
import { DEFAULT_PRIMER_TEMPLATE } from "../core/primer";

export class ForklineDatabase extends Dexie {
  nodes!: Table<BranchNode, string>;
  settings!: Table<{ key: string; value: any }, string>;

  constructor() {
    super("ForklineDB");
    this.version(1).stores({
      nodes: "id, parentId, createdAt, label, [chat.site+chat.conversationId]",
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

export async function deleteNode(id: string): Promise<void> {
  await db.transaction("rw", db.nodes, async () => {
    // Also re-link or orphan child nodes
    const children = await db.nodes.where("parentId").equals(id).toArray();
    for (const child of children) {
      await db.nodes.update(child.id, { parentId: null });
    }
    await db.nodes.delete(id);
  });
}

export async function findNodeByChat(
  site: string,
  conversationId: string
): Promise<BranchNode | undefined> {
  return await db.nodes
    .filter((n) => n.chat?.site === site && n.chat?.conversationId === conversationId)
    .first();
}
