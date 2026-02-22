/**
 * Users route for testing.
 */

import { json } from '@cloudwerk/core/runtime'

const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
]

export function GET() {
  return json({ users })
}

export async function POST(request: Request) {
  const body = await request.json()
  const newUser = {
    id: users.length + 1,
    ...body,
  }
  users.push(newUser)
  return json(newUser, 201)
}
