// Segment mappers - convert between domain objects and database params

import type { Segment, SegmentRow } from '../types'
import type { CreateSegmentInput, UpdateSegmentInput } from './types'
import { generateId, now } from '../shared/utils'

/**
 * Build a Segment domain object from input
 */
export function buildSegment(input: CreateSegmentInput, createdBy?: string): Segment {
  const timestamp = now()

  return {
    id: generateId(),
    key: input.key,
    name: input.name,
    description: input.description,
    conditions: input.conditions,
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy,
  }
}

/**
 * Apply updates to an existing segment
 */
export function applySegmentUpdates(existing: Segment, input: UpdateSegmentInput): Segment {
  return {
    ...existing,
    name: input.name ?? existing.name,
    description: input.description !== undefined ? input.description : existing.description,
    conditions: input.conditions ?? existing.conditions,
    updatedAt: now(),
  }
}

/**
 * Convert a Segment to INSERT query params
 */
export function segmentToInsertParams(segment: Segment): unknown[] {
  return [
    segment.id,
    segment.key,
    segment.name,
    segment.description ?? null,
    JSON.stringify(segment.conditions),
    segment.createdAt,
    segment.updatedAt,
    segment.createdBy ?? null,
  ]
}

/**
 * Convert a Segment to UPDATE query params
 */
export function segmentToUpdateParams(segment: Segment): unknown[] {
  return [
    segment.name,
    segment.description ?? null,
    JSON.stringify(segment.conditions),
    segment.updatedAt,
    segment.id, // WHERE clause
  ]
}

/**
 * Convert a database row to a Segment domain object
 */
export function segmentFromRow(row: SegmentRow): Segment {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description ?? undefined,
    conditions: JSON.parse(row.conditions),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by ?? undefined,
  }
}
