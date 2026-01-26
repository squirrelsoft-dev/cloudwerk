/**
 * Single user route for testing dynamic routes.
 */

import type { Context } from 'hono'

const users = [
  { id: '1', name: 'Alice', email: 'alice@example.com' },
  { id: '2', name: 'Bob', email: 'bob@example.com' },
  { id: '3', name: 'Charlie', email: 'charlie@example.com' },
]

export const GET = (c: Context) => {
  const id = c.req.param('id')
  const user = users.find((u) => u.id === id)

  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  return c.json({ user })
}

export const PUT = async (c: Context) => {
  const id = c.req.param('id')
  const index = users.findIndex((u) => u.id === id)

  if (index === -1) {
    return c.json({ error: 'User not found' }, 404)
  }

  const body = await c.req.json()
  users[index] = { ...users[index], ...body }

  return c.json({ user: users[index] })
}

export const DELETE = (c: Context) => {
  const id = c.req.param('id')
  const index = users.findIndex((u) => u.id === id)

  if (index === -1) {
    return c.json({ error: 'User not found' }, 404)
  }

  users.splice(index, 1)

  return new Response(null, { status: 204 })
}
