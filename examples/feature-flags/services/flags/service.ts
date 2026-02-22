// Feature Flags Service Layer
// This file re-exports from the modular lib structure for backwards compatibility

// ==================== Shared Types ====================
export type { RequestContext, Changes, SqlQuery } from '@/lib/shared'

// ==================== Flag Operations ====================
export {
  // Queries
  getFlag,
  getFlagByKey,
  listFlags,
  // Mutations
  createFlag,
  updateFlag,
  deleteFlag,
  toggleFlag,
} from '@/lib/flags'

export type { CreateFlagInput, UpdateFlagInput } from '@/lib/flags'

// ==================== Segment Operations ====================
export {
  // Queries
  getSegment,
  getSegmentByKey,
  listSegments,
  // Mutations
  createSegment,
  updateSegment,
  deleteSegment,
} from '@/lib/segments'

export type { CreateSegmentInput, UpdateSegmentInput } from '@/lib/segments'

// ==================== Evaluation ====================
export { evaluate, evaluateAll, loadFlagsAndSegments } from '@/lib/evaluation/service'

// ==================== Cache ====================
export { invalidateCache } from '@/lib/shared/cache'

// ==================== Audit ====================
export { audit, queryAuditLog, auditFromRow } from '@/lib/shared/audit'
export type { AuditQueryOptions, AuditQueryResult } from '@/lib/shared/audit'
