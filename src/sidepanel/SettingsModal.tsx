import React, { useState, useEffect } from "react";
import { ForklineSettings } from "../shared/types";
import { getSettings, saveSetting, db } from "../background/db";
import { X, Save, Trash2, Cpu, Cloud, Check, Sparkles, Eye, EyeOff } from "lucide-react";

interface SettingsModalProps {
  onClose: () => void;
  onDataReset: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onDataReset }) => {
  const [settings, setSettings] = useState<ForklineSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const envApiKey = typeof process !== "undefined" && process.env?.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";
  const envModel = typeof process !== "undefined" && process.env?.GEMINI_MODEL ? process.env.GEMINI_MODEL.trim() : "gemini-2.0-flash";

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
        backgroundColor: "rgba(0, 0, 0, 0.72)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
      }}
    >
      <div
        style={{
          backgroundColor: "var(--fl-surface, #1d1d1d)",
          border: "1px solid var(--fl-border, #303030)",
          borderRadius: "18px",
          width: "100%",
          maxWidth: "480px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 28px 70px rgba(0, 0, 0, 0.7)",
          color: "var(--fl-text, #f0f0f0)",
          fontFamily: "'Inter', sans-serif",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--fl-border, #303030)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontWeight: "650", fontSize: "15px", letterSpacing: "-0.2px" }}>Settings</span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--fl-muted, #9a9a9a)", cursor: "pointer", padding: "4px", borderRadius: "999px" }}
          >
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: "18px 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Target Site */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--fl-text, #f0f0f0)", display: "block", marginBottom: "6px" }}>
              Default Target Platform
            </label>
            <select
              value={settings.defaultTargetSite}
              onChange={(e) => setSettings({ ...settings, defaultTargetSite: e.target.value as any })}
              style={{
                width: "100%",
                padding: "8px 12px",
                backgroundColor: "var(--fl-canvas, #151515)",
                border: "1px solid var(--fl-border, #303030)",
                borderRadius: "10px",
                color: "var(--fl-text, #f0f0f0)",
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
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--fl-text, #f0f0f0)", display: "block", marginBottom: "4px" }}>
              Fork Primer Template
            </label>
            <div style={{ fontSize: "11px", color: "var(--fl-muted, #9a9a9a)", marginBottom: "6px" }}>
              Must include <code>{"{CONTEXT}"}</code> placeholder.
            </div>
            <textarea
              value={settings.primerTemplate}
              onChange={(e) => setSettings({ ...settings, primerTemplate: e.target.value })}
              rows={4}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "8px 12px",
                backgroundColor: "var(--fl-canvas, #151515)",
                border: "1px solid var(--fl-border, #303030)",
                borderRadius: "10px",
                color: "var(--fl-text, #f0f0f0)",
                fontSize: "11px",
                fontFamily: "monospace",
                outline: "none",
              }}
            />
          </div>

          {/* Compaction count */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--fl-text, #f0f0f0)", display: "block", marginBottom: "6px" }}>
              Compaction: Keep Recent Turns Verbatim
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
                backgroundColor: "var(--fl-canvas, #151515)",
                border: "1px solid var(--fl-border, #303030)",
                borderRadius: "10px",
                color: "var(--fl-text, #f0f0f0)",
                fontSize: "12px",
                fontFamily: "inherit",
                outline: "none",
              }}
            />
          </div>

          {/* Google Gemini Long-Context LLM */}
          <div style={{ backgroundColor: "var(--fl-canvas, #151515)", padding: "14px 16px", borderRadius: "14px", border: "1px solid var(--fl-border, #303030)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: "650", color: "var(--fl-text, #f0f0f0)", display: "flex", alignItems: "center", gap: "6px", margin: 0 }}>
                <Sparkles size={14} style={{ color: "#a855f7" }} /> Google Gemini LLM
              </label>
              {envApiKey ? (
                <span style={{ fontSize: "10px", background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "2px 7px", borderRadius: "999px", border: "1px solid rgba(16, 185, 129, 0.3)", fontWeight: "600" }}>
                  .env active
                </span>
              ) : null}
            </div>

            <div style={{ fontSize: "11px", color: "var(--fl-muted, #9a9a9a)", marginBottom: "10px", lineHeight: 1.45 }}>
              Powers long-context compaction (1M+ tokens), smart merge synthesis, and automatic branch titling.
            </div>

            <div style={{ position: "relative", marginBottom: "8px" }}>
              <input
                type={showApiKey ? "text" : "password"}
                placeholder={envApiKey ? `Using .env key (${envApiKey.slice(0, 6)}...${envApiKey.slice(-4)})` : "Gemini API key (AIzaSy...)"}
                value={settings.geminiApiKey || ""}
                onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
                autoComplete="off"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "8px 36px 8px 12px",
                  backgroundColor: "var(--fl-surface, #1d1d1d)",
                  border: "1px solid var(--fl-border, #303030)",
                  borderRadius: "10px",
                  color: "var(--fl-text, #f0f0f0)",
                  fontSize: "12px",
                  fontFamily: "monospace",
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                style={{
                  position: "absolute",
                  right: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--fl-muted, #9a9a9a)",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                }}
                title={showApiKey ? "Hide API key" : "Show API key"}
              >
                {showApiKey ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>

            <div style={{ marginBottom: "8px" }}>
              <label style={{ fontSize: "11px", color: "var(--fl-muted, #9a9a9a)", display: "block", marginBottom: "4px" }}>
                Model
              </label>
              <select
                value={settings.geminiModel || envModel || "gemini-2.0-flash"}
                onChange={(e) => setSettings({ ...settings, geminiModel: e.target.value })}
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  backgroundColor: "var(--fl-surface, #1d1d1d)",
                  border: "1px solid var(--fl-border, #303030)",
                  borderRadius: "10px",
                  color: "var(--fl-text, #f0f0f0)",
                  fontSize: "12px",
                  fontFamily: "inherit",
                  outline: "none",
                }}
              >
                <option value="gemini-2.0-flash">gemini-2.0-flash (Recommended &bull; Ultra-fast &bull; 1M tokens)</option>
                <option value="gemini-1.5-flash">gemini-1.5-flash (Fast &bull; 1M tokens)</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro (Deep reasoning &bull; 2M tokens)</option>
              </select>
            </div>

            <div style={{ fontSize: "11px", color: "var(--fl-muted, #9a9a9a)", lineHeight: 1.4 }}>
              Stored locally in browser storage or loaded from project <code>.env</code>. Get a free API key at{" "}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                style={{ color: "#60a5fa", textDecoration: "none" }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
              >
                Google AI Studio &rarr;
              </a>
            </div>
          </div>

          {/* On-device Gemini Nano */}
          <div style={{ backgroundColor: "var(--fl-canvas, #151515)", padding: "12px 14px", borderRadius: "12px", border: "1px solid var(--fl-border, #303030)" }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={settings.useGeminiNano}
                onChange={(e) => setSettings({ ...settings, useGeminiNano: e.target.checked })}
                style={{ marginTop: "2px", accentColor: "#ffffff" }}
              />
              <div>
                <div style={{ fontSize: "12px", fontWeight: "600", color: "#ffffff", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Cpu size={13} /> On-Device AI (Gemini Nano)
                </div>
                <div style={{ fontSize: "11px", color: "var(--fl-muted, #9a9a9a)", marginTop: "3px" }}>
                  Uses Chrome built-in Prompt API when available. 100% private and on-device.
                </div>
              </div>
            </label>
          </div>

          {/* Cloud Run Fallback */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: "650", color: "var(--fl-text, #f0f0f0)", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
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
                padding: "8px 12px",
                backgroundColor: "var(--fl-canvas, #151515)",
                border: "1px solid var(--fl-border, #303030)",
                borderRadius: "10px",
                color: "var(--fl-text, #f0f0f0)",
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
                padding: "8px 12px",
                backgroundColor: "var(--fl-canvas, #151515)",
                border: "1px solid var(--fl-border, #303030)",
                borderRadius: "10px",
                color: "var(--fl-text, #f0f0f0)",
                fontSize: "12px",
                fontFamily: "inherit",
                outline: "none",
              }}
            />
            <div style={{ fontSize: "11px", color: "var(--fl-muted, #9a9a9a)", marginTop: "6px", lineHeight: 1.45 }}>
              Use an HTTPS endpoint and its bearer token. Conversation text is sent only when this fallback is enabled.
            </div>
          </div>

          {/* Reset button */}
          <div style={{ paddingTop: "12px", borderTop: "1px solid var(--fl-border, #303030)" }}>
            <button
              onClick={handleClearAll}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: "transparent",
                color: "var(--fl-muted, #9a9a9a)",
                border: "1px solid var(--fl-border, #303030)",
                borderRadius: "999px",
                padding: "6px 12px",
                fontSize: "11px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = "#ef4444";
                (e.currentTarget as HTMLElement).style.borderColor = "#7f1d1d";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = "var(--fl-muted, #9a9a9a)";
                (e.currentTarget as HTMLElement).style.borderColor = "var(--fl-border, #303030)";
              }}
            >
              <Trash2 size={12} />
              Reset Local Database
            </button>
          </div>
        </div>

        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--fl-border, #303030)",
            display: "flex",
            justifyContent: "flex-end",
            gap: "8px",
            backgroundColor: "var(--fl-surface, #1d1d1d)",
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              color: "var(--fl-muted, #9a9a9a)",
              border: "1px solid var(--fl-border, #303030)",
              borderRadius: "999px",
              padding: "7px 14px",
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
              borderRadius: "999px",
              padding: "7px 18px",
              fontSize: "12px",
              fontWeight: "650",
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
