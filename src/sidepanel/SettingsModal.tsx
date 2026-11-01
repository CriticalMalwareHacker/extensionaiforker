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
    }, 1000);
  };

  const handleClearAll = async () => {
    if (confirm("Are you sure you want to delete all branches and reset Forkline? This cannot be undone.")) {
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
        backgroundColor: "rgba(15, 23, 42, 0.8)",
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
          backgroundColor: "#0f172a",
          border: "1px solid #334155",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "520px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
          color: "#f8fafc",
          fontFamily: "system-ui, sans-serif",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid #334155",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontWeight: "600", fontSize: "15px" }}>Forkline Settings</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "18px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Default Target */}
          <div>
            <label style={{ fontSize: "13px", fontWeight: "600", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
              Default Target Site:
            </label>
            <select
              value={settings.defaultTargetSite}
              onChange={(e) => setSettings({ ...settings, defaultTargetSite: e.target.value as any })}
              style={{
                width: "100%",
                padding: "8px 10px",
                backgroundColor: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "6px",
                color: "#f1f5f9",
                fontSize: "13px",
              }}
            >
              <option value="same">Same site as source chat</option>
              <option value="chatgpt">ChatGPT</option>
              <option value="claude">Claude</option>
              <option value="gemini">Gemini</option>
            </select>
          </div>

          {/* Primer template */}
          <div>
            <label style={{ fontSize: "13px", fontWeight: "600", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
              Fork Primer Template:
            </label>
            <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "6px" }}>
              Must include <code>{"{CONTEXT}"}</code> placeholder where prior conversation turns are inserted.
            </div>
            <textarea
              value={settings.primerTemplate}
              onChange={(e) => setSettings({ ...settings, primerTemplate: e.target.value })}
              rows={5}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "8px 10px",
                backgroundColor: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "6px",
                color: "#f1f5f9",
                fontSize: "11px",
                fontFamily: "monospace",
              }}
            />
          </div>

          {/* Smart Compaction Turns */}
          <div>
            <label style={{ fontSize: "13px", fontWeight: "600", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
              Compaction: Keep Recent Turns Verbatim:
            </label>
            <input
              type="number"
              min={2}
              max={20}
              value={settings.compactKeepRecent}
              onChange={(e) => setSettings({ ...settings, compactKeepRecent: Number(e.target.value) })}
              style={{
                width: "80px",
                padding: "6px 10px",
                backgroundColor: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "6px",
                color: "#f1f5f9",
                fontSize: "13px",
              }}
            />
          </div>

          {/* Gemini Nano Built-in AI */}
          <div style={{ backgroundColor: "#1e293b", padding: "12px", borderRadius: "8px", border: "1px solid #334155" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={settings.useGeminiNano}
                onChange={(e) => setSettings({ ...settings, useGeminiNano: e.target.checked })}
              />
              <div>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#f8fafc", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Cpu size={14} color="#38bdf8" /> Use Chrome Built-in AI (Gemini Nano)
                </div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                  Runs entirely on-device for instantaneous auto-naming and summarization. 100% private.
                </div>
              </div>
            </label>
          </div>

          {/* Cloud Run Proxy Fallback */}
          <div>
            <label style={{ fontSize: "13px", fontWeight: "600", color: "#cbd5e1", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <Cloud size={14} color="#a855f7" /> Cloud Run Gemini Proxy (Optional Fallback):
            </label>
            <input
              type="text"
              placeholder="https://forkline-proxy-xyz.a.run.app"
              value={settings.cloudProxyUrl || ""}
              onChange={(e) => setSettings({ ...settings, cloudProxyUrl: e.target.value })}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "8px 10px",
                backgroundColor: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "6px",
                color: "#f1f5f9",
                fontSize: "12px",
                marginBottom: "8px",
              }}
            />
            <input
              type="password"
              placeholder="Optional Bearer token"
              value={settings.cloudProxyToken || ""}
              onChange={(e) => setSettings({ ...settings, cloudProxyToken: e.target.value })}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "8px 10px",
                backgroundColor: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "6px",
                color: "#f1f5f9",
                fontSize: "12px",
              }}
            />
          </div>

          {/* Reset / Delete data */}
          <div style={{ paddingTop: "12px", borderTop: "1px solid #334155" }}>
            <button
              onClick={handleClearAll}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "transparent",
                color: "#ef4444",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              <Trash2 size={13} />
              Delete All Local Branch Data
            </button>
          </div>
        </div>

        <div
          style={{
            padding: "12px 18px",
            borderTop: "1px solid #334155",
            display: "flex",
            justifyContent: "flex-end",
            gap: "8px",
            backgroundColor: "#0b1120",
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "#1e293b",
              color: "#94a3b8",
              border: "1px solid #334155",
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
              background: saved ? "#10b981" : "#0284c7",
              color: "white",
              border: "none",
              borderRadius: "6px",
              padding: "6px 16px",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {saved ? <Check size={14} /> : <Save size={14} />}
            {saved ? "Saved" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};
