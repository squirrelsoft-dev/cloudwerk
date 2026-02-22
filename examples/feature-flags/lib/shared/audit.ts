// Audit logging utilities

import { DB } from '@cloudwerk/core/bindings'
import { sql } from './types'
import type { RequestContext, Changes } from './types'
import { mutate } from './db'
import { generateId } from './utils'
import type { AuditAction, AuditEntry, AuditRow } from '../types'

const AuditQueries = {
  insert: sql(`
    INSERT INTO audit_log (id, user_id, user_email, action, resource_type, resource_id, resource_key, changes, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
} as const

export type ResourceType = 'flag' | 'segment'

/**
 * Record an audit log entry
 */
export async function audit(
  action: AuditAction,
  resourceType: ResourceType,
  resourceId: string,
  resourceKey: string,
  changes: Changes | undefined,
  ctx: RequestContext
): Promise<void> {
  const id = generateId()

  await mutate(AuditQueries.insert, [
    id,
    ctx.userId ?? null,
    ctx.userEmail ?? null,
    action,
    resourceType,
    resourceId,
    resourceKey,
    changes ? JSON.stringify(changes) : null,
    null, // metadata - not currently used
  ])
}

/**
 * Convert an audit row to an audit entry
 */
export function auditFromRow(row: AuditRow): AuditEntry {
  return {
    id: row.id,
    timestamp: row.timestamp,
    userId: row.user_id ?? undefined,
    userEmail: row.user_email ?? undefined,
    action: row.action as AuditAction,
    resourceType: row.resource_type as ResourceType,
    resourceId: row.resource_id ?? undefined,
    resourceKey: row.resource_key ?? undefined,
    changes: row.changes ? JSON.parse(row.changes) : undefined,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
  }
}

// ==================== Audit Query ====================

export interface AuditQueryOptions {
  limit?: number
  offset?: number
  action?: AuditAction
  resourceType?: ResourceType
  resourceId?: string
  userId?: string
  startDate?: string
  endDate?: string
}

export interface AuditQueryResult {
  entries: AuditEntry[]
  total: number
}

/**
 * Query audit log with filtering and pagination
 */
export async function queryAuditLog(options: AuditQueryOptions = {}): Promise<AuditQueryResult> {
  const conditions: string[] = []
  const values: unknown[] = []

  if (options.action) {
    conditions.push('action = ?')
    values.push(options.action)
  }

  if (options.resourceType) {
    conditions.push('resource_type = ?')
    values.push(options.resourceType)
  }

  if (options.resourceId) {
    conditions.push('resource_id = ?')
    values.push(options.resourceId)
  }

  if (options.userId) {
    conditions.push('user_id = ?')
    values.push(options.userId)
  }

  if (options.startDate) {
    conditions.push('timestamp >= ?')
    values.push(options.startDate)
  }

  if (options.endDate) {
    conditions.push('timestamp <= ?')
    values.push(options.endDate)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Get total count
  const countResult = await DB.prepare(`SELECT COUNT(*) as count FROM audit_log ${whereClause}`)
    .bind(...values)
    .first<{ count: number }>()

  const total = countResult?.count ?? 0

  // Get entries with pagination
  const limit = options.limit ?? 50
  const offset = options.offset ?? 0

  const entriesResult = await DB.prepare(
    `SELECT * FROM audit_log ${whereClause} ORDER BY timestamp DESC LIMIT ? OFFSET ?`
  )
    .bind(...values, limit, offset)
    .all<AuditRow>()

  const entries = (entriesResult.results ?? []).map(auditFromRow)

  return { entries, total }
}
