import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import pool from '@/lib/db';
import { calculateXP, getDescendants } from '@/lib/tree-utils';

// POST /api/node/complete — Mark a node as completed
export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { nodeId, treeId } = await req.json();

        // Verify ownership
        const treeResult = await pool.query(
            'SELECT * FROM skill_trees WHERE id = $1 AND user_id = $2',
            [treeId, user.id]
        );
        if (treeResult.rows.length === 0) {
            return NextResponse.json({ error: 'Tree not found' }, { status: 404 });
        }

        // Get the node
        const nodeResult = await pool.query(
            'SELECT * FROM nodes WHERE id = $1 AND tree_id = $2',
            [nodeId, treeId]
        );
        if (nodeResult.rows.length === 0) {
            return NextResponse.json({ error: 'Node not found' }, { status: 404 });
        }

        const node = nodeResult.rows[0];

        if (node.status === 'locked') {
            return NextResponse.json({ error: 'Node is locked' }, { status: 400 });
        }

        if (node.status === 'completed') {
            return NextResponse.json({ error: 'Node already completed' }, { status: 400 });
        }

        // Mark as completed
        await pool.query(
            "UPDATE nodes SET status = 'completed' WHERE id = $1",
            [nodeId]
        );

        // Unlock children
        const childEdges = await pool.query(
            'SELECT target_id FROM edges WHERE source_id = $1 AND tree_id = $2',
            [nodeId, treeId]
        );

        for (const edge of childEdges.rows) {
            await pool.query(
                "UPDATE nodes SET status = 'unlocked' WHERE id = $1 AND status = 'locked'",
                [edge.target_id]
            );
        }

        // Award XP
        const xp = calculateXP(node.difficulty);
        await pool.query(
            'UPDATE skill_trees SET xp_total = xp_total + $1 WHERE id = $2',
            [xp, treeId]
        );
        await pool.query(
            'UPDATE users SET xp = xp + $1 WHERE id = $2',
            [xp, user.id]
        );

        // Update user level (every 500 XP = 1 level)
        await pool.query(
            'UPDATE users SET level = GREATEST(1, (xp / 500) + 1) WHERE id = $1',
            [user.id]
        );

        return NextResponse.json({
            success: true,
            xpAwarded: xp,
            unlockedNodes: childEdges.rows.map((e: { target_id: string }) => e.target_id),
        });
    } catch (error: unknown) {
        console.error('Complete node error:', error);
        return NextResponse.json({ error: 'Failed to complete node' }, { status: 500 });
    }
}
