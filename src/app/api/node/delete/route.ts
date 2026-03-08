import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import pool from '@/lib/db';
import { getDescendants } from '@/lib/tree-utils';

// DELETE /api/node/delete — Delete a node and its descendants
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

        // Get node
        const nodeResult = await pool.query(
            'SELECT * FROM nodes WHERE id = $1 AND tree_id = $2',
            [nodeId, treeId]
        );
        if (nodeResult.rows.length === 0) {
            return NextResponse.json({ error: 'Node not found' }, { status: 404 });
        }

        if (nodeResult.rows[0].node_type === 'root') {
            return NextResponse.json({ error: 'Cannot delete root node' }, { status: 400 });
        }

        // Get all descendant IDs
        const edgesResult = await pool.query('SELECT * FROM edges WHERE tree_id = $1', [treeId]);
        const descendants = getDescendants(nodeId, edgesResult.rows);
        const allToDelete = [nodeId, ...descendants];

        // Delete edges involving these nodes
        for (const id of allToDelete) {
            await pool.query(
                'DELETE FROM edges WHERE (source_id = $1 OR target_id = $1) AND tree_id = $2',
                [id, treeId]
            );
        }

        // Delete the nodes
        for (const id of allToDelete) {
            await pool.query('DELETE FROM nodes WHERE id = $1', [id]);
        }

        return NextResponse.json({
            success: true,
            deletedCount: allToDelete.length,
        });
    } catch (error: unknown) {
        console.error('Delete node error:', error);
        return NextResponse.json({ error: 'Failed to delete node' }, { status: 500 });
    }
}
