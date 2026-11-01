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
        backgroundColor: "#09090b",
        border: isCurrentTab ? "2px solid #ffffff" : "1px solid #27272a",
        borderRadius: "10px",
        padding: "12px 14px",
        width: "250px",
        boxShadow: isCurrentTab
          ? "0 0 0 1px #ffffff, 0 10px 25px -5px rgba(0, 0, 0, 0.9)"
          : "0 4px 15px -2px rgba(0, 0, 0, 0.7)",
        color: "#fafafa",
        fontFamily: "'Inter', sans-serif",
        position: "relative",
        userSelect: "none",
        cursor: "grab",
      }}
    >
      {/* Target handle at top: connect incoming branch */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: "#fafafa",
          width: 9,
          height: 9,
          border: "2px solid #09090b",
          top: -5,
        }}
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
            backgroundColor: "#18181b",
            color: "#d4d4d8",
            border: "1px solid #27272a",
            fontSize: "10px",
            fontWeight: "600",
            fontFamily: "monospace",
            textTransform: "uppercase",
            padding: "2px 7px",
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
                padding: "2px 4px",
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
                padding: "2px 4px",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              <Cpu size={11} />
            </span>
          )}
          <span style={{ fontSize: "11px", color: "#71717a", fontWeight: "500" }}>
            ~{node.tokenEstimate.toLocaleString()} tkn
          </span>
        </div>
      </div>

      {/* Branch Label */}
      <div
        style={{
          fontSize: "13px",
          fontWeight: "600",
          color: "#fafafa",
          lineHeight: "1.4",
          marginBottom: "12px",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
        title={node.label}
      >
        {node.label}
      </div>

      {/* Action Footer (nodrag so buttons can be clicked!) */}
      <div
        className="nodrag nopan"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: "8px",
          borderTop: "1px solid #18181b",
        }}
      >
        <button
          className="nodrag nopan"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(node);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            background: "#ffffff",
            color: "#000000",
            border: "none",
            borderRadius: "6px",
            padding: "5px 10px",
            fontSize: "11px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "opacity 0.15s ease",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.9")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
        >
          <ExternalLink size={12} />
          {node.chat?.url ? "Open" : "Open"}
        </button>

        <div className="nodrag nopan" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {!node.isMerged && (
            <button
              className="nodrag nopan"
              onClick={(e) => {
                e.stopPropagation();
                onMerge(node);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                background: "#18181b",
                color: "#f4f4f5",
                border: "1px solid #27272a",
                borderRadius: "6px",
                padding: "5px 8px",
                fontSize: "11px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#27272a")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#18181b")}
              title="Merge summary into parent conversation"
            >
              <GitMerge size={12} />
              Merge
            </button>
          )}

          <button
            className="nodrag nopan"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node.id);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              color: "#71717a",
              border: "1px solid #27272a",
              borderRadius: "6px",
              padding: "5px 7px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = "#ffffff";
              (e.currentTarget as HTMLElement).style.borderColor = "#71717a";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = "#71717a";
              (e.currentTarget as HTMLElement).style.borderColor = "#27272a";
            }}
            title="Delete this branch"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Source handle at bottom: drag to connect to another branch */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: "#fafafa",
          width: 9,
          height: 9,
          border: "2px solid #09090b",
          bottom: -5,
        }}
      />
    </div>
  );
});
