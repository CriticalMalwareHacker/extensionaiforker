import React, { memo } from "react";
import { Handle, Position } from "reactflow";
import { BranchNode, Site } from "../shared/types";
import { GitBranch, GitMerge, ExternalLink, Trash2, Cpu, CheckCircle } from "lucide-react";

interface NodeProps {
  data: {
    node: BranchNode;
    isCurrentTab: boolean;
    onSelect: (node: BranchNode) => void;
    onMerge: (node: BranchNode) => void;
    onDelete: (nodeId: string) => void;
  };
}

const SITE_COLORS: Record<Site, { bg: string; text: string; border: string }> = {
  chatgpt: { bg: "#064e3b", text: "#6ee7b7", border: "#10b981" },
  claude: { bg: "#431407", text: "#fdba74", border: "#f97316" },
  gemini: { bg: "#1e1b4b", text: "#c7d2fe", border: "#6366f1" },
};

export const BranchNodeComponent = memo(({ data }: NodeProps) => {
  const { node, isCurrentTab, onSelect, onMerge, onDelete } = data;
  const site = (node.chat?.site || node.tags?.[0] || "chatgpt") as Site;
  const colors = SITE_COLORS[site] || { bg: "#1e293b", text: "#94a3b8", border: "#475569" };

  return (
    <div
      style={{
        backgroundColor: isCurrentTab ? "#1e293b" : "#0f172a",
        border: `2px solid ${isCurrentTab ? "#38bdf8" : colors.border}`,
        borderRadius: "10px",
        padding: "10px 14px",
        width: "240px",
        boxShadow: isCurrentTab
          ? "0 0 15px rgba(56, 189, 248, 0.4)"
          : "0 4px 12px rgba(0, 0, 0, 0.4)",
        color: "#f8fafc",
        fontFamily: "system-ui, sans-serif",
        position: "relative",
        transition: "all 0.2s ease",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: "#94a3b8" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <span
          style={{
            backgroundColor: colors.bg,
            color: colors.text,
            fontSize: "11px",
            fontWeight: "700",
            textTransform: "uppercase",
            padding: "2px 6px",
            borderRadius: "4px",
            letterSpacing: "0.5px",
          }}
        >
          {site}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {node.isMerged && (
            <span title="Merged into parent" style={{ color: "#a855f7", display: "flex" }}>
              <GitMerge size={14} />
            </span>
          )}
          {node.compaction === "summary" && (
            <span title="Smart compacted" style={{ color: "#38bdf8", display: "flex" }}>
              <Cpu size={14} />
            </span>
          )}
          <span style={{ fontSize: "11px", color: "#64748b" }}>
            ~{node.tokenEstimate.toLocaleString()} tkn
          </span>
        </div>
      </div>

      <div
        style={{
          fontSize: "13px",
          fontWeight: "600",
          color: "#f1f5f9",
          marginBottom: "6px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={node.label}
      >
        {node.label}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", paddingTop: "6px", borderTop: "1px solid #334155" }}>
        <button
          onClick={() => onSelect(node)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            background: "#0284c7",
            color: "white",
            border: "none",
            borderRadius: "4px",
            padding: "4px 8px",
            fontSize: "11px",
            fontWeight: "500",
            cursor: "pointer",
          }}
          title={node.chat?.url ? "Switch to or open chat" : "URL not attached yet"}
        >
          <ExternalLink size={12} />
          {node.chat?.url ? "Open" : "Pending"}
        </button>

        <div style={{ display: "flex", gap: "4px" }}>
          {node.parentId && !node.isMerged && (
            <button
              onClick={() => onMerge(node)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "2px",
                background: "#7c3aed",
                color: "white",
                border: "none",
                borderRadius: "4px",
                padding: "4px 6px",
                fontSize: "11px",
                cursor: "pointer",
              }}
              title="Merge summary back into parent chat"
            >
              <GitMerge size={12} />
              Merge
            </button>
          )}

          <button
            onClick={() => onDelete(node.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "transparent",
              color: "#ef4444",
              border: "none",
              borderRadius: "4px",
              padding: "4px",
              cursor: "pointer",
            }}
            title="Delete this branch"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} style={{ background: "#94a3b8" }} />
    </div>
  );
});
