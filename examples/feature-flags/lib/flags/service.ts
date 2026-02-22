// Flag service - orchestration layer for flag operations

import type { Flag, FlagRow, AuditAction } from '../types'
import type { RequestContext, Changes } from '../shared/types'
import type { CreateFlagInput, UpdateFlagInput } from './types'
import { FlagQueries } from './queries'
import {
  buildFlag,
  applyFlagUpdates,
  flagToInsertParams,
  flagToUpdateParams,
  flagFromRow,
} from './mappers'
import { mutate, queryOne, queryAll } from '../shared/db'
import { audit } from '../shared/audit'
import { invalidateCache } from '../shared/cache'
import { buildChanges } from '../shared/diff'

// ==================== Queries ====================

export async function getFlag(id: string): Promise<Flag | null> {
  const row = await queryOne<FlagRow>(FlagQueries.selectById, [id])
  return row ? flagFromRow(row) : null
}

export async function getFlagByKey(key: string): Promise<Flag | null> {
  const row = await queryOne<FlagRow>(FlagQueries.selectByKey, [key])
  return row ? flagFromRow(row) : null
}

export async function listFlags(): Promise<Flag[]> {
  const rows = await queryAll<FlagRow>(FlagQueries.selectAll)
  return rows.map(flagFromRow)
}

// ==================== Mutations ====================

export async function createFlag(input: CreateFlagInput, ctx: RequestContext): Promise<Flag> {
  const flag = buildFlag(input, ctx.userId)

  await mutate(FlagQueries.insert, flagToInsertParams(flag))
  await invalidateCache()
  audit('flag.created', 'flag', flag.id, flag.key, undefined, ctx)

  return flag
}

export async function updateFlag(
  id: string,
  input: UpdateFlagInput,
  ctx: RequestContext
): Promise<Flag | null> {
  const existing = await getFlag(id)
  if (!existing) {
    return null
  }

  const updated = applyFlagUpdates(existing, input)
  const changes = buildChanges(existing, input, [
    'name',
    'description',
    'enabled',
    'defaultValue',
    'rules',
    'tags',
  ])

  await mutate(FlagQueries.updateAll, flagToUpdateParams(updated))
  await invalidateCache()

  // Determine the appropriate audit action
  const action = determineUpdateAction(changes, input)
  if (Object.keys(changes).length > 0) {
     audit(action, 'flag', id, existing.key, changes, ctx)
  }

  return updated
}

export async function deleteFlag(id: string, ctx: RequestContext): Promise<boolean> {
  const existing = await getFlag(id)
  if (!existing) {
    return false
  }

  await mutate(FlagQueries.delete, [id])
  await invalidateCache()
  audit('flag.deleted', 'flag', id, existing.key, undefined, ctx)

  return true
}

export async function toggleFlag(
  id: string,
  enabled: boolean,
  ctx: RequestContext
): Promise<Flag | null> {
  return updateFlag(id, { enabled }, ctx)
}

// ==================== Helpers ====================

function determineUpdateAction(changes: Changes, input: UpdateFlagInput): AuditAction {
  if ('enabled' in changes) {
    return input.enabled ? 'flag.enabled' : 'flag.disabled'
  }
  if ('rules' in changes) {
    return 'flag.rules_updated'
  }
  return 'flag.updated'
}
