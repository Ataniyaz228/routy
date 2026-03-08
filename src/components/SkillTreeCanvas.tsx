'use client';

import { useCallback, useState, useEffect } from 'react';
import {
    ReactFlow,
    Controls,
    MiniMap,
    Background,
    BackgroundVariant,
    useNodesState,
    useEdgesState,
    useReactFlow,
    ReactFlowProvider,
    type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import SkillNodeComponent from './SkillNode';
import NodeDetailPanel from './NodeDetailPanel';
import QuizModal from './QuizModal';
import { FlowNodeData, SkillNode, SkillEdge, QuizQuestion } from '@/lib/types';
import { toFlowElements } from '@/lib/tree-utils';

const nodeTypes = {
    skillNode: SkillNodeComponent,
};

interface SkillTreeCanvasProps {
    treeId: string;
    treeTitle: string;
    dbNodes: SkillNode[];
    dbEdges: SkillEdge[];
    xpTotal: number;
    onRefresh: () => void;
}

function SkillTreeCanvasInner({
    treeId,
    treeTitle,
    dbNodes,
    dbEdges,
    xpTotal,
    onRefresh,
}: SkillTreeCanvasProps) {
    const { nodes: initialNodes, edges: initialEdges } = toFlowElements(dbNodes, dbEdges);
    const { fitView, setCenter } = useReactFlow();

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [selectedNode, setSelectedNode] = useState<FlowNodeData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [xpToast, setXpToast] = useState<number | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeData: FlowNodeData } | null>(null);
    const [quizData, setQuizData] = useState<{ quiz: QuizQuestion; nodeData: FlowNodeData } | null>(null);

    // Command bar state
    const [commandBarOpen, setCommandBarOpen] = useState(false);
    const [macroGoal, setMacroGoal] = useState('');

    // Track new node IDs for auto-zoom
    const [newNodeIds, setNewNodeIds] = useState<string[]>([]);

    useEffect(() => {
        const { nodes: newNodes, edges: newEdges } = toFlowElements(dbNodes, dbEdges);
        setNodes(newNodes);
        setEdges(newEdges);
    }, [dbNodes, dbEdges, setNodes, setEdges]);

    // Auto-zoom to new nodes after they appear
    useEffect(() => {
        if (newNodeIds.length > 0) {
            // Wait for React Flow to render, then fit view on new nodes
            const timer = setTimeout(() => {
                const newFlowNodes = nodes.filter((n) => newNodeIds.includes(n.id));
                if (newFlowNodes.length > 0) {
                    // Calculate center of new nodes
                    const avgX = newFlowNodes.reduce((s, n) => s + n.position.x, 0) / newFlowNodes.length;
                    const avgY = newFlowNodes.reduce((s, n) => s + n.position.y, 0) / newFlowNodes.length;
                    setCenter(avgX + 100, avgY + 50, { zoom: 0.8, duration: 600 });
                }
                setNewNodeIds([]);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [newNodeIds, nodes, setCenter]);

    // Keyboard shortcut: / to open command bar
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === '/' && !commandBarOpen && document.activeElement?.tagName !== 'INPUT') {
                e.preventDefault();
                setCommandBarOpen(true);
            }
            if (e.key === 'Escape' && commandBarOpen) {
                setCommandBarOpen(false);
                setMacroGoal('');
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [commandBarOpen]);

    const completedCount = dbNodes.filter((n) => n.status === 'completed').length;
    const totalCount = dbNodes.length;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
        setContextMenu(null);
        setSelectedNode(node.data as unknown as FlowNodeData);
    }, []);

    const onNodeContextMenu: NodeMouseHandler = useCallback((event, node) => {
        event.preventDefault();
        setSelectedNode(null);
        setContextMenu({
            x: (event as unknown as MouseEvent).clientX,
            y: (event as unknown as MouseEvent).clientY,
            nodeData: node.data as unknown as FlowNodeData,
        });
    }, []);

    const onPaneClick = useCallback(() => {
        setContextMenu(null);
    }, []);

    // Save position to DB when user drags a node
    const onNodeDragStop = useCallback((_event: React.MouseEvent, node: { id: string; position: { x: number; y: number }; data: unknown }) => {
        const data = node.data as FlowNodeData;
        fetch('/api/node/position', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nodeId: data.dbId,
                treeId,
                x: node.position.x,
                y: node.position.y,
            }),
        }).catch(() => { }); // fire-and-forget
    }, [treeId]);

    const showXpToast = (xp: number) => {
        setXpToast(xp);
        setTimeout(() => setXpToast(null), 2500);
    };

    const handleRequestComplete = async (nodeData?: FlowNodeData) => {
        const target = nodeData || selectedNode;
        if (!target) return;
        setIsLoading(true);
        setContextMenu(null);
        try {
            const res = await fetch('/api/node/quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nodeId: target.dbId, treeId }),
            });
            const data = await res.json();
            if (res.ok) {
                setQuizData({ quiz: data.quiz, nodeData: target });
                setSelectedNode(null);
            } else {
                alert(data.error || 'Failed to generate quiz');
            }
        } catch (e) {
            alert('Network error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCompleteConfirmed = async () => {
        if (!quizData) return;
        setIsLoading(true);
        try {
            const res = await fetch('/api/node/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nodeId: quizData.nodeData.dbId, treeId }),
            });
            const data = await res.json();
            if (res.ok) {
                showXpToast(data.xpAwarded);
                setQuizData(null);
                onRefresh();
            } else {
                alert(data.error || 'Failed to complete node');
            }
        } catch (e) {
            alert('Network error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleExpand = async (nodeData?: FlowNodeData) => {
        const target = nodeData || selectedNode;
        if (!target) return;
        setIsLoading(true);
        setContextMenu(null);
        try {
            const res = await fetch('/api/expand-node', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nodeId: target.dbId, treeId }),
            });
            const data = await res.json();
            if (res.ok) {
                setSelectedNode(null);
                onRefresh();
            } else {
                alert(data.error || 'Failed to expand node');
            }
        } catch (e) {
            alert('Network error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (nodeData?: FlowNodeData) => {
        const target = nodeData || selectedNode;
        if (!target) return;
        if (!confirm(`Delete "${target.label}" and all its children?`)) return;
        setIsLoading(true);
        setContextMenu(null);
        try {
            const res = await fetch('/api/node/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nodeId: target.dbId, treeId }),
            });
            const data = await res.json();
            if (res.ok) {
                setSelectedNode(null);
                onRefresh();
            } else {
                alert(data.error || 'Failed to delete node');
            }
        } catch (e) {
            alert('Network error');
        } finally {
            setIsLoading(false);
        }
    };

    // ── Macro-expand: generate a new branch from global goal ──
    const handleMacroExpand = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!macroGoal.trim()) return;
        setIsLoading(true);
        setCommandBarOpen(false);
        try {
            const res = await fetch('/api/macro-expand', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ macroGoal: macroGoal.trim(), treeId }),
            });
            const data = await res.json();
            if (res.ok) {
                setMacroGoal('');
                setNewNodeIds(data.newNodeIds || []);
                onRefresh();
            } else {
                alert(data.error || 'Failed to generate branch');
            }
        } catch (e) {
            alert('Network error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="tree-page">
            {/* Toolbar */}
            <div className="tree-toolbar">
                <a href="/dashboard">← Back</a>
                <span className="tree-toolbar-title">{treeTitle}</span>
                <span className="tree-toolbar-xp">{xpTotal} XP</span>
                <div className="tree-toolbar-progress">
                    <div className="tree-toolbar-progress-bar">
                        <div
                            className="tree-toolbar-progress-fill"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span>{progress}%</span>
                </div>
            </div>

            {/* React Flow Canvas */}
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                onNodeContextMenu={onNodeContextMenu}
                onNodeDragStop={onNodeDragStop}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.3 }}
                minZoom={0.2}
                maxZoom={2}
            >
                <Controls />
                <MiniMap
                    nodeColor={(node) => {
                        const data = node.data as unknown as FlowNodeData;
                        if (data.status === 'completed') return '#00e5a0';
                        if (data.status === 'unlocked') return '#38d9f5';
                        return '#2e313b';
                    }}
                    maskColor="rgba(22, 23, 29, 0.85)"
                />
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#2e313b" />
            </ReactFlow>

            {/* ── Command Bar (Spotlight-style) ── */}
            {!commandBarOpen && (
                <button
                    className="command-bar-trigger"
                    onClick={() => setCommandBarOpen(true)}
                    title="Press / to open"
                >
                    <span className="command-bar-trigger-icon">⌘</span>
                    New direction...
                    <kbd className="command-bar-kbd">/</kbd>
                </button>
            )}

            {commandBarOpen && (
                <>
                    <div className="command-bar-overlay" onClick={() => { setCommandBarOpen(false); setMacroGoal(''); }} />
                    <form className="command-bar" onSubmit={handleMacroExpand}>
                        <div className="command-bar-icon">→</div>
                        <input
                            className="command-bar-input"
                            type="text"
                            placeholder="Where do you want to go next? e.g. 'dive into backend with Django'"
                            value={macroGoal}
                            onChange={(e) => setMacroGoal(e.target.value)}
                            autoFocus
                            disabled={isLoading}
                        />
                        <button
                            className="command-bar-submit"
                            type="submit"
                            disabled={isLoading || !macroGoal.trim()}
                        >
                            {isLoading ? '...' : 'Generate'}
                        </button>
                    </form>
                </>
            )}

            {/* Node Detail Panel */}
            {selectedNode && (
                <NodeDetailPanel
                    nodeData={selectedNode}
                    onClose={() => setSelectedNode(null)}
                    onComplete={() => handleRequestComplete()}
                    onExpand={() => handleExpand()}
                    onDelete={() => handleDelete()}
                    isLoading={isLoading}
                />
            )}

            {/* Quiz Modal */}
            {quizData && (
                <QuizModal
                    nodeLabel={quizData.nodeData.label}
                    quiz={quizData.quiz}
                    onCorrect={handleCompleteConfirmed}
                    onWrong={() => setQuizData(null)}
                    onClose={() => setQuizData(null)}
                />
            )}

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="context-menu"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    <button
                        className="context-menu-item"
                        onClick={() => {
                            setContextMenu(null);
                            setSelectedNode(contextMenu.nodeData);
                        }}
                    >
                        ◆ View Details
                    </button>
                    {contextMenu.nodeData.status === 'unlocked' && (
                        <button
                            className="context-menu-item"
                            onClick={() => handleRequestComplete(contextMenu.nodeData)}
                        >
                            ✓ Complete
                        </button>
                    )}
                    {contextMenu.nodeData.status !== 'locked' && (
                        <button
                            className="context-menu-item"
                            onClick={() => handleExpand(contextMenu.nodeData)}
                        >
                            + Expand
                        </button>
                    )}
                    {contextMenu.nodeData.nodeType !== 'root' && (
                        <>
                            <div className="context-menu-divider" />
                            <button
                                className="context-menu-item danger"
                                onClick={() => handleDelete(contextMenu.nodeData)}
                            >
                                ✕ Delete Branch
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* XP Toast */}
            {xpToast && (
                <div className="xp-toast">+{xpToast} XP</div>
            )}

            {/* Loading overlay */}
            {isLoading && (
                <div className="loading-overlay">
                    <div className="spinner" />
                    <div className="loading-text">Generating...</div>
                </div>
            )}
        </div>
    );
}

// Wrap with ReactFlowProvider to enable useReactFlow hook
export default function SkillTreeCanvas(props: SkillTreeCanvasProps) {
    return (
        <ReactFlowProvider>
            <SkillTreeCanvasInner {...props} />
        </ReactFlowProvider>
    );
}
