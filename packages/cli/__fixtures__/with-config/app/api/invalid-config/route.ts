/**
 * Route with invalid config for testing validation.
 */

import { json } from '@cloudwerk/core'
import type { CloudwerkHandler } from '@cloudwerk/core'

// Invalid config - auth value is not one of the allowed values
export const config = {
  auth: 'invalid-auth-value',
}

export const GET: CloudwerkHandler = (_request, _context) => {
  return json({ message: 'Should not reach this' })
}
