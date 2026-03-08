import { NextRequest, NextResponse } from 'next/server';
import { generateMacroBranch } from '@/lib/ai';
import { getCurrentUser } from '@/lib/auth';
import pool from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { SkillNode, SkillEdge } from '@/lib/types';
import { layoutTree } from '@/lib/tree-utils';

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { macroGoal, treeId } = await req.json();
        if (!macroGoal?.trim() || !treeId) {
            return NextResponse.json({ error: 'macroGoal and treeId required' }, { status: 400 });
        }

        // Get tree info
        const treeResult = await pool.query('SELECT * FROM skill_trees WHERE id = $1 AND user_id = $2', [treeId, user.id]);
        if (treeResult.rows.length === 0) {
            return NextResponse.json({ error: 'Tree not found' }, { status: 404 });
        }
        const tree = treeResult.rows[0];

        // Get all nodes with children info for context
        const nodesResult = await pool.query('SELECT * FROM nodes WHERE tree_id = $1', [treeId]);
        const edgesResult = await pool.query('SELECT * FROM edges WHERE tree_id = $1', [treeId]);

        const allNodes = nodesResult.rows;
        const allEdges = edgesResult.rows;

        // Build children set
        const hasChildren = new Set<string>();
        for (const e of allEdges) {
            hasChildren.add(e.source_id);
        }

        const treeContext = allNodes.map((n: SkillNode) => ({
            label: n.label,
            status: n.status,
            has_children: hasChildren.has(n.id),
        }));

        // AI generates macro-branch with anchor discovery
        const generated = await generateMacroBranch(macroGoal.trim(), tree.goal, treeContext);

        // Resolve anchor node
        let anchorId: string | null = null;
        if (generated.anchor_node_label) {
            const anchor = allNodes.find(
                (n: SkillNode) => n.label.toLowerCase() === generated.anchor_node_label!.toLowerCase()
            );
            if (anchor) {
                anchorId = anchor.id;
            }
        }

        // Map temp IDs to real UUIDs
        const idMap = new Map<string, string>();
        if (anchorId) {
            idMap.set('anchor', anchorId);
        }

        for (const node of generated.nodes) {
            idMap.set(node.temp_id, uuidv4());
        }

        // Determine status for new nodes
        const anchorNode = anchorId ? allNodes.find((n: SkillNode) => n.id === anchorId) : null;
        const newNodeStatus = anchorNode?.status === 'completed' ? 'unlocked' : 'locked';

        // Build DB nodes
        const dbNodes: SkillNode[] = generated.nodes.map((n) => ({
            id: idMap.get(n.temp_id)!,
            tree_id: treeId,
            parent_id: n.parent_temp_id ? (idMap.get(n.parent_temp_id) || anchorId) : anchorId,
            label: n.label,
            description: n.description || '',
            theory: n.theory || '',
            difficulty: n.difficulty,
            status: n.parent_temp_id === 'anchor' || n.parent_temp_id === null ? newNodeStatus : 'locked',
            position_x: 0,
            position_y: 0,
            node_type: !anchorId && !n.parent_temp_id ? 'root' : (n.node_type === 'root' ? 'skill' : n.node_type),
            resources: n.resources || '',
            origin: 'expanded' as const,
            created_at: new Date().toISOString(),
        }));

        const dbEdges: SkillEdge[] = generated.edges.map((e) => ({
            id: uuidv4(),
            tree_id: treeId,
            source_id: idMap.get(e.source_temp_id) || anchorId || idMap.get(generated.nodes[0].temp_id)!,
            target_id: idMap.get(e.target_temp_id)!,
        }));

        // Re-layout the entire tree
        const combinedNodes = [...allNodes, ...dbNodes];
        const combinedEdges = [...allEdges, ...dbEdges];
        const layoutedAll = layoutTree(combinedNodes as SkillNode[], combinedEdges as SkillEdge[]);

        // Insert new nodes
        for (const node of dbNodes) {
            const layouted = layoutedAll.find((l) => l.id === node.id);
            await pool.query(
                `INSERT INTO nodes (id, tree_id, parent_id, label, description, theory, difficulty, status, position_x, position_y, node_type, resources, origin)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                [
                    node.id, treeId, node.parent_id, node.label, node.description,
                    node.theory, node.difficulty, node.status,
                    layouted?.position_x ?? 0,
                    layouted?.position_y ?? 0,
                    node.node_type,
                    node.resources || '', 'expanded',
                ]
            );
        }

        // Insert new edges
        for (const edge of dbEdges) {
            await pool.query(
                'INSERT INTO edges (id, tree_id, source_id, target_id) VALUES ($1, $2, $3, $4)',
                [edge.id, edge.tree_id, edge.source_id, edge.target_id]
            );
        }

        // Update positions of existing nodes
        for (const existing of allNodes) {
            const layouted = layoutedAll.find((l: SkillNode) => l.id === existing.id);
            if (layouted && (layouted.position_x !== existing.position_x || layouted.position_y !== existing.position_y)) {
                await pool.query(
                    'UPDATE nodes SET position_x = $1, position_y = $2 WHERE id = $3',
                    [layouted.position_x, layouted.position_y, existing.id]
                );
            }
        }

        // Return the IDs of new nodes so the frontend can zoom to them
        return NextResponse.json({
            newNodeIds: dbNodes.map((n) => n.id),
            anchorLabel: generated.anchor_node_label,
            newNodesCount: dbNodes.length,
        });
    } catch (error: unknown) {
        console.error('Macro-expand error:', error);
        const message = error instanceof Error ? error.message : 'Failed to generate macro-branch';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
