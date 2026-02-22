// Segment SQL queries - all queries are static to prevent SQL injection

import { sql } from '../shared/types'

export const SegmentQueries = {
  insert: sql(`
    INSERT INTO segments (id, key, name, description, conditions, created_at, updated_at, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),

  updateAll: sql(`
    UPDATE segments
    SET name = ?, description = ?, conditions = ?, updated_at = ?
    WHERE id = ?
  `),

  delete: sql(`DELETE FROM segments WHERE id = ?`),

  selectById: sql(`SELECT * FROM segments WHERE id = ?`),

  selectByKey: sql(`SELECT * FROM segments WHERE key = ?`),

  selectAll: sql(`SELECT * FROM segments ORDER BY created_at DESC`),
} as const
