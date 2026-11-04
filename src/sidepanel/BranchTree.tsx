import React, { useMemo, useCallback } from "react";
import ReactFlow, {
  Background,
  Controls,
  Edge,
  Node,
  ConnectionLineType,
  BackgroundVariant,
  Connection,
  useNodesState,
  useEdgesState,
  addEdge,
} from "reactflow";
import "reactflow/dist/style.css";
import { BranchNode, BranchGroup } from "../shared/types";
import { BranchNodeComponent } from "./BranchNodeComponent";
import { GitBranch, RotateCcw } from "lucide-react";

const nodeTypes = {
  branchNode: BranchNodeComponent,
};

export interface BranchTreeProps {
  nodes: BranchNode[];
  groups?: BranchGroup[];
  activeChatUrl?: string | null;
  searchQuery?: string;
  selectedPlatform?: string;
  selectedGroupId?: string;
  onSelectNode?: (node: BranchNode) => void;
  onNodeClick?: (node: BranchNode) => void;
  onOpenBranch?: (node: BranchNode) => void;
  onMergeNode?: (node: BranchNode) => void;
  onStartMerge?: (node: BranchNode) => void;
  onDeleteNode?: (nodeId: string) => void;
  onLinkNodes?: (sourceId: string, targetId: string) => void;
  onRenameNode?: (nodeId: string, newLabel: string) => void;
  onResetFilters?: () => void;
}

export const BranchTree: React.FC<BranchTreeProps> = ({
  nodes = [],
  groups = [],
  activeChatUrl,
  searchQuery = "",
  selectedPlatform = "all",
  selectedGroupId = "all",
  onSelectNode,
  onNodeClick,
  onOpenBranch,
  onMergeNode,
  onStartMerge,
  onDeleteNode,
  onLinkNodes,
  onRenameNode,
  onResetFilters,
}) => {
  const selectHandler = useCallback(
    (node: BranchNode) => {
      if (onSelectNode) onSelectNode(node);
      else if (onNodeClick) onNodeClick(node);
      else if (onOpenBranch) onOpenBranch(node);
    },
    [onSelectNode, onNodeClick, onOpenBranch]
  );

  const mergeHandler = useCallback(
    (node: BranchNode) => {
      if (onMergeNode) onMergeNode(node);
      else if (onStartMerge) onStartMerge(node);
    },
    [onMergeNode, onStartMerge]
  );

  const deleteHandler = useCallback(
    (nodeId: string) => {
      if (onDeleteNode) onDeleteNode(nodeId);
    },
    [onDeleteNode]
  );

  const renameHandler = useCallback(
    (nodeId: string, newLabel: string) => {
      if (onRenameNode) onRenameNode(nodeId, newLabel);
    },
    [onRenameNode]
  );

  const normalizePlatform = (site?: string) => {
    if (!site) return "";
    const s = site.toLowerCase().trim();
    if (s === "google") return "gemini";
    return s;
  };

  const getGroupName = useCallback(
    (groupId?: string | null) => {
      if (!groupId) return null;
      return (groups || []).find((g) => g.id === groupId)?.name || null;
    },
    [groups]
  );

  const filteredNodes = useMemo(() => {
    const q = (searchQuery || "").trim().toLowerCase();
    const targetPlatform = (selectedPlatform || "all").toLowerCase().trim();

    return (nodes || []).filter((n) => {
      if (!n) return false;
      const label = (n.label || "").toLowerCase();
      const summary = (n.summary || "").toLowerCase();
      const chatTitle = (n.chat?.title || "").toLowerCase();
      const tags = Array.isArray(n.tags) ? n.tags : [];
      const nodeSite = normalizePlatform(n.chat?.site || tags[0]);
      const groupName = (getGroupName(n.groupId) || "").toLowerCase();

      const matchesSearch =
        !q ||
        label.includes(q) ||
        summary.includes(q) ||
        chatTitle.includes(q) ||
        nodeSite.includes(q) ||
        tags.some((t) => (t || "").toLowerCase().includes(q)) ||
        groupName.includes(q);

      const matchesPlatform =
        targetPlatform === "all" ||
        nodeSite === targetPlatform ||
        tags.some((t) => normalizePlatform(t) === targetPlatform);

      const matchesGroup =
        !selectedGroupId ||
        selectedGroupId === "all" ||
        (selectedGroupId === "ungrouped" ? !n.groupId : n.groupId === selectedGroupId);

      return matchesSearch && matchesPlatform && matchesGroup;
    });
  }, [nodes, searchQuery, selectedPlatform, selectedGroupId, getGroupName]);

  const { initialNodes, initialEdges } = useMemo(() => {
    const safeNodes = filteredNodes || [];
    const nodeMap = new Map(safeNodes.map((n) => [n.id, n]));
    const childrenMap = new Map<string, string[]>();

    for (const node of safeNodes) {
      if (node.parentId && nodeMap.has(node.parentId)) {
        const list = childrenMap.get(node.parentId) || [];
        list.push(node.id);
        childrenMap.set(node.parentId, list);
      }
    }

    const rootNodes = safeNodes.filter((n) => !n.parentId || !nodeMap.has(n.parentId));

    const positions = new Map<string, { x: number; y: number }>();
    let currentX = 40;

    function layoutSubtree(nodeId: string, depth: number): { minX: number; maxX: number } {
      const children = childrenMap.get(nodeId) || [];
      const y = depth * 170 + 40;

      if (children.length === 0) {
        const x = currentX;
        currentX += 280;
        positions.set(nodeId, { x, y });
        return { minX: x, maxX: x };
      }

      let minChildX = Infinity;
      let maxChildX = -Infinity;

      for (const childId of children) {
        const range = layoutSubtree(childId, depth + 1);
        minChildX = Math.min(minChildX, range.minX);
        maxChildX = Math.max(maxChildX, range.maxX);
      }

      const x = (minChildX + maxChildX) / 2;
      positions.set(nodeId, { x, y });
      return { minX: minChildX, maxX: maxChildX };
    }

    for (const root of rootNodes) {
      layoutSubtree(root.id, 0);
      currentX += 80;
    }

    const initialNodes: Node[] = safeNodes.map((n) => {
      const pos = positions.get(n.id) || { x: 40, y: 40 };
      const isCurrentTab = Boolean(
        activeChatUrl && n.chat?.url && activeChatUrl.includes(n.chat.conversationId)
      );

      return {
        id: n.id,
        type: "branchNode",
        position: pos,
        draggable: true,
        data: {
          node: n,
          isCurrentTab,
          onSelect: selectHandler,
          onMerge: mergeHandler,
          onDelete: deleteHandler,
          onRename: renameHandler,
        },
      };
    });

    const initialEdges: Edge[] = [];
    for (const node of safeNodes) {
      if (node.parentId && nodeMap.has(node.parentId)) {
        initialEdges.push({
          id: `e-${node.parentId}-${node.id}`,
          source: node.parentId,
          target: node.id,
          type: ConnectionLineType.SmoothStep,
          animated: Boolean(node.isMerged),
          style: {
            stroke: node.isMerged ? "#ffffff" : "#71717a",
            strokeWidth: node.isMerged ? 2 : 1.5,
          },
        });
      }
    }

    return { initialNodes, initialEdges };
  }, [filteredNodes, activeChatUrl, selectHandler, mergeHandler, deleteHandler, renameHandler]);

  const [flowNodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const handleConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        setEdges((eds) =>
          addEdge(
            {
              ...params,
              type: ConnectionLineType.SmoothStep,
              style: { stroke: "#fafafa", strokeWidth: 1.5 },
            },
            eds
          )
        );
        onLinkNodes?.(params.source, params.target);
      }
    },
    [setEdges, onLinkNodes]
  );

  const hasActiveFilters =
    (searchQuery || "").trim().length > 0 ||
    selectedPlatform !== "all" ||
    selectedGroupId !== "all";

  if (filteredNodes.length === 0) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--fl-muted)",
          textAlign: "center",
          padding: "32px 24px",
          fontFamily: "'Inter', sans-serif",
          background: "var(--fl-canvas)",
        }}
      >
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "12px",
            border: "1px solid var(--fl-border)",
            backgroundColor: "var(--fl-surface)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "16px",
            color: "var(--fl-text)",
          }}
        >
          <GitBranch size={20} />
        </div>
        <div
          style={{
            fontSize: "14px",
            fontWeight: "650",
            color: "var(--fl-text)",
            marginBottom: "6px",
            letterSpacing: "-0.2px",
          }}
        >
          {hasActiveFilters ? "No branches match your filters" : "No branches yet"}
        </div>
        <div
          style={{
            fontSize: "12px",
            color: "var(--fl-muted)",
            maxWidth: "260px",
            lineHeight: "1.5",
          }}
        >
          {hasActiveFilters
            ? "Try resetting your search query, group, or platform filters."
            : "Open ChatGPT, Claude, or Gemini and click Fork on any message to start branching."}
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
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <RotateCcw size={12} />
            Clear All Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", background: "var(--fl-canvas)" }}>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        fitView
        minZoom={0.2}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="var(--fl-border)"
        />
        <Controls
          style={{
            background: "var(--fl-surface)",
            border: "1px solid var(--fl-border)",
            borderRadius: "12px",
            boxShadow: "0 4px 12px var(--fl-shadow)",
          }}
        />
      </ReactFlow>
    </div>
  );
};
