// Admin API: GET /api/admin/flags/:id - Get a flag
// Admin API: PUT /api/admin/flags/:id - Update a flag
// Admin API: DELETE /api/admin/flags/:id - Delete a flag

import { json, type CloudwerkHandlerContext } from '@cloudwerk/core/runtime'
import { get } from '@cloudwerk/core/context'
import { getFlag, updateFlag, deleteFlag } from '@/services/flags/service'
import type { UpdateFlagInput } from '@/services/flags/service'

interface AuthSession {
  user?: {
    id: string
    email?: string
  }
}

export async function GET(_request: Request, { params }: CloudwerkHandlerContext) {
  try {
    const id = params.id
    if (!id) {
      return json({ error: 'Flag ID is required' }, 400)
    }

    const flag = await getFlag(id)
    if (!flag) {
      return json({ error: 'Flag not found' }, 404)
    }

    return json({ flag })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return json({ error: message }, 500)
  }
}

export async function PUT(request: Request, { params }: CloudwerkHandlerContext) {
  try {
    const id = params.id
    if (!id) {
      return json({ error: 'Flag ID is required' }, 400)
    }

    const session = get<AuthSession>('session')
    const body = (await request.json()) as UpdateFlagInput

    const flag = await updateFlag(id, body, {
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

export async function DELETE(_request: Request, { params }: CloudwerkHandlerContext) {
  try {
    const id = params.id
    if (!id) {
      return json({ error: 'Flag ID is required' }, 400)
    }

    const session = get<AuthSession>('session')
    const deleted = await deleteFlag(id, {
      userId: session?.user?.id,
      userEmail: session?.user?.email,
    })

    if (!deleted) {
      return json({ error: 'Flag not found' }, 404)
    }

    return json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return json({ error: message }, 500)
  }
}
