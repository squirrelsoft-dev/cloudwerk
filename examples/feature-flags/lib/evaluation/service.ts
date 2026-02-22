// Evaluation service - orchestrates flag evaluation with caching

import type { EvaluationContext, EvaluationResult, FlagRow, SegmentRow } from '../types'
import { evaluateFlag, evaluateFlags } from '../evaluation'
import { loadFromCache, saveToCache, type CacheData } from '../shared/cache'
import { flagFromRow } from '../flags/mappers'
import { segmentFromRow } from '../segments/mappers'
import { queryAll } from '../shared/db'
import { FlagQueries } from '../flags/queries'
import { SegmentQueries } from '../segments/queries'

/**
 * Load flags and segments, using cache when available
 */
export async function loadFlagsAndSegments(): Promise<CacheData> {
  // Try cache first
  const cached = await loadFromCache()
  if (cached) {
    return cached
  }

  // Load from database
  const [flagRows, segmentRows] = await Promise.all([
    queryAll<FlagRow>(FlagQueries.selectAll),
    queryAll<SegmentRow>(SegmentQueries.selectAll),
  ])

  const flags = flagRows.map(flagFromRow)
  const segments = segmentRows.map(segmentFromRow)

  const data: CacheData = { flags, segments }

  // Store in cache for next time
  await saveToCache(data)

  return data
}

/**
 * Evaluate a single flag for the given context
 */
export async function evaluate(
  key: string,
  context: EvaluationContext
): Promise<EvaluationResult | null> {
  const { flags, segments } = await loadFlagsAndSegments()
  const flag = flags.find((f) => f.key === key)

  if (!flag) {
    return null
  }

  const segmentMap = new Map(segments.map((s) => [s.key, s]))
  return evaluateFlag(flag, context, segmentMap)
}

/**
 * Evaluate all flags for the given context
 */
export async function evaluateAll(
  context: EvaluationContext
): Promise<Map<string, EvaluationResult>> {
  const { flags, segments } = await loadFlagsAndSegments()
  const segmentMap = new Map(segments.map((s) => [s.key, s]))
  return evaluateFlags(flags, context, segmentMap)
}
