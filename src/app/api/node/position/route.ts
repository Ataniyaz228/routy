import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import pool from '@/lib/db';

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { nodeId, treeId, x, y } = await req.json();

        if (!nodeId || !treeId || x === undefined || y === undefined) {
            return NextResponse.json({ error: 'nodeId, treeId, x, y required' }, { status: 400 });
        }

        // Verify tree belongs to user
        const treeResult = await pool.query(
            'SELECT id FROM skill_trees WHERE id = $1 AND user_id = $2',
            [treeId, user.id]
        );
        if (treeResult.rows.length === 0) {
            return NextResponse.json({ error: 'Tree not found' }, { status: 404 });
        }

        await pool.query(
            'UPDATE nodes SET position_x = $1, position_y = $2 WHERE id = $3 AND tree_id = $4',
            [Math.round(x), Math.round(y), nodeId, treeId]
        );

        return NextResponse.json({ ok: true });
    } catch (error: unknown) {
        console.error('Save position error:', error);
        return NextResponse.json({ error: 'Failed to save position' }, { status: 500 });
    }
}
