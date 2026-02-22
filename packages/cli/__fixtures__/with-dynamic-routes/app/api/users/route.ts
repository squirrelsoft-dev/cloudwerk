/**
 * Users list route for testing dynamic routes.
 */

import { json } from '@cloudwerk/core/runtime'

const users = [
  { id: '1', name: 'Alice' },
  { id: '2', name: 'Bob' },
  { id: '3', name: 'Charlie' },
]

export function GET() {
  return json({ users })
}
