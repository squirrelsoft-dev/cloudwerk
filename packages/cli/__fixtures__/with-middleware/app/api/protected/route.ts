/**
 * Protected route - requires auth middleware
 */
import { getContext } from '@cloudwerk/core'

interface User {
  id: string
  name: string
}

export function GET(_request: Request, _context: { params: Record<string, string> }) {
  const ctx = getContext()
  const user = ctx.get<User>('user')
  const requestStart = ctx.get<number>('requestStart')

  return new Response(
    JSON.stringify({
      message: 'Protected endpoint',
      user,
      hasRequestStart: requestStart !== undefined,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}
