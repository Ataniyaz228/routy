import React from 'react';
import type { Node, Edge } from '@xyflow/react';
import { FlowNodeData, SkillNode, SkillEdge } from './types';

// Layout constants
const HORIZONTAL_SPACING = 280;
const VERTICAL_SPACING = 150;

/**
 * Convert database nodes/edges to React Flow format
 */
export function toFlowElements(
    dbNodes: SkillNode[],
    dbEdges: SkillEdge[]
): { nodes: Node<FlowNodeData>[]; edges: Edge[] } {
    // Build lookup maps for edge styling
    const statusMap = new Map<string, string>();
    const originMap = new Map<string, string>();
    for (const n of dbNodes) {
        statusMap.set(n.id, n.status);
        originMap.set(n.id, n.origin || 'main');
    }

    const nodes: Node<FlowNodeData>[] = dbNodes.map((n) => ({
        id: n.id,
        type: 'skillNode',
        position: { x: n.position_x, y: n.position_y },
        data: {
            label: n.label,
            description: n.description,
            theory: n.theory,
            difficulty: n.difficulty,
            status: n.status,
            nodeType: n.node_type,
            dbId: n.id,
            parentId: n.parent_id,
            treeId: n.tree_id,
            resources: n.resources || '',
            origin: n.origin || 'main',
        },
    }));

    const edges: Edge[] = dbEdges.map((e) => {
        const sourceStatus = statusMap.get(e.source_id) || 'locked';
        const targetStatus = statusMap.get(e.target_id) || 'locked';
        const targetOrigin = originMap.get(e.target_id) || 'main';
        const isExpanded = targetOrigin === 'expanded';

        let style: React.CSSProperties;
        let animated = false;

        if (sourceStatus === 'completed' && targetStatus === 'completed') {
            // Completed: emerald energy flow (dimmer for expanded)
            style = {
                stroke: isExpanded ? 'rgba(0, 229, 160, 0.5)' : '#00e5a0',
                strokeWidth: isExpanded ? 1.5 : 2,
            };
            animated = true;
        } else if (sourceStatus === 'completed' && targetStatus === 'unlocked') {
            // Available: solid line (thinner for expanded)
            style = {
                stroke: isExpanded ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.25)',
                strokeWidth: isExpanded ? 1 : 1.5,
                ...(isExpanded ? { strokeDasharray: '4 3' } : {}),
            };
        } else {
            // Locked: dashed dim (even dimmer for expanded)
            style = {
                stroke: isExpanded ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
                strokeWidth: 1,
                strokeDasharray: '6 4',
            };
        }

        return {
            id: e.id,
            source: e.source_id,
            target: e.target_id,
            type: 'smoothstep',
            animated,
            style,
        };
    });

    return { nodes, edges };
}

/**
 * Auto-layout nodes in a tree formation (top-down)
 */
export function layoutTree(
    nodes: SkillNode[],
    edges: SkillEdge[]
): SkillNode[] {
    if (nodes.length === 0) return nodes;

    // Build adjacency list
    const children = new Map<string, string[]>();
    const parentMap = new Map<string, string>();

    for (const edge of edges) {
        if (!children.has(edge.source_id)) {
            children.set(edge.source_id, []);
        }
        children.get(edge.source_id)!.push(edge.target_id);
        parentMap.set(edge.target_id, edge.source_id);
    }

    // Find root node(s)
    const roots = nodes.filter((n) => !parentMap.has(n.id));
    if (roots.length === 0) {
        // Fallback: use first node
        roots.push(nodes[0]);
    }

    // BFS to assign positions
    const positions = new Map<string, { x: number; y: number }>();
    const nodeWidths = new Map<string, number>();

    // Calculate subtree widths
    function getSubtreeWidth(nodeId: string): number {
        if (nodeWidths.has(nodeId)) return nodeWidths.get(nodeId)!;

        const kids = children.get(nodeId) || [];
        if (kids.length === 0) {
            nodeWidths.set(nodeId, 1);
            return 1;
        }

        const totalWidth = kids.reduce((sum, kid) => sum + getSubtreeWidth(kid), 0);
        nodeWidths.set(nodeId, totalWidth);
        return totalWidth;
    }

    function layoutSubtree(nodeId: string, x: number, y: number) {
        positions.set(nodeId, { x, y });

        const kids = children.get(nodeId) || [];
        if (kids.length === 0) return;

        const totalWidth = getSubtreeWidth(nodeId);
        let currentX = x - (totalWidth * HORIZONTAL_SPACING) / 2;

        for (const kid of kids) {
            const kidWidth = getSubtreeWidth(kid);
            const kidX = currentX + (kidWidth * HORIZONTAL_SPACING) / 2;
            layoutSubtree(kid, kidX, y + VERTICAL_SPACING);
            currentX += kidWidth * HORIZONTAL_SPACING;
        }
    }

    // Layout from root
    for (let i = 0; i < roots.length; i++) {
        layoutSubtree(roots[i].id, i * HORIZONTAL_SPACING * 5, 0);
    }

    // Apply positions
    return nodes.map((node) => ({
        ...node,
        position_x: positions.get(node.id)?.x ?? node.position_x,
        position_y: positions.get(node.id)?.y ?? node.position_y,
    }));
}

/**
 * Calculate XP for a node based on difficulty
 */
export function calculateXP(difficulty: number): number {
    return difficulty * 25;
}

/**
 * Get all descendant node IDs of a given node
 */
export function getDescendants(
    nodeId: string,
    edges: SkillEdge[]
): string[] {
    const children = new Map<string, string[]>();
    for (const edge of edges) {
        if (!children.has(edge.source_id)) {
            children.set(edge.source_id, []);
        }
        children.get(edge.source_id)!.push(edge.target_id);
    }

    const descendants: string[] = [];
    const queue = [nodeId];

    while (queue.length > 0) {
        const current = queue.shift()!;
        const kids = children.get(current) || [];
        for (const kid of kids) {
            descendants.push(kid);
            queue.push(kid);
        }
    }

    return descendants;
}
