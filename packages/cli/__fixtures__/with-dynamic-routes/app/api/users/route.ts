/**
 * Users list route for testing dynamic routes.
 */

import type { Context } from 'hono'

const users = [
  { id: '1', name: 'Alice' },
  { id: '2', name: 'Bob' },
  { id: '3', name: 'Charlie' },
]

export const GET = (c: Context) => {
  return c.json({ users })
}
