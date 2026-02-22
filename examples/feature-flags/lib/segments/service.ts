// Segment service - orchestration layer for segment operations

import type { Segment, SegmentRow } from '../types'
import type { RequestContext } from '../shared/types'
import type { CreateSegmentInput, UpdateSegmentInput } from './types'
import { SegmentQueries } from './queries'
import {
  buildSegment,
  applySegmentUpdates,
  segmentToInsertParams,
  segmentToUpdateParams,
  segmentFromRow,
} from './mappers'
import { mutate, queryOne, queryAll } from '../shared/db'
import { audit } from '../shared/audit'
import { invalidateCache } from '../shared/cache'
import { buildChanges } from '../shared/diff'

// ==================== Queries ====================

export async function getSegment(id: string): Promise<Segment | null> {
  const row = await queryOne<SegmentRow>(SegmentQueries.selectById, [id])
  return row ? segmentFromRow(row) : null
}

export async function getSegmentByKey(key: string): Promise<Segment | null> {
  const row = await queryOne<SegmentRow>(SegmentQueries.selectByKey, [key])
  return row ? segmentFromRow(row) : null
}

export async function listSegments(): Promise<Segment[]> {
  const rows = await queryAll<SegmentRow>(SegmentQueries.selectAll)
  return rows.map(segmentFromRow)
}

// ==================== Mutations ====================

export async function createSegment(
  input: CreateSegmentInput,
  ctx: RequestContext
): Promise<Segment> {
  const segment = buildSegment(input, ctx.userId)

  await mutate(SegmentQueries.insert, segmentToInsertParams(segment))
  await invalidateCache()
  await audit('segment.created', 'segment', segment.id, segment.key, undefined, ctx)

  return segment
}

export async function updateSegment(
  id: string,
  input: UpdateSegmentInput,
  ctx: RequestContext
): Promise<Segment | null> {
  const existing = await getSegment(id)
  if (!existing) {
    return null
  }

  const updated = applySegmentUpdates(existing, input)
  const changes = buildChanges(existing, input, ['name', 'description', 'conditions'])

  await mutate(SegmentQueries.updateAll, segmentToUpdateParams(updated))
  await invalidateCache()

  if (Object.keys(changes).length > 0) {
    await audit('segment.updated', 'segment', id, existing.key, changes, ctx)
  }

  return updated
}

export async function deleteSegment(id: string, ctx: RequestContext): Promise<boolean> {
  const existing = await getSegment(id)
  if (!existing) {
    return false
  }

  await mutate(SegmentQueries.delete, [id])
  await invalidateCache()
  await audit('segment.deleted', 'segment', id, existing.key, undefined, ctx)

  return true
}
