// Flag mappers - convert between domain objects and database params

import type { Flag, FlagRow } from '../types'
import type { CreateFlagInput, UpdateFlagInput } from './types'
import { generateId, now } from '../shared/utils'

/**
 * Build a Flag domain object from input
 */
export function buildFlag(input: CreateFlagInput, createdBy?: string): Flag {
  const timestamp = now()

  return {
    id: generateId(),
    key: input.key,
    name: input.name,
    description: input.description,
    type: input.type ?? 'boolean',
    enabled: input.enabled ?? false,
    defaultValue: input.defaultValue ?? false,
    rules: input.rules ?? [],
    tags: input.tags ?? [],
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy,
  }
}

/**
 * Apply updates to an existing flag
 */
export function applyFlagUpdates(existing: Flag, input: UpdateFlagInput): Flag {
  return {
    ...existing,
    name: input.name ?? existing.name,
    description: input.description !== undefined ? input.description : existing.description,
    enabled: input.enabled ?? existing.enabled,
    defaultValue: input.defaultValue !== undefined ? input.defaultValue : existing.defaultValue,
    rules: input.rules ?? existing.rules,
    tags: input.tags ?? existing.tags,
    updatedAt: now(),
  }
}

/**
 * Convert a Flag to INSERT query params
 */
export function flagToInsertParams(flag: Flag): unknown[] {
  return [
    flag.id,
    flag.key,
    flag.name,
    flag.description ?? null,
    flag.type,
    flag.enabled ? 1 : 0,
    JSON.stringify(flag.defaultValue),
    JSON.stringify(flag.rules),
    JSON.stringify(flag.tags),
    flag.createdAt,
    flag.updatedAt,
    flag.createdBy ?? null,
  ]
}

/**
 * Convert a Flag to UPDATE query params
 */
export function flagToUpdateParams(flag: Flag): unknown[] {
  return [
    flag.name,
    flag.description ?? null,
    flag.enabled ? 1 : 0,
    JSON.stringify(flag.defaultValue),
    JSON.stringify(flag.rules),
    JSON.stringify(flag.tags),
    flag.updatedAt,
    flag.id, // WHERE clause
  ]
}

/**
 * Convert a database row to a Flag domain object
 */
export function flagFromRow(row: FlagRow): Flag {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description ?? undefined,
    type: row.type,
    enabled: row.enabled === 1,
    defaultValue: JSON.parse(row.default_value),
    rules: JSON.parse(row.rules),
    tags: JSON.parse(row.tags),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by ?? undefined,
  }
}
