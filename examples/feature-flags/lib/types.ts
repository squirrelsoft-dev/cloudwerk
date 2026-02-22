// Feature Flag Core Types

export type FlagType = 'boolean' | 'string' | 'number' | 'json'

export type Operator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'in'
  | 'not_in'
  | 'matches'
  | 'semver_eq'
  | 'semver_gt'
  | 'semver_gte'
  | 'semver_lt'
  | 'semver_lte'

export interface Condition {
  attribute: string
  operator: Operator
  value: string | number | boolean | string[] | number[]
}

export interface TargetingRule {
  id: string
  name?: string
  conditions: Condition[]
  percentage?: number
  value: unknown
}

// ==================== Flag Types ====================

export interface Flag {
  id: string
  key: string
  name: string
  description?: string
  type: FlagType
  enabled: boolean
  defaultValue: unknown
  rules: TargetingRule[]
  tags: string[]
  createdAt: string
  updatedAt: string
  createdBy?: string
}

export interface FlagRow {
  id: string
  key: string
  name: string
  description: string | null
  type: FlagType
  enabled: number
  default_value: string
  rules: string
  tags: string
  created_at: string
  updated_at: string
  created_by: string | null
}

// ==================== Segment Types ====================

export interface Segment {
  id: string
  key: string
  name: string
  description?: string
  conditions: Condition[]
  createdAt: string
  updatedAt: string
  createdBy?: string
}

export interface SegmentRow {
  id: string
  key: string
  name: string
  description: string | null
  conditions: string
  created_at: string
  updated_at: string
  created_by: string | null
}

// ==================== Evaluation Types ====================

export interface EvaluationContext {
  userId?: string
  email?: string
  country?: string
  device?: string
  platform?: string
  version?: string
  environment?: string
  [key: string]: unknown
}

export type EvaluationReason =
  | 'FLAG_DISABLED'
  | 'DEFAULT_VALUE'
  | 'TARGETING_MATCH'
  | 'PERCENTAGE_ROLLOUT'
  | 'FALLBACK'
  | 'ERROR'

export interface EvaluationResult<T = unknown> {
  key: string
  value: T
  reason: EvaluationReason
  ruleId?: string
  flagType: FlagType
}

// ==================== Audit Types ====================

export type AuditAction =
  | 'flag.created'
  | 'flag.updated'
  | 'flag.deleted'
  | 'flag.enabled'
  | 'flag.disabled'
  | 'flag.rules_updated'
  | 'segment.created'
  | 'segment.updated'
  | 'segment.deleted'

export interface AuditEntry {
  id: string
  timestamp: string
  userId?: string
  userEmail?: string
  action: AuditAction
  resourceType: 'flag' | 'segment'
  resourceId?: string
  resourceKey?: string
  changes?: Record<string, { old: unknown; new: unknown }>
  metadata?: Record<string, unknown>
}

export interface AuditRow {
  id: string
  timestamp: string
  user_id: string | null
  user_email: string | null
  action: string
  resource_type: string
  resource_id: string | null
  resource_key: string | null
  changes: string | null
  metadata: string | null
}
