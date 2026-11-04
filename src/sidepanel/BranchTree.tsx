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
import { BranchNode } from "../shared/types";
import { BranchNodeComponent } from "./BranchNodeComponent";
import { GitBranch } from "lucide-react";

const nodeTypes = {
  branchNode: BranchNodeComponent,
};

interface BranchTreeProps {
  nodes: BranchNode[];
  activeChatUrl?: string | null;
  searchQuery: string;
  onSelectNode: (node: BranchNode) => void;
  onMergeNode: (node: BranchNode) => void;
  onDeleteNode: (nodeId: string) => void;
  onLinkNodes?: (sourceId: string, targetId: string) => void;
  onRenameNode?: (nodeId: string, newLabel: string) => void;
}

export const BranchTree: React.FC<BranchTreeProps> = ({
  nodes,
  activeChatUrl,
  searchQuery,
  onSelectNode,
  onMergeNode,
  onDeleteNode,
  onLinkNodes,
  onRenameNode,
}) => {
  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return nodes;
    const q = searchQuery.toLowerCase();
    return nodes.filter(
      (n) =>
        n.label.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q)) ||
        n.chat?.site.toLowerCase().includes(q)
    );
  }, [nodes, searchQuery]);

  const { initialNodes, initialEdges } = useMemo(() => {
    const nodeMap = new Map(filteredNodes.map((n) => [n.id, n]));
    const childrenMap = new Map<string, string[]>();

    for (const node of filteredNodes) {
      if (node.parentId && nodeMap.has(node.parentId)) {
        const list = childrenMap.get(node.parentId) || [];
        list.push(node.id);
        childrenMap.set(node.parentId, list);
      }
    }

    const rootNodes = filteredNodes.filter(
      (n) => !n.parentId || !nodeMap.has(n.parentId)
    );

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

    const initialNodes: Node[] = filteredNodes.map((n) => {
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
          onSelect: onSelectNode,
          onMerge: onMergeNode,
          onDelete: onDeleteNode,
          onRename: onRenameNode,
        },
      };
    });

    const initialEdges: Edge[] = [];
    for (const node of filteredNodes) {
      if (node.parentId && nodeMap.has(node.parentId)) {
        initialEdges.push({
          id: `e-${node.parentId}-${node.id}`,
          source: node.parentId,
          target: node.id,
          type: ConnectionLineType.SmoothStep,
          animated: node.isMerged,
          style: {
            stroke: node.isMerged ? "#ffffff" : "#71717a",
            strokeWidth: node.isMerged ? 2 : 1.5,
          },
        });
      }
    }

    return { initialNodes, initialEdges };
  }, [filteredNodes, activeChatUrl, onSelectNode, onMergeNode, onDeleteNode, onRenameNode]);

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
          No branches yet
        </div>
        <div
          style={{
            fontSize: "12px",
            color: "var(--fl-muted)",
            maxWidth: "260px",
            lineHeight: "1.5",
          }}
        >
          Open ChatGPT, Claude, or Gemini and click <b>Fork</b> on any message to start branching.
        </div>
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
