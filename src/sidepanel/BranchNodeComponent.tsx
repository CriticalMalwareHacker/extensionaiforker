import React, { memo } from "react";
import { Handle, Position } from "reactflow";
import { BranchNode, Site } from "../shared/types";
import { GitMerge, ExternalLink, Trash2, Cpu } from "lucide-react";

interface NodeProps {
  data: {
    node: BranchNode;
    isCurrentTab: boolean;
    onSelect: (node: BranchNode) => void;
    onMerge: (node: BranchNode) => void;
    onDelete: (nodeId: string) => void;
  };
}

export const BranchNodeComponent = memo(({ data }: NodeProps) => {
  const { node, isCurrentTab, onSelect, onMerge, onDelete } = data;
  const site = (node.chat?.site || node.tags?.[0] || "chatgpt") as Site;

  return (
    <div
      style={{
        backgroundColor: "#09090b", // shadcn zinc-950
        border: isCurrentTab ? "1px solid #ffffff" : "1px solid #27272a", // zinc-800
        borderRadius: "8px",
        padding: "12px 14px",
        width: "230px",
        boxShadow: isCurrentTab
          ? "0 0 0 1px #ffffff, 0 8px 20px -4px rgba(0, 0, 0, 0.8)"
          : "0 4px 12px -2px rgba(0, 0, 0, 0.6)",
        color: "#fafafa",
        fontFamily: "'Inter', sans-serif",
        position: "relative",
        transition: "all 0.15s ease",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "#71717a", width: 7, height: 7, border: "none" }}
      />

      {/* Top Header Row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <span
          style={{
            backgroundColor: "#18181b", // zinc-900
            color: "#a1a1aa", // zinc-400
            border: "1px solid #27272a",
            fontSize: "10px",
            fontWeight: "600",
            fontFamily: "monospace",
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
            <span
              title="Merged back into parent"
              style={{
                color: "#fafafa",
                border: "1px solid #3f3f46",
                borderRadius: "3px",
                padding: "1px 3px",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              <GitMerge size={11} />
            </span>
          )}
          {node.compaction === "summary" && (
            <span
              title="Smart compacted"
              style={{
                color: "#a1a1aa",
                border: "1px solid #27272a",
                borderRadius: "3px",
                padding: "1px 3px",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              <Cpu size={11} />
            </span>
          )}
          <span style={{ fontSize: "11px", color: "#71717a", fontWeight: "400" }}>
            ~{node.tokenEstimate.toLocaleString()} tkn
          </span>
        </div>
      </div>

      {/* Branch Label */}
      <div
        style={{
          fontSize: "12px",
          fontWeight: "500",
          color: "#f4f4f5",
          lineHeight: "1.4",
          marginBottom: "10px",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
        title={node.label}
      >
        {node.label}
      </div>

      {/* Action Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: "8px",
          borderTop: "1px solid #18181b",
        }}
      >
        {/* Open Button (shadcn primary button) */}
        <button
          onClick={() => onSelect(node)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            background: "#ffffff",
            color: "#000000",
            border: "none",
            borderRadius: "5px",
            padding: "4px 8px",
            fontSize: "11px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "opacity 0.15s ease",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.9")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
          title={node.chat?.url ? "Switch to or open chat" : "URL not attached yet"}
        >
          <ExternalLink size={11} />
          {node.chat?.url ? "Open" : "Pending"}
        </button>

        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          {node.parentId && !node.isMerged && (
            <button
              onClick={() => onMerge(node)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
                background: "#18181b",
                color: "#e4e4e7",
                border: "1px solid #27272a",
                borderRadius: "5px",
                padding: "4px 7px",
                fontSize: "11px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#27272a")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#18181b")}
              title="Merge summary back into parent chat"
            >
              <GitMerge size={11} />
              Merge
            </button>
          )}

          <button
            onClick={() => onDelete(node.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              color: "#71717a",
              border: "none",
              borderRadius: "4px",
              padding: "4px",
              cursor: "pointer",
              transition: "color 0.15s ease",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#ef4444")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#71717a")}
            title="Delete this branch"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: "#71717a", width: 7, height: 7, border: "none" }}
      />
    </div>
  );
});
