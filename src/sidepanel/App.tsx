import React, { useState, useEffect, useCallback } from "react";
import { BranchNode } from "../shared/types";
import { getAllNodes, deleteNode, saveNode } from "../background/db";
import { BranchTree } from "./BranchTree";
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
} from "lucide-react";

export const App: React.FC = () => {
  const [nodes, setNodes] = useState<BranchNode[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChatUrl, setActiveChatUrl] = useState<string | null>(null);
  const [selectedMergeNode, setSelectedMergeNode] = useState<BranchNode | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // Load nodes from DB
  const loadNodes = useCallback(async () => {
    try {
      const all = await getAllNodes();
      setNodes(all);
    } catch (err) {
      console.error("[Forkline Sidepanel] Failed to load nodes:", err);
    }
  }, []);

  // Check active tab URL
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

    // Listen for tab activation to highlight matching node
    const onTabActivated = () => checkActiveTab();
    chrome.tabs.onActivated?.addListener(onTabActivated);

    // Refresh every few seconds or when storage changes
    const interval = setInterval(loadNodes, 3000);

    return () => {
      chrome.tabs.onActivated?.removeListener(onTabActivated);
      clearInterval(interval);
    };
  }, [loadNodes, checkActiveTab]);

  // Navigate to chat node
  const handleSelectNode = async (node: BranchNode) => {
    if (!node.chat?.url) return;

    // Check if a tab with this conversation is already open
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

    // Copy formatted text to clipboard
    await navigator.clipboard.writeText(formattedText);

    // Open or focus parent chat
    if (node.parentId) {
      const parentNode = nodes.find((n) => n.id === node.parentId);
      if (parentNode?.chat?.url) {
        await handleSelectNode(parentNode);
      }
    }

    await loadNodes();
  };

  // Export functions
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(nodes, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `forkline-branches-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setExportMenuOpen(false);
  };

  const handleExportMarkdown = () => {
    let md = `# Forkline Conversation Branches\n*Exported on ${new Date().toLocaleString()}*\n\n`;
    for (const node of nodes) {
      md += `## Branch: ${node.label}\n`;
      md += `- **Site**: ${node.chat?.site || "unknown"}\n`;
      md += `- **Created**: ${new Date(node.createdAt).toLocaleString()}\n`;
      md += `- **Parent ID**: ${node.parentId || "Root"}\n`;
      md += `- **Token Estimate**: ~${node.tokenEstimate.toLocaleString()}\n`;
      if (node.chat?.url) md += `- **URL**: [Open Chat](${node.chat.url})\n`;
      if (node.summary) md += `\n**Summary**:\n${node.summary}\n`;
      md += `\n---\n\n`;
    }

    const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(md);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `forkline-branches-${new Date().toISOString().slice(0, 10)}.md`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setExportMenuOpen(false);
  };

  const parentOfSelected = selectedMergeNode?.parentId
    ? nodes.find((n) => n.id === selectedMergeNode.parentId) || null
    : null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: "#090d16",
        color: "#f8fafc",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Top Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #1e293b",
          backgroundColor: "#0f172a",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              background: "linear-gradient(135deg, #0284c7, #38bdf8)",
              padding: "6px",
              borderRadius: "8px",
              display: "flex",
              color: "white",
            }}
          >
            <GitBranch size={16} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "15px", fontWeight: "700", letterSpacing: "-0.3px" }}>
              Forkline
            </h1>
          </div>
        </div>

        {/* Action icons */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            onClick={loadNodes}
            title="Refresh tree"
            style={{
              background: "transparent",
              border: "1px solid #334155",
              color: "#94a3b8",
              borderRadius: "6px",
              padding: "6px",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={14} />
          </button>

          {/* Export Dropdown */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              title="Export branches"
              style={{
                background: "transparent",
                border: "1px solid #334155",
                color: "#94a3b8",
                borderRadius: "6px",
                padding: "6px",
                cursor: "pointer",
              }}
            >
              <Download size={14} />
            </button>

            {exportMenuOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "100%",
                  marginTop: "6px",
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
                  zIndex: 200,
                  minWidth: "150px",
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={handleExportMarkdown}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    background: "none",
                    border: "none",
                    color: "#f1f5f9",
                    fontSize: "12px",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <FileText size={14} color="#38bdf8" /> Export Markdown
                </button>
                <button
                  onClick={handleExportJSON}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    background: "none",
                    border: "none",
                    color: "#f1f5f9",
                    fontSize: "12px",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <FileJson size={14} color="#f59e0b" /> Export JSON
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsSettingsOpen(true)}
            title="Settings"
            style={{
              background: "transparent",
              border: "1px solid #334155",
              color: "#94a3b8",
              borderRadius: "6px",
              padding: "6px",
              cursor: "pointer",
            }}
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div
        style={{
          padding: "8px 14px",
          backgroundColor: "#0b1120",
          borderBottom: "1px solid #1e293b",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <Search size={14} color="#64748b" />
        <input
          type="text"
          placeholder="Search branches by label, tag, or site..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#f1f5f9",
            fontSize: "12px",
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            style={{ background: "none", border: "none", color: "#64748b", fontSize: "14px", cursor: "pointer" }}
          >
            &times;
          </button>
        )}
      </div>

      {/* Visual Branch Tree Area */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <BranchTree
          nodes={nodes}
          activeChatUrl={activeChatUrl}
          searchQuery={searchQuery}
          onSelectNode={handleSelectNode}
          onMergeNode={handleStartMerge}
          onDeleteNode={handleDeleteNode}
        />
      </div>

      {/* Footer Info */}
      <div
        style={{
          padding: "6px 14px",
          backgroundColor: "#0f172a",
          borderTop: "1px solid #1e293b",
          fontSize: "11px",
          color: "#64748b",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>
          {nodes.length} branch{nodes.length === 1 ? "" : "es"} tracked
        </span>
        <span style={{ color: "#38bdf8" }}>Local-first IndexedDB</span>
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
