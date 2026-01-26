/**
 * Users route for testing.
 */

import type { Context } from 'hono'

const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
]

export const GET = (c: Context) => {
  return c.json({ users })
}

export const POST = async (c: Context) => {
  const body = await c.req.json()
  const newUser = {
    id: users.length + 1,
    ...body,
  }
  users.push(newUser)
  return c.json(newUser, 201)
}
