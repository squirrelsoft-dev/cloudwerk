// Segment-specific types

import type { Condition } from '../types'

/**
 * Input for creating a new segment
 */
export interface CreateSegmentInput {
  key: string
  name: string
  description?: string
  conditions: Condition[]
}

/**
 * Input for updating an existing segment
 */
export interface UpdateSegmentInput {
  name?: string
  description?: string
  conditions?: Condition[]
}
