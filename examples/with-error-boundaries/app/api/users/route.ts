import { json } from '@cloudwerk/core'
import type { CloudwerkHandler } from '@cloudwerk/core'

export const GET: CloudwerkHandler = (_request, { params: _params }) => {
  return json({
    users: [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ],
  })
}
