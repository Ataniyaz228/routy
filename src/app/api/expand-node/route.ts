import { NextRequest, NextResponse } from 'next/server';
import { expandNode } from '@/lib/ai';
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

        const { nodeId, treeId } = await req.json();

        // Get the node to expand
        const nodeResult = await pool.query('SELECT * FROM nodes WHERE id = $1 AND tree_id = $2', [nodeId, treeId]);
        if (nodeResult.rows.length === 0) {
            return NextResponse.json({ error: 'Node not found' }, { status: 404 });
        }

        const parentNode = nodeResult.rows[0];

        // Get tree info for global context
        const treeResult = await pool.query('SELECT goal FROM skill_trees WHERE id = $1', [treeId]);
        const treeGoal = treeResult.rows[0]?.goal || '';

        // Get full context (all node labels + statuses)
        const contextResult = await pool.query('SELECT label, status FROM nodes WHERE tree_id = $1', [treeId]);
        const treeContext = contextResult.rows.map((r: { label: string; status: string }) => ({ label: r.label, status: r.status }));

        // Generate sub-tree with full context
        const generated = await expandNode(parentNode.label, parentNode.description, treeGoal, treeContext);

        // Map temp IDs
        const idMap = new Map<string, string>();
        idMap.set('parent_node', nodeId);

        for (const node of generated.nodes) {
            idMap.set(node.temp_id, uuidv4());
        }

        // Get parent position for offset
        const parentX = parentNode.position_x;
        const parentY = parentNode.position_y;

        const dbNodes: SkillNode[] = generated.nodes.map((n, i) => ({
            id: idMap.get(n.temp_id)!,
            tree_id: treeId,
            parent_id: n.parent_temp_id ? (idMap.get(n.parent_temp_id) || nodeId) : nodeId,
            label: n.label,
            description: n.description || '',
            theory: n.theory || '',
            difficulty: n.difficulty,
            status: parentNode.status === 'completed' ? 'unlocked' : 'locked',
            position_x: 0,
            position_y: 0,
            node_type: n.node_type === 'root' ? 'skill' : n.node_type,
            resources: n.resources || '',
            origin: 'expanded' as const,
            created_at: new Date().toISOString(),
        }));

        const dbEdges: SkillEdge[] = generated.edges.map((e) => ({
            id: uuidv4(),
            tree_id: treeId,
            source_id: idMap.get(e.source_temp_id) || nodeId,
            target_id: idMap.get(e.target_temp_id)!,
        }));

        // Get all existing nodes and edges to do proper layouting
        const allNodesResult = await pool.query('SELECT * FROM nodes WHERE tree_id = $1', [treeId]);
        const allEdgesResult = await pool.query('SELECT * FROM edges WHERE tree_id = $1', [treeId]);

        const allNodes = [...allNodesResult.rows, ...dbNodes];
        const allEdges = [...allEdgesResult.rows, ...dbEdges];

        // Re-layout the entire tree
        const layoutedAll = layoutTree(allNodes as SkillNode[], allEdges as SkillEdge[]);

        // Insert new nodes
        for (const node of dbNodes) {
            const layouted = layoutedAll.find(l => l.id === node.id);
            const status = parentNode.status === 'completed' ? 'unlocked' : 'locked';
            await pool.query(
                `INSERT INTO nodes (id, tree_id, parent_id, label, description, theory, difficulty, status, position_x, position_y, node_type, resources, origin)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                [
                    node.id, treeId, node.parent_id, node.label, node.description,
                    node.theory, node.difficulty, status,
                    layouted?.position_x ?? node.position_x,
                    layouted?.position_y ?? node.position_y,
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

        // Update positions of existing nodes (if re-layout changed them)
        for (const existing of allNodesResult.rows) {
            const layouted = layoutedAll.find(l => l.id === existing.id);
            if (layouted && (layouted.position_x !== existing.position_x || layouted.position_y !== existing.position_y)) {
                await pool.query(
                    'UPDATE nodes SET position_x = $1, position_y = $2 WHERE id = $3',
                    [layouted.position_x, layouted.position_y, existing.id]
                );
            }
        }

        return NextResponse.json({
            newNodes: dbNodes.length,
            newEdges: dbEdges.length,
        });
    } catch (error: unknown) {
        console.error('Expand node error:', error);
        const message = error instanceof Error ? error.message : 'Failed to expand node';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
