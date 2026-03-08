-- Routy Database Schema
-- Run with: psql -U postgres -f scripts/init-db.sql

-- Create database
-- CREATE DATABASE routy;
-- \c routy;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Skill trees
CREATE TABLE IF NOT EXISTS skill_trees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  goal TEXT NOT NULL,
  xp_total INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Nodes
CREATE TABLE IF NOT EXISTS nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID REFERENCES skill_trees(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES nodes(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  description TEXT DEFAULT '',
  theory TEXT DEFAULT '',
  difficulty INTEGER DEFAULT 1 CHECK (difficulty >= 1 AND difficulty <= 5),
  status TEXT DEFAULT 'locked' CHECK (status IN ('locked', 'unlocked', 'completed')),
  position_x FLOAT DEFAULT 0,
  position_y FLOAT DEFAULT 0,
  node_type TEXT DEFAULT 'skill' CHECK (node_type IN ('root', 'skill', 'boss', 'checkpoint')),
  resources TEXT DEFAULT '',
  origin TEXT DEFAULT 'main' CHECK (origin IN ('main', 'expanded')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Edges
CREATE TABLE IF NOT EXISTS edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID REFERENCES skill_trees(id) ON DELETE CASCADE,
  source_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  target_id UUID REFERENCES nodes(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_skill_trees_user ON skill_trees(user_id);
CREATE INDEX IF NOT EXISTS idx_nodes_tree ON nodes(tree_id);
CREATE INDEX IF NOT EXISTS idx_nodes_parent ON nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_edges_tree ON edges(tree_id);
CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_id);
CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_id);
