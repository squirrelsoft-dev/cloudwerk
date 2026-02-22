// Admin API: GET /api/admin/segments/:id - Get a segment
// Admin API: PUT /api/admin/segments/:id - Update a segment
// Admin API: DELETE /api/admin/segments/:id - Delete a segment

import { json, type CloudwerkHandlerContext } from '@cloudwerk/core/runtime'
import { get } from '@cloudwerk/core/context'
import { getSegment, updateSegment, deleteSegment } from '@/services/flags/service'
import type { UpdateSegmentInput } from '@/services/flags/service'

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
      return json({ error: 'Segment ID is required' }, 400)
    }

    const segment = await getSegment(id)
    if (!segment) {
      return json({ error: 'Segment not found' }, 404)
    }

    return json({ segment })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return json({ error: message }, 500)
  }
}

export async function PUT(request: Request, { params }: CloudwerkHandlerContext) {
  try {
    const id = params.id
    if (!id) {
      return json({ error: 'Segment ID is required' }, 400)
    }

    const session = get<AuthSession>('session')
    const body = (await request.json()) as UpdateSegmentInput

    const segment = await updateSegment(id, body, {
      userId: session?.user?.id,
      userEmail: session?.user?.email,
    })

    if (!segment) {
      return json({ error: 'Segment not found' }, 404)
    }

    return json({ segment })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return json({ error: message }, 500)
  }
}

export async function DELETE(_request: Request, { params }: CloudwerkHandlerContext) {
  try {
    const id = params.id
    if (!id) {
      return json({ error: 'Segment ID is required' }, 400)
    }

    const session = get<AuthSession>('session')
    const deleted = await deleteSegment(id, {
      userId: session?.user?.id,
      userEmail: session?.user?.email,
    })

    if (!deleted) {
      return json({ error: 'Segment not found' }, 404)
    }

    return json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return json({ error: message }, 500)
  }
}
