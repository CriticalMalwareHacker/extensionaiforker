import React, { useState, useEffect, useCallback, useRef } from "react";
import { BranchNode, BranchGroup } from "../shared/types";
import {
  getAllNodes,
  deleteNode,
  saveNode,
  renameNode,
  getAllGroups,
  createGroup,
  deleteGroup,
  assignNodeToGroup,
  db,
} from "../background/db";
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
  FolderPlus,
  Plus,
  User,
  Sun,
  Moon,
  Sparkles,
  BookOpen,
  Trash2,
  X,
  CreditCard,
} from "lucide-react";

export const App: React.FC = () => {
  const [nodes, setNodes] = useState<BranchNode[]>([]);
  const [groups, setGroups] = useState<BranchGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"tree" | "bento">("bento");
  const [activeChatUrl, setActiveChatUrl] = useState<string | null>(null);
  const [selectedMergeNode, setSelectedMergeNode] = useState<BranchNode | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [activeMenuItem, setActiveMenuItem] = useState<string>("profile");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    try {
      const [allNodes, allGroups] = await Promise.all([
        getAllNodes(),
        getAllGroups(),
      ]);
      setNodes(allNodes);
      setGroups(allGroups);
    } catch (err) {
      console.error("[Forkline Sidepanel] Failed to load data:", err);
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
    loadData();
    checkActiveTab();

    const onTabActivated = () => checkActiveTab();
    chrome.tabs.onActivated?.addListener(onTabActivated);
    const interval = setInterval(loadData, 2500);

    return () => {
      chrome.tabs.onActivated?.removeListener(onTabActivated);
      clearInterval(interval);
    };
  }, [loadData, checkActiveTab]);

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
      await loadData();
    }
  };

  const handleRenameNode = async (nodeId: string, newLabel: string) => {
    if (!newLabel.trim()) return;
    await renameNode(nodeId, newLabel.trim());
    await loadData();
  };

  const handleLinkNodes = async (sourceId: string, targetId: string) => {
    const targetNode = await db.nodes.get(targetId);
    if (targetNode) {
      targetNode.parentId = sourceId;
      await saveNode(targetNode);
      await loadData();
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    await createGroup(newGroupName.trim());
    setNewGroupName("");
    setIsCreateGroupOpen(false);
    await loadData();
  };

  const handleDeleteGroup = async (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this group? Branches inside will become ungrouped.")) {
      await deleteGroup(groupId);
      if (selectedGroupId === groupId) setSelectedGroupId("all");
      await loadData();
    }
  };

  const handleAssignGroup = async (nodeId: string, groupId: string | null) => {
    await assignNodeToGroup(nodeId, groupId);
    await loadData();
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

    await loadData();
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ nodes, groups }, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `forkline-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setIsAccountMenuOpen(false);
  };

  const handleExportMarkdown = () => {
    let md = `# Forkline Branches\n*Exported ${new Date().toLocaleString()}*\n\n`;
    for (const node of nodes) {
      const grp = groups.find((g) => g.id === node.groupId)?.name;
      md += `## ${node.label}\n`;
      md += `- **Site**: ${node.chat?.site || "unknown"}\n`;
      if (grp) md += `- **Group**: ${grp}\n`;
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
    setIsAccountMenuOpen(false);
  };

  const handleClearAll = async () => {
    if (confirm("Reset all branches and restore defaults?")) {
      await db.nodes.clear();
      setIsAccountMenuOpen(false);
      await loadData();
    }
  };

  const totalTokens = nodes.reduce((acc, curr) => acc + (curr.tokenEstimate || 0), 0);

  const parentOfSelected = selectedMergeNode?.parentId
    ? nodes.find((n) => n.id === selectedMergeNode.parentId) || null
    : null;

  return (
    <div className="forkline-app">
      {/* Top Bento Header Bar */}
      <div className="forkline-topbar">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div>
              <div>
                <GitBranch size={16} />
              </div>
            </div>
            <div>
              <span style={{ fontSize: "15px", fontWeight: "700", letterSpacing: "-0.3px" }}>
                Forkline
              </span>
              <span
                style={{
                  marginLeft: "6px",
                  fontSize: "9px",
                  fontFamily: "monospace",
                  color: "var(--fl-muted)",
                  backgroundColor: "var(--fl-surface)",
                  border: "1px solid var(--fl-border)",
                  padding: "1px 6px",
                  borderRadius: "999px",
                }}
              >
                v0.1
              </span>
            </div>
          </div>

          {/* Segmented Pill Switcher (Image 4 reference) */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div className="segmented-pill-container">
              <span className="segmented-pill-label">View</span>
              <button
                className={`segmented-pill-btn ${viewMode === "bento" ? "active" : ""}`}
                onClick={() => setViewMode("bento")}
                title="Bento Grid"
              >
                <LayoutGrid size={11} />
                <span>Grid &lt;&gt;</span>
              </button>
              <button
                className={`segmented-pill-btn ${viewMode === "tree" ? "active" : ""}`}
                onClick={() => setViewMode("tree")}
                title="Visual Tree Graph"
              >
                <Network size={11} />
                <span>Tree &lt;&gt;</span>
              </button>
            </div>

            <button
              onClick={loadData}
              title="Refresh branches"
              className="dock-btn"
              style={{ width: "32px", height: "32px" }}
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* Bento Metrics Bar */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "11px", color: "var(--fl-muted)" }}>Total Branches</span>
            <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--fl-text)" }}>
              {nodes.length}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "11px", color: "var(--fl-muted)" }}>Est. Tokens</span>
            <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--fl-text)" }}>
              ~{totalTokens > 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : totalTokens}
            </span>
          </div>
        </div>
      </div>

      {/* Bento Search, Groups & Platform Filters */}
      <div className="forkline-filters">
        <div>
          <Search size={14} color="var(--fl-muted)" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search branches..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{ background: "none", border: "none", color: "var(--fl-muted)", cursor: "pointer", fontSize: "13px" }}
            >
              &times;
            </button>
          )}
        </div>

        {/* Groups Filter Row */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", overflowX: "auto", paddingBottom: "2px" }}>
          <button
            onClick={() => setIsCreateGroupOpen(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              background: "var(--fl-surface)",
              color: "var(--fl-text)",
              border: "1px solid var(--fl-border)",
              borderRadius: "999px",
              padding: "4px 10px",
              fontSize: "11px",
              fontWeight: "600",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <FolderPlus size={11} />
            <span>+ Group</span>
          </button>

          <button
            onClick={() => setSelectedGroupId("all")}
            style={{
              background: selectedGroupId === "all" ? "#ffffff" : "var(--fl-surface)",
              color: selectedGroupId === "all" ? "#000000" : "var(--fl-muted)",
              border: "1px solid var(--fl-border)",
              borderRadius: "999px",
              padding: "4px 10px",
              fontSize: "11px",
              fontWeight: "600",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            All
          </button>

          <button
            onClick={() => setSelectedGroupId("ungrouped")}
            style={{
              background: selectedGroupId === "ungrouped" ? "#ffffff" : "var(--fl-surface)",
              color: selectedGroupId === "ungrouped" ? "#000000" : "var(--fl-muted)",
              border: "1px solid var(--fl-border)",
              borderRadius: "999px",
              padding: "4px 10px",
              fontSize: "11px",
              fontWeight: "600",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Ungrouped
          </button>

          {groups.map((g) => (
            <div
              key={g.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: selectedGroupId === g.id ? "#ffffff" : "var(--fl-surface)",
                color: selectedGroupId === g.id ? "#000000" : "var(--fl-muted)",
                border: "1px solid var(--fl-border)",
                borderRadius: "999px",
                padding: "3px 10px",
                fontSize: "11px",
                fontWeight: "600",
                whiteSpace: "nowrap",
                cursor: "pointer",
              }}
              onClick={() => setSelectedGroupId(g.id)}
            >
              <span>{g.name}</span>
              <button
                onClick={(e) => handleDeleteGroup(g.id, e)}
                style={{
                  background: "none",
                  border: "none",
                  color: selectedGroupId === g.id ? "#000000" : "var(--fl-muted)",
                  cursor: "pointer",
                  padding: "0 0 0 4px",
                  fontSize: "11px",
                }}
              >
                &times;
              </button>
            </div>
          ))}
        </div>

        {/* Platform filter pills */}
        <div style={{ display: "flex", gap: "6px" }}>
          {["all", "chatgpt", "claude", "gemini"].map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPlatform(p)}
              style={{
                background: selectedPlatform === p ? "#ffffff" : "var(--fl-surface)",
                color: selectedPlatform === p ? "#000000" : "var(--fl-muted)",
                border: "1px solid var(--fl-border)",
                borderRadius: "999px",
                padding: "4px 10px",
                fontSize: "10px",
                fontWeight: "600",
                textTransform: "uppercase",
                fontFamily: "monospace",
                cursor: "pointer",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {viewMode === "bento" ? (
          <BentoGridView
            nodes={nodes}
            groups={groups}
            activeChatUrl={activeChatUrl}
            searchQuery={searchQuery}
            selectedPlatform={selectedPlatform}
            selectedGroupId={selectedGroupId}
            onSelectNode={handleSelectNode}
            onMergeNode={handleStartMerge}
            onDeleteNode={handleDeleteNode}
            onAssignGroup={handleAssignGroup}
            onRenameNode={handleRenameNode}
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
            onRenameNode={handleRenameNode}
          />
        )}

        {/* Floating Bottom Dock (Image 2 & 3 reference) */}
        <div className="forkline-dock-container">
          <div className="forkline-dock">
            <button
              className="dock-btn"
              title="New Group / Organize"
              onClick={() => setIsCreateGroupOpen(true)}
            >
              <Plus size={16} />
            </button>

            <button
              className="dock-btn"
              title="Focus Search"
              onClick={() => searchInputRef.current?.focus()}
            >
              <Search size={14} />
            </button>

            <button
              className={`dock-btn ${viewMode === "tree" ? "pill-highlight" : ""}`}
              title="Toggle View Mode"
              onClick={() => setViewMode(viewMode === "bento" ? "tree" : "bento")}
            >
              {viewMode === "bento" ? <Network size={14} /> : <LayoutGrid size={14} />}
            </button>

            <button
              className={`dock-btn ${isAccountMenuOpen ? "active" : "pill-highlight"}`}
              title="Menu & Account"
              onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
            >
              <User size={15} />
            </button>

            <button
              className="dock-btn"
              title="Theme Toggle"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>

          {/* Floating Card Popover Menu with Vertical Accent Bar (Image 2 & 3 reference) */}
          {isAccountMenuOpen && (
            <div className="floating-card-menu">
              <button
                className={`floating-card-item ${activeMenuItem === "profile" ? "active" : ""}`}
                onClick={() => {
                  setActiveMenuItem("profile");
                }}
              >
                <User size={14} />
                <span>My Account</span>
              </button>

              <button
                className={`floating-card-item ${activeMenuItem === "upgrade" ? "active" : ""}`}
                onClick={() => {
                  setActiveMenuItem("upgrade");
                }}
              >
                <Sparkles size={14} />
                <span>Upgrade & Pro</span>
              </button>

              <button
                className={`floating-card-item ${activeMenuItem === "docs" ? "active" : ""}`}
                onClick={() => {
                  setActiveMenuItem("docs");
                  window.open("https://github.com", "_blank");
                }}
              >
                <BookOpen size={14} />
                <span>Documentation</span>
              </button>

              <button
                className={`floating-card-item ${activeMenuItem === "export-md" ? "active" : ""}`}
                onClick={() => {
                  setActiveMenuItem("export-md");
                  handleExportMarkdown();
                }}
              >
                <FileText size={14} />
                <span>Export Markdown</span>
              </button>

              <button
                className={`floating-card-item ${activeMenuItem === "export-json" ? "active" : ""}`}
                onClick={() => {
                  setActiveMenuItem("export-json");
                  handleExportJSON();
                }}
              >
                <FileJson size={14} />
                <span>Export JSON</span>
              </button>

              <div className="floating-card-divider" />

              <button
                className={`floating-card-item ${activeMenuItem === "settings" ? "active" : ""}`}
                onClick={() => {
                  setActiveMenuItem("settings");
                  setIsSettingsOpen(true);
                  setIsAccountMenuOpen(false);
                }}
              >
                <Settings size={14} />
                <span>Settings</span>
              </button>

              <button
                className="floating-card-item danger"
                onClick={handleClearAll}
              >
                <Trash2 size={14} />
                <span>Clear / Reset Data</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      {isCreateGroupOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.72)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
        >
          <div
            style={{
              backgroundColor: "var(--fl-surface)",
              border: "1px solid var(--fl-border)",
              borderRadius: "18px",
              width: "100%",
              maxWidth: "340px",
              padding: "18px 20px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.65)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "15px", fontWeight: "650", color: "var(--fl-text)" }}>
                New Branch Group
              </span>
              <button
                onClick={() => setIsCreateGroupOpen(false)}
                style={{ background: "none", border: "none", color: "var(--fl-muted)", cursor: "pointer", borderRadius: "999px" }}
              >
                <X size={15} />
              </button>
            </div>
            <input
              type="text"
              placeholder="e.g. Backend, Research, Client Work..."
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
              autoFocus
              style={{
                width: "100%",
                boxSizing: "border-box",
                backgroundColor: "var(--fl-canvas)",
                border: "1px solid var(--fl-border)",
                borderRadius: "12px",
                padding: "9px 12px",
                color: "var(--fl-text)",
                fontSize: "13px",
                outline: "none",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                onClick={() => setIsCreateGroupOpen(false)}
                style={{
                  background: "transparent",
                  color: "var(--fl-muted)",
                  border: "1px solid var(--fl-border)",
                  borderRadius: "999px",
                  padding: "7px 14px",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                style={{
                  background: "#ffffff",
                  color: "#000000",
                  border: "none",
                  borderRadius: "999px",
                  padding: "7px 16px",
                  fontSize: "12px",
                  fontWeight: "650",
                  cursor: "pointer",
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

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
          onDataReset={loadData}
        />
      )}
    </div>
  );
};
