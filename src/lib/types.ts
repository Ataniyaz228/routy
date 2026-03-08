// ========================
// Routy — Core Type Definitions
// ========================

export interface SkillTree {
    id: string;
    user_id: string;
    title: string;
    goal: string;
    xp_total: number;
    created_at: string;
}

export interface SkillNode {
    id: string;
    tree_id: string;
    parent_id: string | null;
    label: string;
    description: string;
    theory: string;
    difficulty: number; // 1-5
    status: 'locked' | 'unlocked' | 'completed';
    position_x: number;
    position_y: number;
    node_type: 'root' | 'skill' | 'boss' | 'checkpoint';
    resources: string;
    origin: 'main' | 'expanded';
    created_at: string;
}

export interface SkillEdge {
    id: string;
    tree_id: string;
    source_id: string;
    target_id: string;
}

export interface User {
    id: string;
    username: string;
    email: string;
    avatar_url?: string;
    xp: number;
    level: number;
    created_at: string;
}

// AI generation payloads
export interface GeneratedNode {
    temp_id: string;
    parent_temp_id: string | null;
    label: string;
    description: string;
    theory: string;
    difficulty: number;
    node_type: 'root' | 'skill' | 'boss' | 'checkpoint';
    resources?: string;
}

export interface GeneratedEdge {
    source_temp_id: string;
    target_temp_id: string;
}

export interface GenerationResult {
    nodes: GeneratedNode[];
    edges: GeneratedEdge[];
}

// Quiz verification
export interface QuizQuestion {
    question: string;
    optionA: string;
    optionB: string;
    correctOption: 'A' | 'B';
}

// Macro-branch generation (anchor discovery + branch)
export interface MacroBranchResult {
    anchor_node_label: string | null; // label of existing node to attach to, or null for new root
    nodes: GeneratedNode[];
    edges: GeneratedEdge[];
}

// React Flow adapted types
export type FlowNodeData = {
    label: string;
    description: string;
    theory: string;
    difficulty: number;
    status: 'locked' | 'unlocked' | 'completed';
    nodeType: 'root' | 'skill' | 'boss' | 'checkpoint';
    dbId: string;
    parentId: string | null;
    treeId: string;
    resources: string;
    origin: 'main' | 'expanded';
};
