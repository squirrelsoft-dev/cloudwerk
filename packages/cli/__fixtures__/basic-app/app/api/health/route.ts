/**
 * Health check route for testing.
 */

import type { Context } from 'hono'

export const GET = (c: Context) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
}
