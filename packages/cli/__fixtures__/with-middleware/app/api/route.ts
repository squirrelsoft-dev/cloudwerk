/**
 * Public API route - only root middleware applies
 */
import { getContext } from '@cloudwerk/core'

export function GET(_request: Request, _context: { params: Record<string, string> }) {
  const ctx = getContext()
  const requestStart = ctx.get<number>('requestStart')

  return new Response(
    JSON.stringify({
      message: 'Public endpoint',
      hasRequestStart: requestStart !== undefined,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}
