import React, { useState, useEffect, useCallback } from "react";
import { BranchNode } from "../shared/types";
import { getAllNodes, deleteNode, saveNode, db } from "../background/db";
import { BranchTree } from "./BranchTree";
import { BentoGridView } from "./BentoGridView";
import { MergeModal } from "./MergeModal";
import { SettingsModal } from "./SettingsModal";
import {
  GitBranch,
  Search,
  Settings,
  Download,
  RefreshCw,
  FileJson,
  FileText,
  LayoutGrid,
  Network,
} from "lucide-react";

export const App: React.FC = () => {
  const [nodes, setNodes] = useState<BranchNode[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"tree" | "bento">("bento");
  const [activeChatUrl, setActiveChatUrl] = useState<string | null>(null);
  const [selectedMergeNode, setSelectedMergeNode] = useState<BranchNode | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const loadNodes = useCallback(async () => {
    try {
      const all = await getAllNodes();
      setNodes(all);
    } catch (err) {
      console.error("[Forkline Sidepanel] Failed to load nodes:", err);
    }
  }, []);

  const checkActiveTab = useCallback(async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        setActiveChatUrl(tab.url);
      }
    } catch (err) {
      console.debug("Could not query active tab:", err);
    }
  }, []);

  useEffect(() => {
    loadNodes();
    checkActiveTab();

    const onTabActivated = () => checkActiveTab();
    chrome.tabs.onActivated?.addListener(onTabActivated);
    const interval = setInterval(loadNodes, 2500);

    return () => {
      chrome.tabs.onActivated?.removeListener(onTabActivated);
      clearInterval(interval);
    };
  }, [loadNodes, checkActiveTab]);

  const handleSelectNode = async (node: BranchNode) => {
    if (!node.chat?.url) return;

    const tabs = await chrome.tabs.query({});
    const existing = tabs.find((t) => t.url && t.url.includes(node.chat!.conversationId));

    if (existing?.id) {
      await chrome.tabs.update(existing.id, { active: true });
      if (existing.windowId) {
        await chrome.windows.update(existing.windowId, { focused: true });
      }
    } else {
      await chrome.tabs.create({ url: node.chat.url });
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (confirm("Delete this branch?")) {
      await deleteNode(nodeId);
      await loadNodes();
    }
  };

  // Dragging a connection line between branches to re-parent/link them!
  const handleLinkNodes = async (sourceId: string, targetId: string) => {
    const targetNode = await db.nodes.get(targetId);
    if (targetNode) {
      targetNode.parentId = sourceId;
      await saveNode(targetNode);
      await loadNodes();
    }
  };

  const handleStartMerge = (node: BranchNode) => {
    setSelectedMergeNode(node);
  };

  const handleConfirmMerge = async (nodeId: string, summary: string, formattedText: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    node.isMerged = true;
    node.mergedAt = Date.now();
    node.summary = summary;
    await saveNode(node);

    await navigator.clipboard.writeText(formattedText);

    if (node.parentId) {
      const parentNode = nodes.find((n) => n.id === node.parentId);
      if (parentNode?.chat?.url) {
        await handleSelectNode(parentNode);
      }
    }

    await loadNodes();
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(nodes, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `forkline-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setExportMenuOpen(false);
  };

  const handleExportMarkdown = () => {
    let md = `# Forkline Branches\n*Exported ${new Date().toLocaleString()}*\n\n`;
    for (const node of nodes) {
      md += `## ${node.label}\n`;
      md += `- **Site**: ${node.chat?.site || "unknown"}\n`;
      md += `- **Created**: ${new Date(node.createdAt).toLocaleString()}\n`;
      md += `- **Tokens**: ~${node.tokenEstimate.toLocaleString()}\n`;
      if (node.chat?.url) md += `- **URL**: [Open Chat](${node.chat.url})\n`;
      if (node.summary) md += `\n**Summary**:\n${node.summary}\n`;
      md += `\n---\n\n`;
    }

    const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(md);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `forkline-${new Date().toISOString().slice(0, 10)}.md`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setExportMenuOpen(false);
  };

  const totalTokens = nodes.reduce((acc, curr) => acc + (curr.tokenEstimate || 0), 0);

  const parentOfSelected = selectedMergeNode?.parentId
    ? nodes.find((n) => n.id === selectedMergeNode.parentId) || null
    : null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: "#000000",
        color: "#fafafa",
        fontFamily: "'Inter', sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Top Bento Header Bar */}
      <div
        style={{
          padding: "12px 14px",
          borderBottom: "1px solid #18181b",
          backgroundColor: "#000000",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "6px",
                backgroundColor: "#09090b",
                border: "1px solid #27272a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fafafa",
              }}
            >
              <GitBranch size={14} />
            </div>
            <div>
              <span style={{ fontSize: "14px", fontWeight: "700", letterSpacing: "-0.2px" }}>
                Forkline
              </span>
              <span
                style={{
                  marginLeft: "6px",
                  fontSize: "9px",
                  fontFamily: "monospace",
                  color: "#71717a",
                  backgroundColor: "#18181b",
                  border: "1px solid #27272a",
                  padding: "1px 5px",
                  borderRadius: "3px",
                }}
              >
                v0.1
              </span>
            </div>
          </div>

          {/* Action icons */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {/* View Mode Toggle Button */}
            <div
              style={{
                display: "flex",
                backgroundColor: "#09090b",
                border: "1px solid #27272a",
                borderRadius: "6px",
                padding: "2px",
                marginRight: "4px",
              }}
            >
              <button
                onClick={() => setViewMode("bento")}
                title="Bento Grid View"
                style={{
                  background: viewMode === "bento" ? "#ffffff" : "transparent",
                  color: viewMode === "bento" ? "#000000" : "#a1a1aa",
                  border: "none",
                  borderRadius: "4px",
                  padding: "4px 7px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  fontSize: "11px",
                  fontWeight: "600",
                  gap: "4px",
                  transition: "all 0.15s ease",
                }}
              >
                <LayoutGrid size={12} />
                <span>Grid</span>
              </button>
              <button
                onClick={() => setViewMode("tree")}
                title="Visual Tree Graph"
                style={{
                  background: viewMode === "tree" ? "#ffffff" : "transparent",
                  color: viewMode === "tree" ? "#000000" : "#a1a1aa",
                  border: "none",
                  borderRadius: "4px",
                  padding: "4px 7px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  fontSize: "11px",
                  fontWeight: "600",
                  gap: "4px",
                  transition: "all 0.15s ease",
                }}
              >
                <Network size={12} />
                <span>Tree</span>
              </button>
            </div>

            <button
              onClick={loadNodes}
              title="Refresh"
              style={{
                background: "transparent",
                border: "1px solid #27272a",
                color: "#a1a1aa",
                borderRadius: "6px",
                padding: "5px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#fafafa")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#a1a1aa")}
            >
              <RefreshCw size={13} />
            </button>

            {/* Export Menu */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                title="Export"
                style={{
                  background: "transparent",
                  border: "1px solid #27272a",
                  color: "#a1a1aa",
                  borderRadius: "6px",
                  padding: "5px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#fafafa")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#a1a1aa")}
              >
                <Download size={13} />
              </button>

              {exportMenuOpen && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "100%",
                    marginTop: "6px",
                    backgroundColor: "#09090b",
                    border: "1px solid #27272a",
                    borderRadius: "6px",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.8)",
                    zIndex: 200,
                    minWidth: "150px",
                    padding: "4px",
                  }}
                >
                  <button
                    onClick={handleExportMarkdown}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "7px 10px",
                      background: "none",
                      border: "none",
                      borderRadius: "4px",
                      color: "#f4f4f5",
                      fontSize: "12px",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#18181b")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "none")}
                  >
                    <FileText size={13} /> Export Markdown
                  </button>
                  <button
                    onClick={handleExportJSON}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "7px 10px",
                      background: "none",
                      border: "none",
                      borderRadius: "4px",
                      color: "#f4f4f5",
                      fontSize: "12px",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#18181b")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "none")}
                  >
                    <FileJson size={13} /> Export JSON
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsSettingsOpen(true)}
              title="Settings"
              style={{
                background: "transparent",
                border: "1px solid #27272a",
                color: "#a1a1aa",
                borderRadius: "6px",
                padding: "5px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#fafafa")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#a1a1aa")}
            >
              <Settings size={13} />
            </button>
          </div>
        </div>

        {/* Bento Quick Metrics Bar */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <div
            style={{
              backgroundColor: "#09090b",
              border: "1px solid #27272a",
              borderRadius: "8px",
              padding: "8px 12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "11px", color: "#71717a" }}>Total Branches</span>
            <span style={{ fontSize: "13px", fontWeight: "700", color: "#fafafa" }}>{nodes.length}</span>
          </div>

          <div
            style={{
              backgroundColor: "#09090b",
              border: "1px solid #27272a",
              borderRadius: "8px",
              padding: "8px 12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "11px", color: "#71717a" }}>Est. Tokens</span>
            <span style={{ fontSize: "13px", fontWeight: "700", color: "#fafafa" }}>
              ~{totalTokens > 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : totalTokens}
            </span>
          </div>
        </div>
      </div>

      {/* Bento Search & Platform Filter Row */}
      <div
        style={{
          padding: "8px 12px",
          backgroundColor: "#000000",
          borderBottom: "1px solid #18181b",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "#09090b",
            border: "1px solid #27272a",
            borderRadius: "6px",
            padding: "5px 10px",
          }}
        >
          <Search size={13} color="#71717a" />
          <input
            type="text"
            placeholder="Search branches..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#fafafa",
              fontSize: "12px",
              fontFamily: "inherit",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                background: "none",
                border: "none",
                color: "#71717a",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              &times;
            </button>
          )}
        </div>

        {/* Platform filter pills */}
        <div style={{ display: "flex", gap: "6px" }}>
          {["all", "chatgpt", "claude", "gemini"].map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPlatform(p)}
              style={{
                background: selectedPlatform === p ? "#ffffff" : "#09090b",
                color: selectedPlatform === p ? "#000000" : "#a1a1aa",
                border: "1px solid #27272a",
                borderRadius: "4px",
                padding: "3px 8px",
                fontSize: "10px",
                fontWeight: "600",
                textTransform: "uppercase",
                fontFamily: "monospace",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area: Bento Grid or Visual Tree */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {viewMode === "bento" ? (
          <BentoGridView
            nodes={nodes}
            activeChatUrl={activeChatUrl}
            searchQuery={searchQuery}
            selectedPlatform={selectedPlatform}
            onSelectNode={handleSelectNode}
            onMergeNode={handleStartMerge}
            onDeleteNode={handleDeleteNode}
          />
        ) : (
          <BranchTree
            nodes={nodes}
            activeChatUrl={activeChatUrl}
            searchQuery={searchQuery}
            onSelectNode={handleSelectNode}
            onMergeNode={handleStartMerge}
            onDeleteNode={handleDeleteNode}
            onLinkNodes={handleLinkNodes}
          />
        )}
      </div>

      {/* Modals */}
      {selectedMergeNode && (
        <MergeModal
          branchNode={selectedMergeNode}
          parentNode={parentOfSelected}
          onClose={() => setSelectedMergeNode(null)}
          onConfirmMerge={handleConfirmMerge}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          onDataReset={loadNodes}
        />
      )}
    </div>
  );
};
