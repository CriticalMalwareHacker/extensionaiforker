import React, { useState, useEffect } from "react";
import { BranchNode } from "../shared/types";
import { buildMergeInsertText } from "../core/merge";
import { GitMerge, X, Copy, Check } from "lucide-react";

interface MergeModalProps {
  branchNode: BranchNode;
  parentNode: BranchNode | null;
  onClose: () => void;
  onConfirmMerge: (nodeId: string, summary: string, formattedText: string) => Promise<void>;
}

export const MergeModal: React.FC<MergeModalProps> = ({
  branchNode,
  parentNode,
  onClose,
  onConfirmMerge,
}) => {
  const [summary, setSummary] = useState(branchNode.summary || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!summary) {
      setIsGenerating(true);
      chrome.runtime.sendMessage(
        {
          type: "SUMMARIZE_REQUEST",
          text: `Branch: ${branchNode.label}. Forked at turn ${branchNode.forkedAtIndex}.`,
          mode: "merge",
        },
        (res) => {
          setIsGenerating(false);
          if (res?.summary) {
            setSummary(res.summary);
          } else {
            setSummary(
              `Completed exploration of ${branchNode.label}. Key decisions and insights ready to integrate into parent conversation.`
            );
          }
        }
      );
    }
  }, [branchNode]);

  const formattedInsert = buildMergeInsertText(summary, branchNode.label);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(formattedInsert);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMerge = async () => {
    await onConfirmMerge(branchNode.id, summary, formattedInsert);
    onClose();
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
          maxWidth: "460px",
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
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "650", fontSize: "15px" }}>
            <GitMerge size={16} />
            <span>Merge Branch</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--fl-muted, #9a9a9a)",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              borderRadius: "999px",
            }}
          >
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ fontSize: "12px", color: "var(--fl-muted, #9a9a9a)", lineHeight: "1.5" }}>
            Synthesize key insights from <strong style={{ color: "var(--fl-text, #f0f0f0)" }}>{branchNode.label}</strong> to paste into{" "}
            {parentNode ? (
              <strong style={{ color: "var(--fl-text, #f0f0f0)" }}>{parentNode.label}</strong>
            ) : (
              "parent chat"
            )}
            .
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--fl-text, #f0f0f0)" }}>
                Branch Summary
              </label>
              {isGenerating && (
                <span style={{ fontSize: "11px", color: "var(--fl-muted, #9a9a9a)" }}>
                  Generating summary...
                </span>
              )}
            </div>

            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={4}
              placeholder="Summary of exploration findings..."
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px 12px",
                backgroundColor: "var(--fl-canvas, #151515)",
                border: "1px solid var(--fl-border, #303030)",
                borderRadius: "12px",
                color: "var(--fl-text, #f0f0f0)",
                fontSize: "12px",
                fontFamily: "inherit",
                lineHeight: "1.5",
                outline: "none",
                resize: "vertical",
              }}
            />
          </div>

          <div>
            <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--fl-muted, #9a9a9a)", marginBottom: "6px" }}>
              Preview (Will be copied to clipboard):
            </div>
            <pre
              style={{
                margin: 0,
                padding: "10px 12px",
                backgroundColor: "var(--fl-canvas, #151515)",
                border: "1px solid var(--fl-border, #303030)",
                borderRadius: "12px",
                color: "var(--fl-muted, #9a9a9a)",
                fontSize: "10px",
                fontFamily: "monospace",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                maxHeight: "100px",
                overflowY: "auto",
              }}
            >
              {formattedInsert}
            </pre>
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
            onClick={handleCopy}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "transparent",
              color: "var(--fl-muted, #9a9a9a)",
              border: "1px solid var(--fl-border, #303030)",
              borderRadius: "999px",
              padding: "7px 14px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy to Clipboard"}
          </button>

          <button
            onClick={handleMerge}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#ffffff",
              color: "#000000",
              border: "none",
              borderRadius: "999px",
              padding: "7px 18px",
              fontSize: "12px",
              fontWeight: "650",
              cursor: "pointer",
            }}
          >
            <GitMerge size={12} />
            Merge & Switch
          </button>
        </div>
      </div>
    </div>
  );
};
