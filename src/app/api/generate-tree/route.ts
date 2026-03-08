import { NextRequest, NextResponse } from 'next/server';
import { generateTree } from '@/lib/ai';
import { getCurrentUser } from '@/lib/auth';
import pool from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { layoutTree } from '@/lib/tree-utils';
import { SkillNode, SkillEdge } from '@/lib/types';

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { goal } = await req.json();
        if (!goal || typeof goal !== 'string' || goal.trim().length < 3) {
            return NextResponse.json({ error: 'Goal must be at least 3 characters' }, { status: 400 });
        }

        // Generate tree structure from AI
        const generated = await generateTree(goal.trim());

        // Create skill tree record
        const treeId = uuidv4();
        await pool.query(
            'INSERT INTO skill_trees (id, user_id, title, goal) VALUES ($1, $2, $3, $4)',
            [treeId, user.id, goal.trim(), goal.trim()]
        );

        // Map temp_ids to real UUIDs
        const idMap = new Map<string, string>();
        for (const node of generated.nodes) {
            idMap.set(node.temp_id, uuidv4());
        }

        // Build nodes with positions
        const dbNodes: SkillNode[] = generated.nodes.map((n) => ({
            id: idMap.get(n.temp_id)!,
            tree_id: treeId,
            parent_id: n.parent_temp_id ? (idMap.get(n.parent_temp_id) || null) : null,
            label: n.label,
            description: n.description || '',
            theory: n.theory || '',
            difficulty: n.difficulty,
            status: n.node_type === 'root' ? 'unlocked' : 'locked',
            position_x: 0,
            position_y: 0,
            node_type: n.node_type,
            resources: n.resources || '',
            origin: 'main' as const,
            created_at: new Date().toISOString(),
        }));

        const dbEdges: SkillEdge[] = generated.edges.map((e) => ({
            id: uuidv4(),
            tree_id: treeId,
            source_id: idMap.get(e.source_temp_id)!,
            target_id: idMap.get(e.target_temp_id)!,
        }));

        // Auto-layout
        const layoutedNodes = layoutTree(dbNodes, dbEdges);

        // Find root and unlock its direct children
        const rootNode = layoutedNodes.find(n => n.node_type === 'root');
        const rootChildIds = new Set(
            dbEdges.filter(e => e.source_id === rootNode?.id).map(e => e.target_id)
        );

        // Insert nodes
        for (const node of layoutedNodes) {
            const status = node.node_type === 'root' ? 'unlocked' :
                rootChildIds.has(node.id) ? 'unlocked' : 'locked';
            await pool.query(
                `INSERT INTO nodes (id, tree_id, parent_id, label, description, theory, difficulty, status, position_x, position_y, node_type, resources, origin)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                [
                    node.id, treeId, node.parent_id, node.label, node.description,
                    node.theory, node.difficulty, status, node.position_x, node.position_y, node.node_type,
                    node.resources || '', 'main',
                ]
            );
        }

        // Insert edges
        for (const edge of dbEdges) {
            await pool.query(
                'INSERT INTO edges (id, tree_id, source_id, target_id) VALUES ($1, $2, $3, $4)',
                [edge.id, edge.tree_id, edge.source_id, edge.target_id]
            );
        }

        return NextResponse.json({ treeId, nodeCount: layoutedNodes.length });
    } catch (error: unknown) {
        console.error('Generate tree error:', error);
        const message = error instanceof Error ? error.message : 'Failed to generate tree';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
