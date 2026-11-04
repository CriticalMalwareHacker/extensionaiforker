import React, { useState, useEffect, useCallback } from "react";
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
  ExternalLink,
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [activeMenuItem, setActiveMenuItem] = useState<string>("profile");

  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try {
      const saved = localStorage.getItem("forkline_theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch {
      // fallback
    }
    return "dark";
  });

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("forkline_theme", next);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.style.backgroundColor = theme === "dark" ? "#151515" : "#f5f5f7";
  }, [theme]);

  // Global shortcut (Ctrl+K / Cmd+K) to toggle search popup
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSearchOpen]);

  const loadData = useCallback(async () => {
    try {
      const [allNodes, allGroups] = await Promise.all([
        getAllNodes(),
        getAllGroups(),
      ]);

      setNodes((prevNodes) => {
        if (
          prevNodes.length === allNodes.length &&
          prevNodes.every((p, i) => {
            const n = allNodes[i];
            return (
              n &&
              p.id === n.id &&
              p.label === n.label &&
              p.groupId === n.groupId &&
              p.isMerged === n.isMerged &&
              p.summary === n.summary &&
              p.chat?.url === n.chat?.url
            );
          })
        ) {
          return prevNodes;
        }
        return allNodes;
      });

      setGroups((prevGroups) => {
        if (
          prevGroups.length === allGroups.length &&
          prevGroups.every((p, i) => p.id === allGroups[i]?.id && p.name === allGroups[i]?.name)
        ) {
          return prevGroups;
        }
        return allGroups;
      });
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

  const handleResetFilters = useCallback(() => {
    setSelectedPlatform("all");
    setSelectedGroupId("all");
    setSearchQuery("");
  }, []);

  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = { chatgpt: 0, claude: 0, gemini: 0 };
    for (const n of (nodes || [])) {
      if (!n) continue;
      const site = (n.chat?.site || (n.tags && n.tags[0]) || "").toLowerCase();
      if (site === "google" || site === "gemini") counts.gemini++;
      else if (site === "claude") counts.claude++;
      else if (site === "chatgpt") counts.chatgpt++;
    }
    return counts;
  }, [nodes]);

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = { ungrouped: 0 };
    for (const n of (nodes || [])) {
      if (!n) continue;
      if (!n.groupId) counts.ungrouped++;
      else counts[n.groupId] = (counts[n.groupId] || 0) + 1;
    }
    return counts;
  }, [nodes]);

  const totalTokens = (nodes || []).reduce((acc, curr) => acc + (curr?.tokenEstimate || 0), 0);

  const parentOfSelected = selectedMergeNode?.parentId
    ? (nodes || []).find((n) => n.id === selectedMergeNode.parentId) || null
    : null;

  // Filtered nodes for the search popup preview
  const searchPopupResults = (nodes || []).filter((n) => {
    if (!n) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const tags = Array.isArray(n.tags) ? n.tags : [];
    return (
      (n.label || "").toLowerCase().includes(q) ||
      tags.some((t) => (t || "").toLowerCase().includes(q)) ||
      (n.chat?.site || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="forkline-app" data-theme={theme}>
      {/* Top Bento Header Bar */}
      <div className="forkline-topbar">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className="forkline-brand-icon">
              <GitBranch size={16} />
            </div>
            <div>
              <span className="forkline-brand-title">Forkline</span>
              <span
                style={{
                  marginLeft: "6px",
                  fontSize: "9px",
                  fontFamily: "monospace",
                  color: "var(--fl-muted)",
                  backgroundColor: "var(--fl-surface-raised)",
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

            {/* Quick Search Popup Trigger */}
            <button
              onClick={() => setIsSearchOpen(true)}
              title="Search (Ctrl+K)"
              className="dock-btn"
              style={{ width: "30px", height: "30px" }}
            >
              <Search size={13} />
            </button>

            <button
              onClick={loadData}
              title="Refresh branches"
              className="dock-btn"
              style={{ width: "30px", height: "30px" }}
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* Bento Metrics Bar */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <div className="metric-card">
            <span className="metric-label">Branches</span>
            <span className="metric-val">{nodes.length}</span>
          </div>

          <div className="metric-card">
            <span className="metric-label">Tokens</span>
            <span className="metric-val">
              ~{totalTokens > 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : totalTokens}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="forkline-filters">
        {/* Active Search Filter Chip (if search query applied) */}
        {searchQuery && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div className="active-search-chip">
              <Search size={11} color="var(--fl-muted)" />
              <span>Search: "{searchQuery}"</span>
              <button onClick={() => setSearchQuery("")} title="Clear search">
                &times;
              </button>
            </div>
            <button
              onClick={() => setIsSearchOpen(true)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--fl-muted)",
                fontSize: "11px",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Edit
            </button>
          </div>
        )}

        {/* Groups Filter Row */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", overflowX: "auto", paddingBottom: "2px" }}>
          <button
            onClick={() => setIsCreateGroupOpen(true)}
            className="filter-pill-btn"
            style={{ fontWeight: "700" }}
          >
            <FolderPlus size={11} />
            <span>+ Group</span>
          </button>

          <button
            onClick={() => setSelectedGroupId("all")}
            className={`filter-pill-btn ${selectedGroupId === "all" ? "active" : ""}`}
          >
            All
          </button>

          <button
            onClick={() => setSelectedGroupId(selectedGroupId === "ungrouped" ? "all" : "ungrouped")}
            className={`filter-pill-btn ${selectedGroupId === "ungrouped" ? "active" : ""}`}
          >
            Ungrouped {groupCounts.ungrouped > 0 ? `(${groupCounts.ungrouped})` : ""}
          </button>

          {groups.map((g) => {
            const count = groupCounts[g.id] || 0;
            return (
              <div
                key={g.id}
                className={`group-chip-pill ${selectedGroupId === g.id ? "active" : ""}`}
                onClick={() => setSelectedGroupId(selectedGroupId === g.id ? "all" : g.id)}
              >
                <span>{g.name}</span>
                {count > 0 && <span style={{ opacity: 0.7, fontSize: "9px", marginLeft: "2px" }}>({count})</span>}
                <button
                  className="group-chip-remove-btn"
                  onClick={(e) => handleDeleteGroup(g.id, e)}
                  title="Delete group"
                >
                  &times;
                </button>
              </div>
            );
          })}
        </div>

        {/* Platform filter pills */}
        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
          {["all", "chatgpt", "claude", "gemini"].map((p) => {
            const count = p === "all" ? nodes.length : (platformCounts[p] || 0);
            return (
              <button
                key={p}
                onClick={() => setSelectedPlatform(selectedPlatform === p ? "all" : p)}
                className={`filter-pill-btn ${selectedPlatform === p ? "active" : ""}`}
                style={{ textTransform: "uppercase", fontFamily: "monospace", fontSize: "10px" }}
              >
                <span>{p}</span>
                <span style={{ opacity: 0.65, fontSize: "9px" }}>({count})</span>
              </button>
            );
          })}

          {(selectedPlatform !== "all" || selectedGroupId !== "all" || searchQuery.trim()) && (
            <button
              onClick={handleResetFilters}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--fl-muted)",
                fontSize: "11px",
                cursor: "pointer",
                textDecoration: "underline",
                marginLeft: "auto",
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div
        style={{
          flex: "1 1 0%",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          height: "100%",
        }}
      >
        {viewMode === "bento" ? (
          <BentoGridView
            nodes={nodes}
            groups={groups}
            activeChatUrl={activeChatUrl}
            searchQuery={searchQuery}
            selectedPlatform={selectedPlatform}
            selectedGroupId={selectedGroupId}
            onSelectNode={handleSelectNode}
            onOpenBranch={handleSelectNode}
            onMergeNode={handleStartMerge}
            onStartMerge={handleStartMerge}
            onDeleteNode={handleDeleteNode}
            onAssignGroup={handleAssignGroup}
            onRenameNode={handleRenameNode}
            onResetFilters={handleResetFilters}
          />
        ) : (
          <BranchTree
            nodes={nodes}
            groups={groups}
            activeChatUrl={activeChatUrl}
            searchQuery={searchQuery}
            selectedPlatform={selectedPlatform}
            selectedGroupId={selectedGroupId}
            onSelectNode={handleSelectNode}
            onNodeClick={handleSelectNode}
            onOpenBranch={handleSelectNode}
            onMergeNode={handleStartMerge}
            onStartMerge={handleStartMerge}
            onDeleteNode={handleDeleteNode}
            onLinkNodes={handleLinkNodes}
            onRenameNode={handleRenameNode}
            onResetFilters={handleResetFilters}
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
              className={`dock-btn ${isSearchOpen ? "active" : ""}`}
              title="Search Branches (Ctrl+K)"
              onClick={() => setIsSearchOpen(true)}
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

            {/* Live Theme Toggle */}
            <button
              className="dock-btn"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              onClick={toggleTheme}
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

      {/* Command Search Popup Modal */}
      {isSearchOpen && (
        <div className="search-popup-backdrop" onClick={() => setIsSearchOpen(false)}>
          <div className="search-popup-card" onClick={(e) => e.stopPropagation()}>
            <div className="search-popup-input-row">
              <Search size={16} color="var(--fl-muted)" />
              <input
                type="text"
                placeholder="Search branches by title, tag, platform..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="search-popup-input"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--fl-muted)",
                    fontSize: "14px",
                    cursor: "pointer",
                    padding: "2px",
                  }}
                >
                  &times;
                </button>
              )}
              <span
                className="search-popup-kbd"
                onClick={() => setIsSearchOpen(false)}
                title="Press Esc to close"
              >
                Esc
              </span>
            </div>

            {/* Quick Results Preview */}
            <div className="search-popup-results">
              {searchPopupResults.length === 0 ? (
                <div className="search-popup-empty">
                  No branches match "{searchQuery}"
                </div>
              ) : (
                searchPopupResults.slice(0, 7).map((node) => (
                  <div
                    key={node.id}
                    className="search-popup-item"
                    onClick={() => {
                      handleSelectNode(node);
                      setIsSearchOpen(false);
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
                      <span className="search-popup-site-badge">
                        {node.chat?.site || node.tags?.[0] || "chat"}
                      </span>
                      <span className="search-popup-item-label">
                        {node.label}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--fl-muted)", flexShrink: 0 }}>
                      <span>~{node.tokenEstimate} tkn</span>
                      <ExternalLink size={12} />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="search-popup-footer">
              <span>Click a branch to jump directly to chat</span>
              <span>{searchPopupResults.length} found</span>
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {isCreateGroupOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "var(--fl-modal-backdrop)",
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
              boxShadow: "0 24px 60px var(--fl-shadow)",
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
                  background: "var(--fl-active-bg)",
                  color: "var(--fl-active-text)",
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
