-- Migration number: 0001 	 2026-01-31T18:16:25.167Z

-- Links table for URL shortening
CREATE TABLE links (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  clicks INTEGER DEFAULT 0
);

-- Index for fast lookup by short code
CREATE INDEX idx_links_code ON links(code);
