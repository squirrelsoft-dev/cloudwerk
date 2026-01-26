/**
 * Echo route for testing request/response.
 */

import type { Context } from 'hono'

export const POST = async (c: Context) => {
  const body = await c.req.json()
  return c.json({
    echo: body,
    method: c.req.method,
    path: c.req.path,
    timestamp: new Date().toISOString(),
  })
}
