/**
 * Health check route for testing.
 */

import { json } from '@cloudwerk/core/runtime'

export function GET() {
  return json({ status: 'ok', timestamp: new Date().toISOString() })
}
