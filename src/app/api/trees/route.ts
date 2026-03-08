import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import pool from '@/lib/db';

// GET /api/trees — List all user's trees
export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const result = await pool.query(
            `SELECT st.*, 
              (SELECT COUNT(*) FROM nodes WHERE tree_id = st.id) as node_count,
              (SELECT COUNT(*) FROM nodes WHERE tree_id = st.id AND status = 'completed') as completed_count
       FROM skill_trees st 
       WHERE st.user_id = $1 
       ORDER BY st.created_at DESC`,
            [user.id]
        );

        return NextResponse.json({ trees: result.rows });
    } catch (error: unknown) {
        console.error('List trees error:', error);
        return NextResponse.json({ error: 'Failed to list trees' }, { status: 500 });
    }
}
