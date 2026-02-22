// Admin API: GET /api/admin/audit - Query audit log

import { json } from '@cloudwerk/core/runtime'
import { queryAuditLog } from '@/services/flags/service'
import type { AuditQueryOptions } from '@/services/flags/service'
import type { AuditAction } from '@/lib/types'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const options: AuditQueryOptions = {}

    // Parse query parameters
    const limit = url.searchParams.get('limit')
    if (limit) {
      options.limit = parseInt(limit, 10)
      if (isNaN(options.limit) || options.limit < 1) {
        options.limit = 50
      }
    }

    const offset = url.searchParams.get('offset')
    if (offset) {
      options.offset = parseInt(offset, 10)
      if (isNaN(options.offset) || options.offset < 0) {
        options.offset = 0
      }
    }

    const action = url.searchParams.get('action')
    if (action) {
      options.action = action as AuditAction
    }

    const resourceType = url.searchParams.get('resourceType')
    if (resourceType === 'flag' || resourceType === 'segment') {
      options.resourceType = resourceType
    }

    const resourceId = url.searchParams.get('resourceId')
    if (resourceId) {
      options.resourceId = resourceId
    }

    const userId = url.searchParams.get('userId')
    if (userId) {
      options.userId = userId
    }

    const startDate = url.searchParams.get('startDate')
    if (startDate) {
      options.startDate = startDate
    }

    const endDate = url.searchParams.get('endDate')
    if (endDate) {
      options.endDate = endDate
    }

    const result = await queryAuditLog(options)

    return json({
      entries: result.entries,
      total: result.total,
      limit: options.limit ?? 50,
      offset: options.offset ?? 0,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return json({ error: message }, 500)
  }
}
