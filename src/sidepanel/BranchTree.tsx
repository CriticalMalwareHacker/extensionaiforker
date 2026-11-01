import React, { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  Edge,
  Node,
  Position,
  ConnectionLineType,
} from "reactflow";
import "reactflow/dist/style.css";
import { BranchNode } from "../shared/types";
import { BranchNodeComponent } from "./BranchNodeComponent";

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
}

export const BranchTree: React.FC<BranchTreeProps> = ({
  nodes,
  activeChatUrl,
  searchQuery,
  onSelectNode,
  onMergeNode,
  onDeleteNode,
}) => {
  // Filter nodes matching search query
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

  // Compute hierarchical tree layout
  const { flowNodes, flowEdges } = useMemo(() => {
    const nodeMap = new Map(filteredNodes.map((n) => [n.id, n]));
    const childrenMap = new Map<string, string[]>();

    // Build children relationships
    for (const node of filteredNodes) {
      if (node.parentId && nodeMap.has(node.parentId)) {
        const list = childrenMap.get(node.parentId) || [];
        list.push(node.id);
        childrenMap.set(node.parentId, list);
      }
    }

    // Identify roots
    const rootNodes = filteredNodes.filter(
      (n) => !n.parentId || !nodeMap.has(n.parentId)
    );

    const positions = new Map<string, { x: number; y: number }>();
    let currentX = 50;

    function layoutSubtree(nodeId: string, depth: number): { minX: number; maxX: number } {
      const children = childrenMap.get(nodeId) || [];
      const y = depth * 170 + 50;

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

    const flowNodes: Node[] = filteredNodes.map((n) => {
      const pos = positions.get(n.id) || { x: 50, y: 50 };
      const isCurrentTab = Boolean(
        activeChatUrl && n.chat?.url && activeChatUrl.includes(n.chat.conversationId)
      );

      return {
        id: n.id,
        type: "branchNode",
        position: pos,
        data: {
          node: n,
          isCurrentTab,
          onSelect: onSelectNode,
          onMerge: onMergeNode,
          onDelete: onDeleteNode,
        },
      };
    });

    const flowEdges: Edge[] = [];
    for (const node of filteredNodes) {
      if (node.parentId && nodeMap.has(node.parentId)) {
        flowEdges.push({
          id: `e-${node.parentId}-${node.id}`,
          source: node.parentId,
          target: node.id,
          type: ConnectionLineType.SmoothStep,
          animated: node.isMerged,
          style: {
            stroke: node.isMerged ? "#a855f7" : "#38bdf8",
            strokeWidth: 2,
          },
        });
      }
    }

    return { flowNodes, flowEdges };
  }, [filteredNodes, activeChatUrl, onSelectNode, onMergeNode, onDeleteNode]);

  if (filteredNodes.length === 0) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#94a3b8",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <div style={{ fontSize: "36px", marginBottom: "12px" }}>🌿</div>
        <div style={{ fontSize: "16px", fontWeight: "600", color: "#f1f5f9", marginBottom: "6px" }}>
          No branches yet
        </div>
        <div style={{ fontSize: "13px", maxWidth: "280px", lineHeight: "1.5" }}>
          Open ChatGPT, Claude, or Gemini and click the <b>Fork</b> button on any message to create your first branch!
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", background: "#090d16" }}>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={1.5}
      >
        <Background color="#334155" gap={20} size={1} />
        <Controls style={{ background: "#1e293b", borderColor: "#334155" }} />
      </ReactFlow>
    </div>
  );
};
