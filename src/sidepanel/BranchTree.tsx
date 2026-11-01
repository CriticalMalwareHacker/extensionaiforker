import React, { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  Edge,
  Node,
  ConnectionLineType,
  BackgroundVariant,
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
}

export const BranchTree: React.FC<BranchTreeProps> = ({
  nodes,
  activeChatUrl,
  searchQuery,
  onSelectNode,
  onMergeNode,
  onDeleteNode,
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

  const { flowNodes, flowEdges } = useMemo(() => {
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
      const y = depth * 160 + 40;

      if (children.length === 0) {
        const x = currentX;
        currentX += 270;
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
      currentX += 60;
    }

    const flowNodes: Node[] = filteredNodes.map((n) => {
      const pos = positions.get(n.id) || { x: 40, y: 40 };
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
            stroke: node.isMerged ? "#ffffff" : "#3f3f46",
            strokeWidth: node.isMerged ? 1.5 : 1.2,
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
          color: "#71717a",
          textAlign: "center",
          padding: "32px 24px",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            border: "1px solid #27272a",
            backgroundColor: "#09090b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "16px",
            color: "#fafafa",
          }}
        >
          <GitBranch size={18} />
        </div>
        <div
          style={{
            fontSize: "14px",
            fontWeight: "600",
            color: "#fafafa",
            marginBottom: "6px",
            letterSpacing: "-0.2px",
          }}
        >
          No branches yet
        </div>
        <div
          style={{
            fontSize: "12px",
            color: "#71717a",
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
    <div style={{ width: "100%", height: "100%", background: "#000000" }}>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={1.5}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#1c1c1f"
        />
        <Controls
          style={{
            background: "#09090b",
            border: "1px solid #27272a",
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
          }}
        />
      </ReactFlow>
    </div>
  );
};
