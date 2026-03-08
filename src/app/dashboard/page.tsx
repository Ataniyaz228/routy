'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { User } from '@/lib/types';

interface TreeItem {
    id: string;
    title: string;
    goal: string;
    xp_total: number;
    created_at: string;
    node_count: string;
    completed_count: string;
}

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [trees, setTrees] = useState<TreeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [newGoal, setNewGoal] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        Promise.all([
            fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'me' }),
            }).then((r) => r.json()),
            fetch('/api/trees').then((r) => r.json()),
        ])
            .then(([authData, treesData]) => {
                if (!authData.user) {
                    router.push('/auth');
                    return;
                }
                setUser(authData.user);
                setTrees(treesData.trees || []);
            })
            .catch(() => router.push('/auth'))
            .finally(() => setLoading(false));
    }, [router]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGoal.trim()) return;

        setCreating(true);
        try {
            const res = await fetch('/api/generate-tree', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ goal: newGoal.trim() }),
            });
            const data = await res.json();

            if (res.ok) {
                router.push(`/tree/${data.treeId}`);
            } else {
                alert(data.error || 'Failed to create tree');
            }
        } catch {
            alert('Network error');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (treeId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Delete this skill tree?')) return;

        try {
            await fetch(`/api/tree/${treeId}`, { method: 'DELETE' });
            setTrees((prev) => prev.filter((t) => t.id !== treeId));
        } catch {
            alert('Failed to delete');
        }
    };

    const handleLogout = async () => {
        await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'logout' }),
        });
        router.push('/');
    };

    if (loading) {
        return (
            <div className="loading-overlay">
                <div className="spinner" />
                <div className="loading-text">Loading your skill trees...</div>
            </div>
        );
    }

    const totalXP = trees.reduce((sum, t) => sum + t.xp_total, 0);
    const totalCompleted = trees.reduce((sum, t) => sum + parseInt(t.completed_count || '0'), 0);
    const totalNodes = trees.reduce((sum, t) => sum + parseInt(t.node_count || '0'), 0);

    return (
        <>
            <Navbar user={user} onLogout={handleLogout} />

            {creating && (
                <div className="loading-overlay">
                    <div className="spinner" />
                    <div className="loading-text">Building your skill tree...</div>
                </div>
            )}

            <main className="dashboard">
                <div className="dashboard-header">
                    <h1 className="dashboard-title">My Skill Trees</h1>
                </div>

                {/* Stats */}
                <div className="dashboard-stats">
                    <div className="stat-card glass-panel">
                        <div className="stat-icon purple">◎</div>
                        <div>
                            <div className="stat-value">{trees.length}</div>
                            <div className="stat-label">Skill Trees</div>
                        </div>
                    </div>
                    <div className="stat-card glass-panel">
                        <div className="stat-icon emerald">✓</div>
                        <div>
                            <div className="stat-value">{totalCompleted}</div>
                            <div className="stat-label">Completed Nodes</div>
                        </div>
                    </div>
                    <div className="stat-card glass-panel">
                        <div className="stat-icon gold">◆</div>
                        <div>
                            <div className="stat-value">{user?.xp || 0}</div>
                            <div className="stat-label">Total XP</div>
                        </div>
                    </div>
                    <div className="stat-card glass-panel">
                        <div className="stat-icon cyan">☆</div>
                        <div>
                            <div className="stat-value">Lv.{user?.level || 1}</div>
                            <div className="stat-label">Your Level</div>
                        </div>
                    </div>
                </div>

                {/* New tree form */}
                <form onSubmit={handleCreate} style={{ marginBottom: 32 }}>
                    <div className="landing-input-wrapper">
                        <input
                            className="input"
                            type="text"
                            placeholder="Start a new learning journey..."
                            value={newGoal}
                            onChange={(e) => setNewGoal(e.target.value)}
                            disabled={creating}
                        />
                        <button
                            className="btn btn-primary"
                            type="submit"
                            disabled={creating || !newGoal.trim()}
                        >
                            + New Tree
                        </button>
                    </div>
                </form>

                {/* Trees grid */}
                {trees.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">◎</div>
                        <h2 className="empty-state-title">No Skill Trees Yet</h2>
                        <p className="empty-state-text">
                            Enter a learning goal above to generate your first skill tree!
                        </p>
                    </div>
                ) : (
                    <div className="trees-grid">
                        {trees.map((tree) => {
                            const nodeCount = parseInt(tree.node_count || '0');
                            const completedCount = parseInt(tree.completed_count || '0');
                            const progress = nodeCount > 0 ? Math.round((completedCount / nodeCount) * 100) : 0;

                            return (
                                <div
                                    key={tree.id}
                                    className="tree-card glass-panel"
                                    onClick={() => router.push(`/tree/${tree.id}`)}
                                >
                                    <div className="tree-card-actions">
                                        <button
                                            className="tree-card-action-btn"
                                            onClick={(e) => handleDelete(tree.id, e)}
                                            title="Delete tree"
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    <h3 className="tree-card-title">{tree.title}</h3>
                                    <p className="tree-card-goal">{tree.goal}</p>

                                    <div className="tree-card-progress">
                                        <div className="progress-bar-wrapper">
                                            <div
                                                className="progress-bar-fill"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="tree-card-meta">
                                        <span>
                                            {completedCount}/{nodeCount} nodes • {progress}%
                                        </span>
                                        <span>{tree.xp_total} XP</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </>
    );
}
