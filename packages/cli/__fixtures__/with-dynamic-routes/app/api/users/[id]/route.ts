/**
 * Single user route demonstrating Cloudwerk-native handler signature.
 */

import { json, notFoundResponse, noContent } from '@cloudwerk/core'
import type { CloudwerkHandler } from '@cloudwerk/core'

interface Params {
  id: string
}

const users = [
  { id: '1', name: 'Alice', email: 'alice@example.com' },
  { id: '2', name: 'Bob', email: 'bob@example.com' },
  { id: '3', name: 'Charlie', email: 'charlie@example.com' },
]

export const GET: CloudwerkHandler<Params> = (request, { params }) => {
  const user = users.find((u) => u.id === params.id)

  if (!user) {
    return notFoundResponse('User not found')
  }

  return json({ user })
}

export const PUT: CloudwerkHandler<Params> = async (request, { params }) => {
  const index = users.findIndex((u) => u.id === params.id)

  if (index === -1) {
    return notFoundResponse('User not found')
  }

  const body = await request.json()
  users[index] = { ...users[index], ...body }

  return json({ user: users[index] })
}

export const DELETE: CloudwerkHandler<Params> = (request, { params }) => {
  const index = users.findIndex((u) => u.id === params.id)

  if (index === -1) {
    return notFoundResponse('User not found')
  }

  users.splice(index, 1)

  return noContent()
}
