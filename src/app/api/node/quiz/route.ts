import { NextRequest, NextResponse } from 'next/server';
import { generateQuiz } from '@/lib/ai';
import { getCurrentUser } from '@/lib/auth';
import pool from '@/lib/db';

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { nodeId, treeId } = await req.json();

        const nodeResult = await pool.query(
            'SELECT * FROM nodes WHERE id = $1 AND tree_id = $2',
            [nodeId, treeId]
        );

        if (nodeResult.rows.length === 0) {
            return NextResponse.json({ error: 'Node not found' }, { status: 404 });
        }

        const node = nodeResult.rows[0];

        if (node.status !== 'unlocked') {
            return NextResponse.json({ error: 'Node is not available for completion' }, { status: 400 });
        }

        const quiz = await generateQuiz(node.label, node.theory || node.description || '');

        return NextResponse.json({ quiz });
    } catch (error: unknown) {
        console.error('Quiz generation error:', error);
        const message = error instanceof Error ? error.message : 'Failed to generate quiz';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
