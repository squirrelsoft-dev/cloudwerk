/**
 * Echo route for testing request/response.
 */

import { json } from '@cloudwerk/core/runtime'

export async function POST(request: Request) {
  const body = await request.json()
  return json({
    echo: body,
    method: request.method,
    path: new URL(request.url).pathname,
    timestamp: new Date().toISOString(),
  })
}
