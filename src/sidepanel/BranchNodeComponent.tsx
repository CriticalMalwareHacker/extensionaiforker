import React, { memo, useState } from "react";
import { Handle, Position } from "reactflow";
import { BranchNode, Site } from "../shared/types";
import { GitMerge, ExternalLink, Trash2, Cpu, Pencil, Check, X } from "lucide-react";

interface NodeProps {
  data: {
    node: BranchNode;
    isCurrentTab: boolean;
    onSelect: (node: BranchNode) => void;
    onMerge: (node: BranchNode) => void;
    onDelete: (nodeId: string) => void;
    onRename?: (nodeId: string, newLabel: string) => void;
  };
}

export const BranchNodeComponent = memo(({ data }: NodeProps) => {
  const { node, isCurrentTab, onSelect, onMerge, onDelete, onRename } = data;
  const site = (node.chat?.site || node.tags?.[0] || "chatgpt") as Site;

  const [isEditing, setIsEditing] = useState(false);
  const [editingText, setEditingText] = useState(node.label);

  const handleSaveRename = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    if (editingText.trim() && onRename) {
      onRename(node.id, editingText.trim());
    }
    setIsEditing(false);
  };

  const handleCancelRename = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    setEditingText(node.label);
    setIsEditing(false);
  };

  return (
    <div
      style={{
        backgroundColor: "var(--fl-surface, #1d1d1d)",
        border: isCurrentTab ? "2px solid #ffffff" : "1px solid var(--fl-border, #303030)",
        borderRadius: "18px",
        padding: "14px 16px",
        width: "250px",
        boxShadow: isCurrentTab
          ? "0 0 0 2px #eeeeee, 0 16px 40px rgba(0, 0, 0, 0.8)"
          : "0 8px 24px rgba(0, 0, 0, 0.5)",
        color: "var(--fl-text, #f0f0f0)",
        fontFamily: "'Inter', sans-serif",
        position: "relative",
        userSelect: "none",
        cursor: "grab",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: "#ffffff",
          width: 9,
          height: 9,
          border: "2px solid #151515",
          top: -5,
        }}
      />

      {/* Top Header Row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
        }}
      >
        <span
          style={{
            backgroundColor: "var(--fl-surface-raised, #242424)",
            color: "var(--fl-text, #f0f0f0)",
            border: "1px solid var(--fl-border, #303030)",
            fontSize: "10px",
            fontWeight: "700",
            fontFamily: "monospace",
            textTransform: "uppercase",
            padding: "2px 8px",
            borderRadius: "999px",
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
                color: "#ffffff",
                border: "1px solid var(--fl-border, #303030)",
                borderRadius: "999px",
                padding: "2px 6px",
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
                color: "var(--fl-muted, #9a9a9a)",
                border: "1px solid var(--fl-border, #303030)",
                borderRadius: "999px",
                padding: "2px 6px",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              <Cpu size={11} />
            </span>
          )}
          <span style={{ fontSize: "11px", color: "var(--fl-muted, #9a9a9a)", fontWeight: "500" }}>
            ~{node.tokenEstimate.toLocaleString()} tkn
          </span>
        </div>
      </div>

      {/* Branch Title & Inline Rename */}
      <div style={{ marginBottom: "14px" }}>
        {isEditing ? (
          <div
            className="nodrag nopan"
            style={{ display: "flex", alignItems: "center", gap: "4px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveRename(e);
                if (e.key === "Escape") handleCancelRename(e);
              }}
              autoFocus
              className="nodrag nopan"
              style={{
                flex: 1,
                backgroundColor: "var(--fl-canvas, #151515)",
                border: "1px solid #ffffff",
                borderRadius: "999px",
                color: "#ffffff",
                fontSize: "12px",
                padding: "5px 10px",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={handleSaveRename}
              title="Save title"
              className="nodrag nopan"
              style={{
                background: "#ffffff",
                color: "#000000",
                border: "none",
                borderRadius: "999px",
                padding: "5px 8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Check size={11} />
            </button>
            <button
              onClick={handleCancelRename}
              title="Cancel"
              className="nodrag nopan"
              style={{
                background: "transparent",
                color: "var(--fl-muted, #9a9a9a)",
                border: "1px solid var(--fl-border, #303030)",
                borderRadius: "999px",
                padding: "5px 8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={11} />
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "6px",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                fontWeight: "650",
                color: "var(--fl-text, #f0f0f0)",
                lineHeight: "1.4",
                flex: 1,
                letterSpacing: "-0.2px",
              }}
              title="Double-click to rename"
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
            >
              {node.label}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              title="Rename branch"
              className="nodrag nopan"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--fl-muted, #9a9a9a)",
                cursor: "pointer",
                padding: "2px",
                display: "flex",
                alignItems: "center",
                opacity: 0.7,
                borderRadius: "999px",
              }}
            >
              <Pencil size={11} />
            </button>
          </div>
        )}

        <div style={{ fontSize: "10px", color: "var(--fl-muted, #9a9a9a)", marginTop: "4px" }}>
          Turn #{((node.forkedAtIndex ?? 0) + 1)} &bull;{" "}
          {new Date(node.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>

      {/* Action Buttons Row */}
      <div
        className="nodrag nopan"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: "10px",
          borderTop: "1px solid var(--fl-border, #303030)",
        }}
      >
        <button
          onClick={() => onSelect(node)}
          className="nodrag nopan"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            background: "#ffffff",
            color: "#000000",
            border: "none",
            borderRadius: "999px",
            padding: "5px 12px",
            fontSize: "11px",
            fontWeight: "650",
            cursor: "pointer",
          }}
        >
          <ExternalLink size={11} />
          Open
        </button>

        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {!node.isMerged && (
            <button
              onClick={() => onMerge(node)}
              className="nodrag nopan"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                background: "var(--fl-surface-raised, #242424)",
                color: "var(--fl-text, #f0f0f0)",
                border: "1px solid var(--fl-border, #303030)",
                borderRadius: "999px",
                padding: "5px 10px",
                fontSize: "11px",
                fontWeight: "500",
                cursor: "pointer",
              }}
            >
              <GitMerge size={11} />
              Merge
            </button>
          )}

          <button
            onClick={() => onDelete(node.id)}
            className="nodrag nopan"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              color: "var(--fl-muted, #9a9a9a)",
              border: "1px solid var(--fl-border, #303030)",
              borderRadius: "999px",
              width: "26px",
              height: "26px",
              cursor: "pointer",
            }}
            title="Delete this branch"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: "#ffffff",
          width: 9,
          height: 9,
          border: "2px solid #151515",
          bottom: -5,
        }}
      />
    </div>
  );
});
