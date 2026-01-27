/**
 * Public route without config export - tests that routes work normally without config.
 */

import { json } from '@cloudwerk/core'
import type { CloudwerkHandler } from '@cloudwerk/core'

export const GET: CloudwerkHandler = (_request, _context) => {
  return json({ message: 'Public resource' })
}
