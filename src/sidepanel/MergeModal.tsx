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
          maxWidth: "460px",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.9)",
          color: "#fafafa",
          fontFamily: "'Inter', sans-serif",
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
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", fontSize: "14px" }}>
            <GitMerge size={15} />
            <span>Merge Branch</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#71717a",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ fontSize: "12px", color: "#a1a1aa", lineHeight: "1.5" }}>
            Merge insights from <b style={{ color: "#fafafa" }}>"{branchNode.label}"</b> back into{" "}
            <b style={{ color: "#fafafa" }}>{parentNode?.label || "Root Conversation"}</b>.
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: "500", color: "#e4e4e7" }}>
                Branch Summary
              </label>
              {isGenerating && (
                <span style={{ fontSize: "11px", color: "#a1a1aa" }}>
                  Generating...
                </span>
              )}
            </div>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Summarize conclusions and solutions..."
              rows={4}
              style={{
                width: "100%",
                boxSizing: "border-box",
                backgroundColor: "#000000",
                border: "1px solid #27272a",
                borderRadius: "6px",
                padding: "8px 10px",
                color: "#f4f4f5",
                fontSize: "12px",
                resize: "vertical",
                fontFamily: "inherit",
                outline: "none",
              }}
            />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: "500", color: "#e4e4e7" }}>
                Formatted Update
              </label>
              <button
                onClick={handleCopy}
                style={{
                  background: "none",
                  border: "none",
                  color: copied ? "#ffffff" : "#a1a1aa",
                  fontSize: "11px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre
              style={{
                margin: 0,
                padding: "8px 10px",
                backgroundColor: "#000000",
                border: "1px solid #18181b",
                borderRadius: "6px",
                fontSize: "11px",
                color: "#71717a",
                whiteSpace: "pre-wrap",
                maxHeight: "100px",
                overflowY: "auto",
                fontFamily: "monospace",
              }}
            >
              {formattedInsert}
            </pre>
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
            onClick={handleMerge}
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
            <GitMerge size={13} />
            Complete Merge
          </button>
        </div>
      </div>
    </div>
  );
};
