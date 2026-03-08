'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import SkillTreeCanvas from '@/components/SkillTreeCanvas';
import { SkillNode, SkillEdge } from '@/lib/types';

interface TreeData {
    tree: {
        id: string;
        title: string;
        goal: string;
        xp_total: number;
    };
    nodes: SkillNode[];
    edges: SkillEdge[];
}

export default function TreePage() {
    const router = useRouter();
    const params = useParams();
    const treeId = params.id as string;

    const [data, setData] = useState<TreeData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchTree = useCallback(async () => {
        try {
            const res = await fetch(`/api/tree/${treeId}`);
            if (res.status === 401) {
                router.push('/auth');
                return;
            }
            const json = await res.json();
            if (res.ok) {
                setData(json);
            } else {
                setError(json.error || 'Failed to load tree');
            }
        } catch {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    }, [treeId, router]);

    useEffect(() => {
        fetchTree();
    }, [fetchTree]);

    if (loading) {
        return (
            <div className="loading-overlay">
                <div className="spinner" />
                <div className="loading-text">Loading skill tree...</div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="loading-overlay">
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ color: 'var(--red)', marginBottom: 16 }}>{error || 'Tree not found'}</h2>
                    <a href="/dashboard" className="btn btn-primary">
                        Go to Dashboard
                    </a>
                </div>
            </div>
        );
    }

    return (
        <SkillTreeCanvas
            treeId={data.tree.id}
            treeTitle={data.tree.title}
            dbNodes={data.nodes}
            dbEdges={data.edges}
            xpTotal={data.tree.xp_total}
            onRefresh={fetchTree}
        />
    );
}
