import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import pool from '@/lib/db';
import { getDescendants, calculateXP } from '@/lib/tree-utils';

// GET /api/tree/[id] — Fetch full tree data
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Get tree
        const treeResult = await pool.query(
            'SELECT * FROM skill_trees WHERE id = $1 AND user_id = $2',
            [id, user.id]
        );

        if (treeResult.rows.length === 0) {
            return NextResponse.json({ error: 'Tree not found' }, { status: 404 });
        }

        // Get nodes and edges
        const nodesResult = await pool.query(
            'SELECT * FROM nodes WHERE tree_id = $1 ORDER BY created_at ASC',
            [id]
        );

        const edgesResult = await pool.query(
            'SELECT * FROM edges WHERE tree_id = $1',
            [id]
        );

        return NextResponse.json({
            tree: treeResult.rows[0],
            nodes: nodesResult.rows,
            edges: edgesResult.rows,
        });
    } catch (error: unknown) {
        console.error('Get tree error:', error);
        return NextResponse.json({ error: 'Failed to fetch tree' }, { status: 500 });
    }
}

// DELETE /api/tree/[id] — Delete a tree
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        await pool.query(
            'DELETE FROM skill_trees WHERE id = $1 AND user_id = $2',
            [id, user.id]
        );

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error('Delete tree error:', error);
        return NextResponse.json({ error: 'Failed to delete tree' }, { status: 500 });
    }
}
