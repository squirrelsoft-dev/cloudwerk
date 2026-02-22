// Admin API: GET /api/admin/flags - List all flags
// Admin API: POST /api/admin/flags - Create a new flag

import { json } from '@cloudwerk/core/runtime'
import { get } from '@cloudwerk/core/context'
import { listFlags, createFlag } from '@/services/flags/service'
import type { CreateFlagInput } from '@/services/flags/service'

interface AuthSession {
  user?: {
    id: string
    email?: string
  }
}

export async function GET() {
  try {
    const flags = await listFlags()
    return json({ flags })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return json({ error: message }, 500)
  }
}

export async function POST(request: Request) {
  try {
    const session = get<AuthSession>('session')
    const body = (await request.json()) as CreateFlagInput

    if (!body.key || !body.name) {
      return json({ error: 'key and name are required' }, 400)
    }

    // Validate key format (lowercase, alphanumeric with dashes)
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.key)) {
      return json({
        error: 'key must be lowercase alphanumeric with dashes (e.g., my-feature-flag)',
      }, 400)
    }

    const flag = await createFlag(body, {
      userId: session?.user?.id,
      userEmail: session?.user?.email,
    })

    return json({ flag }, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    // Handle unique constraint violation
    if (message.includes('UNIQUE') || message.includes('unique')) {
      return json({ error: 'A flag with this key already exists' }, 409)
    }

    return json({ error: message }, 500)
  }
}
