// GET /api/flags/:key - Evaluate a single flag

import { json, type CloudwerkHandlerContext } from '@cloudwerk/core/runtime'
import { evaluate } from '@/services/flags/service'
import type { EvaluationContext } from '@/lib/types'

export async function GET(request: Request, { params }: CloudwerkHandlerContext) {
  try {
    const key = params.key
    if (!key) {
      return json({ error: 'Flag key is required' }, 400)
    }

    // Parse context from query parameters
    const url = new URL(request.url)
    const context: EvaluationContext = {}

    for (const [k, v] of url.searchParams) {
      // Try to parse as JSON for complex values
      try {
        context[k] = JSON.parse(v)
      } catch {
        context[k] = v
      }
    }

    const result = await evaluate(key, context)

    if (!result) {
      return json({ error: 'Flag not found' }, 404)
    }

    return json({
      key: result.key,
      value: result.value,
      reason: result.reason,
      ruleId: result.ruleId,
      type: result.flagType,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return json({ error: message }, 500)
  }
}
