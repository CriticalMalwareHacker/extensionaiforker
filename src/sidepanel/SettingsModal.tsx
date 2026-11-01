import React, { useState, useEffect } from "react";
import { ForklineSettings } from "../shared/types";
import { getSettings, saveSetting, db } from "../background/db";
import { X, Save, Trash2, Cpu, Cloud, Check } from "lucide-react";

interface SettingsModalProps {
  onClose: () => void;
  onDataReset: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onDataReset }) => {
  const [settings, setSettings] = useState<ForklineSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  if (!settings) return null;

  const handleSave = async () => {
    for (const [key, val] of Object.entries(settings)) {
      await saveSetting(key as any, val);
    }
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  const handleClearAll = async () => {
    if (confirm("Delete all branches and reset local database? This cannot be undone.")) {
      await db.nodes.clear();
      onDataReset();
      onClose();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
      }}
    >
      <div
        style={{
          backgroundColor: "#09090b",
          border: "1px solid #27272a",
          borderRadius: "10px",
          width: "100%",
          maxWidth: "480px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.9)",
          color: "#fafafa",
          fontFamily: "'Inter', sans-serif",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid #18181b",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontWeight: "600", fontSize: "14px", letterSpacing: "-0.2px" }}>Settings</span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#71717a", cursor: "pointer", padding: "4px" }}
          >
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: "18px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Target Site */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: "500", color: "#e4e4e7", display: "block", marginBottom: "6px" }}>
              Default Target Platform
            </label>
            <select
              value={settings.defaultTargetSite}
              onChange={(e) => setSettings({ ...settings, defaultTargetSite: e.target.value as any })}
              style={{
                width: "100%",
                padding: "7px 10px",
                backgroundColor: "#000000",
                border: "1px solid #27272a",
                borderRadius: "6px",
                color: "#f4f4f5",
                fontSize: "12px",
                fontFamily: "inherit",
                outline: "none",
              }}
            >
              <option value="same">Same site as current conversation</option>
              <option value="chatgpt">ChatGPT</option>
              <option value="claude">Claude</option>
              <option value="gemini">Gemini</option>
            </select>
          </div>

          {/* Primer template */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: "500", color: "#e4e4e7", display: "block", marginBottom: "4px" }}>
              Fork Primer Template
            </label>
            <div style={{ fontSize: "11px", color: "#71717a", marginBottom: "6px" }}>
              Must include <code>{"{CONTEXT}"}</code> placeholder.
            </div>
            <textarea
              value={settings.primerTemplate}
              onChange={(e) => setSettings({ ...settings, primerTemplate: e.target.value })}
              rows={4}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "8px 10px",
                backgroundColor: "#000000",
                border: "1px solid #27272a",
                borderRadius: "6px",
                color: "#f4f4f5",
                fontSize: "11px",
                fontFamily: "monospace",
                outline: "none",
              }}
            />
          </div>

          {/* Compaction count */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: "500", color: "#e4e4e7", display: "block", marginBottom: "6px" }}>
              Compaction: Keep Recent Turns Verbatim
            </label>
            <input
              type="number"
              min={2}
              max={20}
              value={settings.compactKeepRecent}
              onChange={(e) => setSettings({ ...settings, compactKeepRecent: Number(e.target.value) })}
              style={{
                width: "70px",
                padding: "5px 8px",
                backgroundColor: "#000000",
                border: "1px solid #27272a",
                borderRadius: "6px",
                color: "#f4f4f5",
                fontSize: "12px",
                fontFamily: "inherit",
                outline: "none",
              }}
            />
          </div>

          {/* On-device Gemini Nano */}
          <div style={{ backgroundColor: "#000000", padding: "12px", borderRadius: "6px", border: "1px solid #18181b" }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={settings.useGeminiNano}
                onChange={(e) => setSettings({ ...settings, useGeminiNano: e.target.checked })}
                style={{ marginTop: "2px" }}
              />
              <div>
                <div style={{ fontSize: "12px", fontWeight: "500", color: "#fafafa", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Cpu size={13} /> On-Device AI (Gemini Nano)
                </div>
                <div style={{ fontSize: "11px", color: "#71717a", marginTop: "2px" }}>
                  Uses Chrome built-in Prompt API when available. 100% private and on-device.
                </div>
              </div>
            </label>
          </div>

          {/* Cloud Run Fallback */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: "500", color: "#e4e4e7", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <Cloud size={13} /> Cloud Run Proxy (Optional Fallback)
            </label>
            <input
              type="url"
              placeholder="https://forkline-proxy.run.app"
              value={settings.cloudProxyUrl || ""}
              onChange={(e) => setSettings({ ...settings, cloudProxyUrl: e.target.value })}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "7px 10px",
                backgroundColor: "#000000",
                border: "1px solid #27272a",
                borderRadius: "6px",
                color: "#f4f4f5",
                fontSize: "12px",
                fontFamily: "inherit",
                marginBottom: "8px",
                outline: "none",
              }}
            />
            <input
              type="password"
              placeholder="Proxy bearer token"
              value={settings.cloudProxyToken || ""}
              onChange={(e) => setSettings({ ...settings, cloudProxyToken: e.target.value })}
              autoComplete="off"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "7px 10px",
                backgroundColor: "#000000",
                border: "1px solid #27272a",
                borderRadius: "6px",
                color: "#f4f4f5",
                fontSize: "12px",
                fontFamily: "inherit",
                outline: "none",
              }}
            />
            <div style={{ fontSize: "11px", color: "#71717a", marginTop: "6px", lineHeight: 1.45 }}>
              Use an HTTPS endpoint and its bearer token. Conversation text is sent only when this fallback is enabled.
            </div>
          </div>

          {/* Reset button */}
          <div style={{ paddingTop: "12px", borderTop: "1px solid #18181b" }}>
            <button
              onClick={handleClearAll}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: "transparent",
                color: "#71717a",
                border: "1px solid #27272a",
                borderRadius: "6px",
                padding: "5px 10px",
                fontSize: "11px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = "#ef4444";
                (e.currentTarget as HTMLElement).style.borderColor = "#7f1d1d";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = "#71717a";
                (e.currentTarget as HTMLElement).style.borderColor = "#27272a";
              }}
            >
              <Trash2 size={12} />
              Reset Local Database
            </button>
          </div>
        </div>

        <div
          style={{
            padding: "12px 18px",
            borderTop: "1px solid #18181b",
            display: "flex",
            justifyContent: "flex-end",
            gap: "8px",
            backgroundColor: "#000000",
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              color: "#a1a1aa",
              border: "1px solid #27272a",
              borderRadius: "6px",
              padding: "6px 12px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              background: "#ffffff",
              color: "#000000",
              border: "none",
              borderRadius: "6px",
              padding: "6px 14px",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {saved ? <Check size={13} /> : <Save size={13} />}
            {saved ? "Saved" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};
