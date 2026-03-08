'use client';

import { useState } from 'react';
import { FlowNodeData } from '@/lib/types';
import { marked } from 'marked';

interface NodeDetailPanelProps {
    nodeData: FlowNodeData;
    onClose: () => void;
    onComplete: () => void;
    onExpand: () => void;
    onDelete: () => void;
    isLoading: boolean;
}

export default function NodeDetailPanel({
    nodeData,
    onClose,
    onComplete,
    onExpand,
    onDelete,
    isLoading,
}: NodeDetailPanelProps) {
    const [closing, setClosing] = useState(false);

    const handleClose = () => {
        setClosing(true);
        setTimeout(onClose, 240);
    };

    const difficultyLabels = ['Beginner', 'Easy', 'Medium', 'Hard', 'Expert'];
    const typeLabels: Record<string, string> = {
        root: '◎ GOAL',
        skill: '◆ SKILL',
        boss: '★ BOSS',
        checkpoint: '⬡ CHECKPOINT',
    };

    const theoryHtml = nodeData.theory
        ? marked.parse(nodeData.theory, { async: false }) as string
        : '<p>No content yet. Expand this node to generate learning material.</p>';

    return (
        <>
            <div className="node-panel-overlay" onClick={handleClose} />
            <div className={`node-panel ${closing ? 'closing' : ''}`}>
                <div className="node-panel-header">
                    <div>
                        <span className={`node-panel-type ${nodeData.nodeType}`}>
                            {typeLabels[nodeData.nodeType] || '◆ SKILL'}
                        </span>
                        <h2 className="node-panel-title">{nodeData.label}</h2>
                        <p className="node-panel-desc">{nodeData.description}</p>
                    </div>
                    <button className="node-panel-close" onClick={handleClose}>
                        ✕
                    </button>
                </div>

                <div className="node-panel-body">
                    {/* Status */}
                    <div className="node-panel-section">
                        <h3 className="node-panel-section-title">Status</h3>
                        <span className={`node-panel-status ${nodeData.status}`}>
                            {nodeData.status === 'locked' && '● Locked'}
                            {nodeData.status === 'unlocked' && '● Available'}
                            {nodeData.status === 'completed' && '● Completed'}
                        </span>
                    </div>

                    {/* Difficulty */}
                    <div className="node-panel-section">
                        <h3 className="node-panel-section-title">Difficulty</h3>
                        <div className="node-panel-difficulty">
                            <div className="node-panel-difficulty-stars">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <span
                                        key={i}
                                        className={`skill-node-star ${i < nodeData.difficulty ? 'filled' : 'empty'}`}
                                        style={{ fontSize: '12px' }}
                                    >
                                        ●
                                    </span>
                                ))}
                            </div>
                            <span className="node-panel-difficulty-label">
                                {difficultyLabels[nodeData.difficulty - 1] || 'Unknown'}
                            </span>
                        </div>
                    </div>

                    {/* Theory / Project Brief */}
                    <div className="node-panel-section">
                        <h3 className="node-panel-section-title">
                            {nodeData.nodeType === 'boss' ? '🎯 Project Brief' : 'Theory'}
                        </h3>
                        <div
                            className={`node-panel-theory ${nodeData.nodeType === 'boss' ? 'boss-brief' : ''}`}
                            dangerouslySetInnerHTML={{ __html: theoryHtml }}
                        />
                    </div>

                    {/* Resources (Loot) */}
                    {nodeData.resources && nodeData.resources.trim() && (
                        <div className="node-panel-section">
                            <h3 className="node-panel-section-title">🎁 Resources</h3>
                            <div className="node-panel-resources">
                                {nodeData.resources.split('\n').filter(Boolean).map((line, i) => {
                                    const match = line.match(/\[(.+?)\]\((.+?)\)\s*-?\s*(.*)/);
                                    if (match) {
                                        return (
                                            <a
                                                key={i}
                                                href={match[2]}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="resource-link"
                                            >
                                                <span className="resource-icon">📄</span>
                                                <span className="resource-info">
                                                    <span className="resource-title">{match[1]}</span>
                                                    {match[3] && <span className="resource-desc">{match[3]}</span>}
                                                </span>
                                                <span className="resource-arrow">↗</span>
                                            </a>
                                        );
                                    }
                                    return (
                                        <div key={i} className="resource-link">
                                            <span className="resource-icon">📄</span>
                                            <span className="resource-info">
                                                <span className="resource-title">{line}</span>
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className="node-panel-footer">
                    {nodeData.status === 'unlocked' && (
                        <button
                            className="btn btn-gold"
                            onClick={onComplete}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="spinner spinner-sm" />
                            ) : (
                                <>✓ Complete</>
                            )}
                        </button>
                    )}
                    {nodeData.status !== 'locked' && (
                        <button
                            className="btn btn-primary"
                            onClick={onExpand}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="spinner spinner-sm" />
                            ) : (
                                <>+ Expand</>
                            )}
                        </button>
                    )}
                    {nodeData.nodeType !== 'root' && (
                        <button
                            className="btn btn-danger btn-sm"
                            onClick={onDelete}
                            disabled={isLoading}
                        >
                            Delete
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}
