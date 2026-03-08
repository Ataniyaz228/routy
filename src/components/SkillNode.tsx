'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { FlowNodeData } from '@/lib/types';

function SkillNodeComponent({ data }: NodeProps) {
    const nodeData = data as unknown as FlowNodeData;
    const { label, difficulty, status, nodeType, origin } = nodeData;

    const typeLabels: Record<string, string> = {
        root: 'GOAL',
        skill: 'SKILL',
        boss: 'BOSS',
        checkpoint: 'CHECK',
    };

    const typeIcons: Record<string, string> = {
        root: '◎',
        skill: '◆',
        boss: '★',
        checkpoint: '⬡',
    };

    const isExpanded = origin === 'expanded';

    return (
        <>
            <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
            <div className={`skill-node ${status} ${nodeType} ${isExpanded ? 'expanded-origin' : ''}`}>
                {status === 'completed' && <div className="skill-node-check">✓</div>}

                <div className="skill-node-type-badge">
                    {isExpanded ? '⊕' : (typeIcons[nodeType] || '◆')}{' '}
                    {isExpanded ? 'DIVE' : (typeLabels[nodeType] || 'SKILL')}
                </div>

                <div className="skill-node-label">{label}</div>

                <div className="skill-node-difficulty">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <span
                            key={i}
                            className={`skill-node-star ${i < difficulty ? 'filled' : 'empty'}`}
                        >
                            ●
                        </span>
                    ))}
                </div>
            </div>
            <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
        </>
    );
}

export default memo(SkillNodeComponent);
