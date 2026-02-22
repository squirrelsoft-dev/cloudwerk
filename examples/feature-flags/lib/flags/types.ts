// Flag-specific types

import type { FlagType, TargetingRule } from '../types'

/**
 * Input for creating a new flag
 */
export interface CreateFlagInput {
  key: string
  name: string
  description?: string
  type?: FlagType
  enabled?: boolean
  defaultValue?: unknown
  rules?: TargetingRule[]
  tags?: string[]
}

/**
 * Input for updating an existing flag
 */
export interface UpdateFlagInput {
  name?: string
  description?: string
  enabled?: boolean
  defaultValue?: unknown
  rules?: TargetingRule[]
  tags?: string[]
}
