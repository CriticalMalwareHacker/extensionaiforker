import React, { useState } from "react";
import { BranchNode, BranchGroup, Site } from "../shared/types";
import { ExternalLink, GitMerge, Trash2, Cpu, MessageSquare, Folder, ChevronDown, Check } from "lucide-react";

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
}) => {
  const [openGroupDropdownNodeId, setOpenGroupDropdownNodeId] = useState<string | null>(null);

  const filteredNodes = nodes.filter((n) => {
    const matchesSearch =
      !searchQuery.trim() ||
      n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesPlatform =
      selectedPlatform === "all" ||
      (n.chat?.site || n.tags[0]) === selectedPlatform;

    const matchesGroup =
      selectedGroupId === "all" ||
      (selectedGroupId === "ungrouped" ? !n.groupId : n.groupId === selectedGroupId);

    return matchesSearch && matchesPlatform && matchesGroup;
  });

  const getGroupName = (groupId?: string | null) => {
    if (!groupId) return null;
    return groups.find((g) => g.id === groupId)?.name || null;
  };

  if (filteredNodes.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "#71717a",
          padding: "32px",
          textAlign: "center",
        }}
      >
        <MessageSquare size={28} style={{ marginBottom: "12px", opacity: 0.5 }} />
        <div style={{ fontSize: "14px", fontWeight: "600", color: "#fafafa", marginBottom: "4px" }}>
          No branches found
        </div>
        <div style={{ fontSize: "12px", color: "#71717a" }}>
          Try clearing your search query or group filter.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "12px",
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: "10px",
        overflowY: "auto",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      {filteredNodes.map((node) => {
        const site = (node.chat?.site || node.tags?.[0] || "chatgpt") as Site;
        const isCurrentTab = Boolean(
          activeChatUrl && node.chat?.url && activeChatUrl.includes(node.chat.conversationId)
        );
        const groupName = getGroupName(node.groupId);
        const isDropdownOpen = openGroupDropdownNodeId === node.id;

        return (
          <div
            key={node.id}
            onClick={() => onSelectNode(node)}
            style={{
              backgroundColor: "#09090b",
              border: isCurrentTab ? "2px solid #ffffff" : "1px solid #27272a",
              borderRadius: "10px",
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              cursor: "pointer",
              transition: "all 0.15s ease",
              boxShadow: isCurrentTab ? "0 0 0 1px #ffffff" : "none",
              position: "relative",
            }}
            onMouseEnter={(e) => {
              if (!isCurrentTab) (e.currentTarget as HTMLElement).style.borderColor = "#3f3f46";
            }}
            onMouseLeave={(e) => {
              if (!isCurrentTab) (e.currentTarget as HTMLElement).style.borderColor = "#27272a";
            }}
          >
            {/* Top Row: Platform badge + Group badge + token */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    backgroundColor: "#18181b",
                    color: "#fafafa",
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
                      backgroundColor: groupName ? "#18181b" : "transparent",
                      color: groupName ? "#fafafa" : "#71717a",
                      border: "1px solid #27272a",
                      fontSize: "10px",
                      fontWeight: "500",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    <Folder size={10} />
                    <span>{groupName || "+ Group"}</span>
                    <ChevronDown size={9} />
                  </button>

                  {isDropdownOpen && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        marginTop: "4px",
                        backgroundColor: "#09090b",
                        border: "1px solid #27272a",
                        borderRadius: "6px",
                        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.9)",
                        zIndex: 300,
                        minWidth: "140px",
                        padding: "4px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "10px",
                          fontWeight: "600",
                          color: "#71717a",
                          padding: "4px 8px",
                          textTransform: "uppercase",
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
                          padding: "6px 8px",
                          background: "none",
                          border: "none",
                          borderRadius: "4px",
                          color: !node.groupId ? "#ffffff" : "#a1a1aa",
                          fontSize: "11px",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#18181b")}
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
                            padding: "6px 8px",
                            background: "none",
                            border: "none",
                            borderRadius: "4px",
                            color: node.groupId === g.id ? "#ffffff" : "#a1a1aa",
                            fontSize: "11px",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#18181b")}
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
                      fontWeight: "600",
                      color: "#000000",
                      backgroundColor: "#ffffff",
                      padding: "2px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    Active
                  </span>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "#71717a" }}>
                {node.isMerged && (
                  <span title="Merged into parent" style={{ color: "#ffffff", display: "flex" }}>
                    <GitMerge size={12} />
                  </span>
                )}
                {node.compaction === "summary" && (
                  <span title="Compacted" style={{ color: "#a1a1aa", display: "flex" }}>
                    <Cpu size={12} />
                  </span>
                )}
                <span>~{node.tokenEstimate.toLocaleString()} tkn</span>
                <span>{new Date(node.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>

            {/* Title / Turn preview */}
            <div>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#fafafa", lineHeight: "1.4" }}>
                {node.label}
              </div>
              <div style={{ fontSize: "11px", color: "#71717a", marginTop: "3px" }}>
                Forked at message #{((node.forkedAtIndex ?? 0) + 1)}
              </div>
            </div>

            {/* Bottom Actions Row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "10px",
                borderTop: "1px solid #18181b",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => onSelectNode(node)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  background: "#ffffff",
                  color: "#000000",
                  border: "none",
                  borderRadius: "6px",
                  padding: "5px 12px",
                  fontSize: "11px",
                  fontWeight: "600",
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
                      background: "#18181b",
                      color: "#f4f4f5",
                      border: "1px solid #27272a",
                      borderRadius: "6px",
                      padding: "5px 10px",
                      fontSize: "11px",
                      fontWeight: "500",
                      cursor: "pointer",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#27272a")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#18181b")}
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
                    color: "#71717a",
                    border: "1px solid #27272a",
                    borderRadius: "6px",
                    padding: "5px 8px",
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
          </div>
        );
      })}
    </div>
  );
};
