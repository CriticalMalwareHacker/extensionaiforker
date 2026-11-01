import { ForklineSettings } from "../shared/types";
import { getSettings } from "../background/db";

export async function summarizeRemote(
  text: string,
  mode: "compact" | "merge" = "compact",
  customSettings?: ForklineSettings
): Promise<string | null> {
  const settings = customSettings || (await getSettings());
  if (!settings.cloudProxyUrl) {
    return null;
  }

  try {
    const url = new URL("/v1/compact", settings.cloudProxyUrl).toString();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (settings.cloudProxyToken) {
      headers["Authorization"] = `Bearer ${settings.cloudProxyToken}`;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ text, mode }),
    });

    if (!res.ok) {
      console.warn(`[Forkline Remote] Proxy returned ${res.status}`);
      return null;
    }

    const data = await res.json();
    return data.summary || null;
  } catch (err) {
    console.warn("[Forkline Remote] Proxy request failed:", err);
    return null;
  }
}

export async function nameBranchRemote(
  contextText: string,
  customSettings?: ForklineSettings
): Promise<string | null> {
  const settings = customSettings || (await getSettings());
  if (!settings.cloudProxyUrl) {
    return null;
  }

  try {
    const url = new URL("/v1/title", settings.cloudProxyUrl).toString();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (settings.cloudProxyToken) {
      headers["Authorization"] = `Bearer ${settings.cloudProxyToken}`;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ text: contextText.slice(0, 4000) }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.title || null;
  } catch (err) {
    console.warn("[Forkline Remote] Remote title request failed:", err);
    return null;
  }
}
