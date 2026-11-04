import React, { useState, useEffect, useMemo } from "react";
import { BranchNode, BranchGroup, Site } from "../shared/types";
import {
  ExternalLink,
  GitMerge,
  Trash2,
  Cpu,
  MessageSquare,
  Folder,
  ChevronDown,
  Check,
  Pencil,
  X,
  RotateCcw,
} from "lucide-react";

interface BentoGridViewProps {
  nodes: BranchNode[];
  groups: BranchGroup[];
  activeChatUrl?: string | null;
  searchQuery: string;
  selectedPlatform: string;
  selectedGroupId: string;
  onSelectNode: (node: BranchNode) => void;
  onMergeNode: (node: BranchNode) => void;
  onDeleteNode: (nodeId: string) => void;
  onAssignGroup: (nodeId: string, groupId: string | null) => void;
  onRenameNode: (nodeId: string, newLabel: string) => void;
  onResetFilters?: () => void;
}

export const BentoGridView: React.FC<BentoGridViewProps> = ({
  nodes,
  groups,
  activeChatUrl,
  searchQuery,
  selectedPlatform,
  selectedGroupId,
  onSelectNode,
  onMergeNode,
  onDeleteNode,
  onAssignGroup,
  onRenameNode,
  onResetFilters,
}) => {
  const [openGroupDropdownNodeId, setOpenGroupDropdownNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");

  // Dismiss open group dropdown when clicking anywhere outside
  useEffect(() => {
    if (!openGroupDropdownNodeId) return;
    const handleOutsideClick = () => setOpenGroupDropdownNodeId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [openGroupDropdownNodeId]);

  const getGroupName = (groupId?: string | null) => {
    if (!groupId) return null;
    return groups.find((g) => g.id === groupId)?.name || null;
  };

  const normalizePlatform = (site?: string) => {
    if (!site) return "";
    const s = site.toLowerCase().trim();
    if (s === "google") return "gemini";
    return s;
  };

  const filteredNodes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const targetPlatform = selectedPlatform.toLowerCase().trim();

    return nodes.filter((n) => {
      // Search matching across label, summary, tags, and chat title
      const matchesSearch =
        !q ||
        n.label.toLowerCase().includes(q) ||
        (n.summary || "").toLowerCase().includes(q) ||
        (n.chat?.title || "").toLowerCase().includes(q) ||
        (n.chat?.site || "").toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q)) ||
        (getGroupName(n.groupId) || "").toLowerCase().includes(q);

      // Platform matching (normalizing google/gemini and checking tags + chat.site)
      const nodeSite = normalizePlatform(n.chat?.site || n.tags[0]);
      const matchesPlatform =
        targetPlatform === "all" ||
        nodeSite === targetPlatform ||
        n.tags.some((t) => normalizePlatform(t) === targetPlatform);

      // Group matching
      const matchesGroup =
        selectedGroupId === "all" ||
        (selectedGroupId === "ungrouped" ? !n.groupId : n.groupId === selectedGroupId);

      return matchesSearch && matchesPlatform && matchesGroup;
    });
  }, [nodes, searchQuery, selectedPlatform, selectedGroupId, groups]);

  const handleStartRename = (node: BranchNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNodeId(node.id);
    setEditingLabel(node.label);
  };

  const handleSaveRename = (nodeId: string, e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    if (editingLabel.trim()) {
      onRenameNode(nodeId, editingLabel.trim());
    }
    setEditingNodeId(null);
  };

  const handleCancelRename = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    setEditingNodeId(null);
  };

  if (filteredNodes.length === 0) {
    const hasActiveFilters =
      searchQuery.trim().length > 0 ||
      selectedPlatform !== "all" ||
      selectedGroupId !== "all";

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "var(--fl-muted)",
          padding: "32px",
          textAlign: "center",
          background: "var(--fl-canvas)",
        }}
      >
        <MessageSquare size={32} style={{ marginBottom: "12px", opacity: 0.4 }} />
        <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--fl-text)", marginBottom: "4px" }}>
          {hasActiveFilters ? "No branches match your filters" : "No branches found"}
        </div>
        <div style={{ fontSize: "12px", color: "var(--fl-muted)", maxWidth: "260px" }}>
          {hasActiveFilters
            ? "Try resetting your search query, group, or platform filters."
            : "No conversation branches created yet. Click Fork on any message to create a branch."}
        </div>
        {hasActiveFilters && onResetFilters && (
          <button
            onClick={onResetFilters}
            className="filter-pill-btn active"
            style={{
              marginTop: "14px",
              padding: "6px 14px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            <RotateCcw size={12} style={{ marginRight: "4px" }} />
            Clear All Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="branch-grid"
      style={{
        flex: "1 1 0%",
        height: "100%",
        maxHeight: "100%",
        overflowY: "auto",
        minHeight: 0,
        paddingBottom: "80px",
      }}
    >
      {filteredNodes.map((node) => {
        const site = (node.chat?.site || node.tags?.[0] || "chatgpt") as Site;
        const isCurrentTab = Boolean(
          activeChatUrl && node.chat?.url && activeChatUrl.includes(node.chat.conversationId)
        );
        const groupName = getGroupName(node.groupId);
        const isDropdownOpen = openGroupDropdownNodeId === node.id;
        const isEditing = editingNodeId === node.id;

        return (
          <div
            key={node.id}
            className="branch-card"
            data-active={isCurrentTab ? "true" : "false"}
            onClick={() => onSelectNode(node)}
          >
            {/* Top Row: Platform badge + Group badge + token */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    backgroundColor: "var(--fl-surface-raised)",
                    color: "var(--fl-text)",
                    border: "1px solid var(--fl-border)",
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

                {/* Group selector pill */}
                <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() =>
                      setOpenGroupDropdownNodeId(isDropdownOpen ? null : node.id)
                    }
                    title="Assign to a group"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      backgroundColor: groupName ? "var(--fl-surface-raised)" : "transparent",
                      color: groupName ? "var(--fl-text)" : "var(--fl-muted)",
                      border: "1px solid var(--fl-border)",
                      fontSize: "10px",
                      fontWeight: "500",
                      padding: "2px 8px",
                      borderRadius: "999px",
                      cursor: "pointer",
                      transition: "all 0.12s ease",
                    }}
                  >
                    <Folder size={10} />
                    <span>{groupName || "+ Group"}</span>
                    <ChevronDown size={9} />
                  </button>

                  {/* Assign Group Floating Dropdown Menu (Image 2 & 3 reference) */}
                  {isDropdownOpen && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        marginTop: "6px",
                        backgroundColor: "var(--fl-surface)",
                        border: "1px solid var(--fl-border)",
                        borderRadius: "16px",
                        boxShadow: "0 16px 40px rgba(0, 0, 0, 0.7)",
                        zIndex: 300,
                        minWidth: "150px",
                        padding: "6px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "10px",
                          fontWeight: "700",
                          color: "var(--fl-muted)",
                          padding: "4px 8px",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Assign Group
                      </div>
                      <button
                        onClick={() => {
                          onAssignGroup(node.id, null);
                          setOpenGroupDropdownNodeId(null);
                        }}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "6px 10px",
                          background: "none",
                          border: "none",
                          borderRadius: "10px",
                          color: !node.groupId ? "var(--fl-text)" : "var(--fl-muted)",
                          fontSize: "12px",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "background 0.12s ease",
                        }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--fl-surface-raised)")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "none")}
                      >
                        <span>None (Ungrouped)</span>
                        {!node.groupId && <Check size={11} />}
                      </button>

                      {groups.map((g) => (
                        <button
                          key={g.id}
                          onClick={() => {
                            onAssignGroup(node.id, g.id);
                            setOpenGroupDropdownNodeId(null);
                          }}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "6px 10px",
                            background: "none",
                            border: "none",
                            borderRadius: "10px",
                            color: node.groupId === g.id ? "var(--fl-text)" : "var(--fl-muted)",
                            fontSize: "12px",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "background 0.12s ease",
                          }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--fl-surface-raised)")}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "none")}
                        >
                          <span>{g.name}</span>
                          {node.groupId === g.id && <Check size={11} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {isCurrentTab && (
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: "700",
                      color: "var(--fl-active-text)",
                      backgroundColor: "var(--fl-active-bg)",
                      padding: "2px 8px",
                      borderRadius: "999px",
                    }}
                  >
                    Active
                  </span>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "var(--fl-muted)" }}>
                {node.isMerged && (
                  <span title="Merged into parent" style={{ color: "var(--fl-text)", display: "flex" }}>
                    <GitMerge size={12} />
                  </span>
                )}
                {node.compaction === "summary" && (
                  <span title="Compacted" style={{ color: "var(--fl-muted)", display: "flex" }}>
                    <Cpu size={12} />
                  </span>
                )}
                <span>~{node.tokenEstimate.toLocaleString()} tkn</span>
                <span>{new Date(node.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>

            {/* Title / Rename Row */}
            <div>
              {isEditing ? (
                <div
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="text"
                    value={editingLabel}
                    onChange={(e) => setEditingLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveRename(node.id, e);
                      if (e.key === "Escape") handleCancelRename(e);
                    }}
                    autoFocus
                    style={{
                      flex: 1,
                      backgroundColor: "var(--fl-canvas)",
                      border: "1px solid #ffffff",
                      borderRadius: "999px",
                      color: "#ffffff",
                      fontSize: "13px",
                      padding: "6px 12px",
                      outline: "none",
                      fontFamily: "inherit",
                    }}
                  />
                  <button
                    onClick={(e) => handleSaveRename(node.id, e)}
                    title="Save title"
                    style={{
                      background: "var(--fl-active-bg)",
                      color: "var(--fl-active-text)",
                      border: "none",
                      borderRadius: "999px",
                      padding: "6px 10px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      fontWeight: "600",
                    }}
                  >
                    <Check size={12} />
                  </button>
                  <button
                    onClick={handleCancelRename}
                    title="Cancel"
                    style={{
                      background: "transparent",
                      color: "var(--fl-muted)",
                      border: "1px solid var(--fl-border)",
                      borderRadius: "999px",
                      padding: "6px 10px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <X size={12} />
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
                    style={{ fontSize: "14px", fontWeight: "650", color: "var(--fl-text)", lineHeight: "1.4", flex: 1, letterSpacing: "-0.2px" }}
                    title="Double-click to rename"
                    onDoubleClick={(e) => handleStartRename(node, e)}
                  >
                    {node.label}
                  </div>
                  <button
                    onClick={(e) => handleStartRename(node, e)}
                    title="Rename branch"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--fl-muted)",
                      cursor: "pointer",
                      padding: "2px",
                      display: "flex",
                      alignItems: "center",
                      opacity: 0.7,
                      transition: "opacity 0.15s ease",
                      borderRadius: "999px",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.opacity = "1";
                      (e.currentTarget as HTMLElement).style.color = "#ffffff";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.opacity = "0.7";
                      (e.currentTarget as HTMLElement).style.color = "var(--fl-muted)";
                    }}
                  >
                    <Pencil size={12} />
                  </button>
                </div>
              )}
              <div style={{ fontSize: "11px", color: "var(--fl-muted)", marginTop: "4px" }}>
                Forked at message #{((node.forkedAtIndex ?? 0) + 1)}
              </div>
            </div>

            {/* Bottom Actions Row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "12px",
                borderTop: "1px solid var(--fl-border)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => onSelectNode(node)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "var(--fl-active-bg)",
                  color: "var(--fl-active-text)",
                  border: "none",
                  borderRadius: "999px",
                  padding: "6px 14px",
                  fontSize: "12px",
                  fontWeight: "650",
                  cursor: "pointer",
                  transition: "opacity 0.15s ease",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.9")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
              >
                <ExternalLink size={12} />
                Open Chat
              </button>

              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                {!node.isMerged && (
                  <button
                    onClick={() => onMergeNode(node)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      background: "var(--fl-surface-raised)",
                      color: "var(--fl-text)",
                      border: "1px solid var(--fl-border)",
                      borderRadius: "999px",
                      padding: "6px 12px",
                      fontSize: "11px",
                      fontWeight: "500",
                      cursor: "pointer",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#2e2e2e")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--fl-surface-raised)")}
                  >
                    <GitMerge size={12} />
                    Merge
                  </button>
                )}

                <button
                  onClick={() => onDeleteNode(node.id)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "transparent",
                    color: "var(--fl-muted)",
                    border: "1px solid var(--fl-border)",
                    borderRadius: "999px",
                    width: "28px",
                    height: "28px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "#ffffff";
                    (e.currentTarget as HTMLElement).style.borderColor = "#71717a";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "var(--fl-muted)";
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--fl-border)";
                  }}
                  title="Delete this branch"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
