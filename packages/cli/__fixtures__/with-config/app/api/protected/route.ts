/**
 * Protected route with config export demonstrating route-level configuration.
 */

import { json } from '@cloudwerk/core'
import type { RouteConfig, CloudwerkHandler } from '@cloudwerk/core'

export const config: RouteConfig = {
  auth: 'required',
  rateLimit: '100/1m',
  cache: 'private',
  customMeta: { role: 'admin' },
}

export const GET: CloudwerkHandler = (_request, _context) => {
  return json({ message: 'Protected resource' })
}

export const POST: CloudwerkHandler = async (request, _context) => {
  const body = await request.json()
  return json({ received: body })
}
