// Flag SQL queries - all queries are static to prevent SQL injection

import { sql } from '../shared/types'

export const FlagQueries = {
  insert: sql(`
    INSERT INTO flags (id, key, name, description, type, enabled, default_value, rules, tags, created_at, updated_at, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  updateAll: sql(`
    UPDATE flags
    SET name = ?, description = ?, enabled = ?, default_value = ?, rules = ?, tags = ?, updated_at = ?
    WHERE id = ?
  `),

  delete: sql(`DELETE FROM flags WHERE id = ?`),

  selectById: sql(`SELECT * FROM flags WHERE id = ?`),

  selectByKey: sql(`SELECT * FROM flags WHERE key = ?`),

  selectAll: sql(`SELECT * FROM flags ORDER BY created_at DESC`),
} as const
