import React, { useState, useEffect } from "react";
import { BranchNode } from "../shared/types";
import { buildMergeInsertText } from "../core/merge";
import { GitMerge, X, Copy, Check, Sparkles } from "lucide-react";

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
      // Auto-request summary from background
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
          maxWidth: "480px",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
          color: "#f8fafc",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid #334155",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600" }}>
            <GitMerge size={18} color="#a855f7" />
            <span>Merge Branch into Parent</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ fontSize: "12px", color: "#94a3b8" }}>
            Merging <b>"{branchNode.label}"</b> back into parent chat:{" "}
            <b>{parentNode?.label || "Root Conversation"}</b>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#cbd5e1" }}>
                Branch Summary:
              </label>
              {isGenerating && (
                <span style={{ fontSize: "11px", color: "#38bdf8", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Sparkles size={12} /> Generating with Gemini...
                </span>
              )}
            </div>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Summarize the conclusions and solutions developed in this branch..."
              rows={4}
              style={{
                width: "100%",
                boxSizing: "border-box",
                backgroundColor: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "6px",
                padding: "8px 10px",
                color: "#f1f5f9",
                fontSize: "12px",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#cbd5e1" }}>
                Preview to Insert:
              </label>
              <button
                onClick={handleCopy}
                style={{
                  background: "none",
                  border: "none",
                  color: copied ? "#10b981" : "#38bdf8",
                  fontSize: "11px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre
              style={{
                margin: 0,
                padding: "8px 10px",
                backgroundColor: "#090d16",
                border: "1px solid #1e293b",
                borderRadius: "6px",
                fontSize: "11px",
                color: "#94a3b8",
                whiteSpace: "pre-wrap",
                maxHeight: "120px",
                overflowY: "auto",
              }}
            >
              {formattedInsert}
            </pre>
          </div>
        </div>

        <div
          style={{
            padding: "12px 16px",
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
            onClick={handleMerge}
            style={{
              background: "#7c3aed",
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
            <GitMerge size={14} />
            Complete Merge
          </button>
        </div>
      </div>
    </div>
  );
};
