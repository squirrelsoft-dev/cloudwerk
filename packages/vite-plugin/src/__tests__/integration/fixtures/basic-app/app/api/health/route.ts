import type { CloudwerkHandlerContext } from '@cloudwerk/core'
import { json } from '@cloudwerk/core'

export function GET(_request: Request, _context: CloudwerkHandlerContext) {
  return json({ status: 'ok', timestamp: new Date().toISOString() })
}

export function POST(request: Request, _context: CloudwerkHandlerContext) {
  return json({ method: 'POST', url: request.url })
}
