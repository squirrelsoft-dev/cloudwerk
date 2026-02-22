// POST /api/flags - Bulk evaluate flags for a context

import { json } from '@cloudwerk/core/runtime'
import { evaluateAll } from '@/services/flags/service'
import type { EvaluationContext } from '@/lib/types'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { context?: EvaluationContext }
    const context = body.context ?? {}

    const results = await evaluateAll(context)

    // Convert Map to plain object for JSON response
    const flags: Record<string, unknown> = {}
    for (const [key, result] of results) {
      flags[key] = {
        value: result.value,
        reason: result.reason,
        ruleId: result.ruleId,
        type: result.flagType,
      }
    }

    return json({ flags })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return json({ error: message }, 500)
  }
}

export async function GET() {
  return json({ error: 'Use POST with a context object to evaluate flags' }, 405)
}
