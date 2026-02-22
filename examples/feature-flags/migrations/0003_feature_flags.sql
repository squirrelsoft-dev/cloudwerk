-- Feature Flags Migration
-- Date: 2026-02-03
--
-- This migration creates the feature flags tables:
--   - flags: Feature flag configurations with targeting rules
--   - segments: Reusable user segments for targeting
--   - audit_log: Change tracking for compliance and debugging

-- Flags table stores feature flag configurations
CREATE TABLE IF NOT EXISTS flags (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'boolean' CHECK (type IN ('boolean', 'string', 'number', 'json')),
  enabled INTEGER NOT NULL DEFAULT 0,
  default_value TEXT NOT NULL DEFAULT 'false',
  rules TEXT NOT NULL DEFAULT '[]',
  tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_flags_key ON flags(key);
CREATE INDEX IF NOT EXISTS idx_flags_enabled ON flags(enabled);
CREATE INDEX IF NOT EXISTS idx_flags_created_at ON flags(created_at);
CREATE INDEX IF NOT EXISTS idx_flags_type ON flags(type);

-- Segments table for reusable targeting conditions
CREATE TABLE IF NOT EXISTS segments (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  conditions TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_segments_key ON segments(key);
CREATE INDEX IF NOT EXISTS idx_segments_created_at ON segments(created_at);

-- Audit log for tracking all changes
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  user_id TEXT,
  user_email TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  resource_key TEXT,
  changes TEXT,
  metadata TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource_type ON audit_log(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource_id ON audit_log(resource_id);
