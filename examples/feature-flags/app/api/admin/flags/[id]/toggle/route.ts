// Admin API: POST /api/admin/flags/:id/toggle - Toggle flag enabled state

import { json, type CloudwerkHandlerContext } from '@cloudwerk/core/runtime'
import { get } from '@cloudwerk/core/context'
import { toggleFlag } from '@/services/flags/service'

interface AuthSession {
  user?: {
    id: string
    email?: string
  }
}

interface ToggleBody {
  enabled: boolean
}

export async function POST(request: Request, { params }: CloudwerkHandlerContext) {
  try {
    const id = params.id
    if (!id) {
      return json({ error: 'Flag ID is required' }, 400)
    }

    const session = get<AuthSession>('session')
    const body = (await request.json()) as ToggleBody

    if (typeof body.enabled !== 'boolean') {
      return json({ error: 'enabled must be a boolean' }, 400)
    }

    const flag = await toggleFlag(id, body.enabled, {
      userId: session?.user?.id,
      userEmail: session?.user?.email,
    })

    if (!flag) {
      return json({ error: 'Flag not found' }, 404)
    }

    return json({ flag })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return json({ error: message }, 500)
  }
}
