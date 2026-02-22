// Admin API: GET /api/admin/segments - List all segments
// Admin API: POST /api/admin/segments - Create a new segment

import { json } from '@cloudwerk/core/runtime'
import { get } from '@cloudwerk/core/context'
import { listSegments, createSegment } from '@/services/flags/service'
import type { CreateSegmentInput } from '@/services/flags/service'

interface AuthSession {
  user?: {
    id: string
    email?: string
  }
}

export async function GET() {
  try {
    const segments = await listSegments()
    return json({ segments })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return json({ error: message }, 500)
  }
}

export async function POST(request: Request) {
  try {
    const session = get<AuthSession>('session')
    const body = (await request.json()) as CreateSegmentInput

    if (!body.key || !body.name) {
      return json({ error: 'key and name are required' }, 400)
    }

    // Validate key format (lowercase, alphanumeric with dashes)
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.key)) {
      return json({
        error: 'key must be lowercase alphanumeric with dashes (e.g., beta-users)',
      }, 400)
    }

    if (!body.conditions || !Array.isArray(body.conditions)) {
      return json({ error: 'conditions must be an array' }, 400)
    }

    const segment = await createSegment(body, {
      userId: session?.user?.id,
      userEmail: session?.user?.email,
    })

    return json({ segment }, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    // Handle unique constraint violation
    if (message.includes('UNIQUE') || message.includes('unique')) {
      return json({ error: 'A segment with this key already exists' }, 409)
    }

    return json({ error: message }, 500)
  }
}
