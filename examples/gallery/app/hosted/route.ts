import type { CloudwerkHandlerContext } from '@cloudwerk/core'
import { json } from '@cloudwerk/core'
import { getBinding } from '@cloudwerk/core/bindings'
import { createImageClient } from '@cloudwerk/images'

interface Env {
  CF_ACCOUNT_ID: string
  CF_IMAGES_TOKEN: string
}

/**
 * GET /hosted - List images from Cloudflare Hosted Images
 */
export async function GET(_request: Request, _context: CloudwerkHandlerContext) {
  const env = getBinding<Env['CF_ACCOUNT_ID']>('CF_ACCOUNT_ID')
  const token = getBinding<Env['CF_IMAGES_TOKEN']>('CF_IMAGES_TOKEN')

  if (!env || !token) {
    return json({
      error: 'Missing CF_ACCOUNT_ID or CF_IMAGES_TOKEN configuration',
      images: [],
    })
  }

  const client = createImageClient(
    env as string,
    token as string,
    {
      thumbnail: { width: 128, height: 128, fit: 'cover' },
      display: { width: 1280, height: 720, fit: 'contain' },
    }
  )

  try {
    const images = await client.list({ perPage: 50 })

    return json({
      images: images.map((img) => ({
        id: img.id,
        thumbnailUrl: client.url(img.id, 'thumbnail'),
        displayUrl: client.url(img.id, 'display'),
        filename: img.filename,
        uploaded: img.uploaded,
      })),
    })
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : 'Failed to list images',
      images: [],
    })
  }
}

/**
 * POST /hosted - Upload an image to Cloudflare Hosted Images
 */
export async function POST(request: Request, _context: CloudwerkHandlerContext) {
  const env = getBinding<Env['CF_ACCOUNT_ID']>('CF_ACCOUNT_ID')
  const token = getBinding<Env['CF_IMAGES_TOKEN']>('CF_IMAGES_TOKEN')

  if (!env || !token) {
    return json(
      { error: 'Missing CF_ACCOUNT_ID or CF_IMAGES_TOKEN configuration' },
      500
    )
  }

  const client = createImageClient(
    env as string,
    token as string,
    {
      thumbnail: { width: 128, height: 128, fit: 'cover' },
      display: { width: 1280, height: 720, fit: 'contain' },
    }
  )

  try {
    const formData = await request.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      return json({ error: 'No image provided' }, 400)
    }

    await client.upload(file)

    // Redirect back to the hosted page after upload
    return new Response(null, {
      status: 303,
      headers: {
        Location: '/hosted',
      },
    })
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'Failed to upload image' },
      500
    )
  }
}

/**
 * DELETE /hosted - Delete an image from Cloudflare Hosted Images
 */
export async function DELETE(request: Request, _context: CloudwerkHandlerContext) {
  const url = new URL(request.url)
  const imageId = url.searchParams.get('id')

  if (!imageId) {
    return json({ error: 'Missing image ID' }, 400)
  }

  const env = getBinding<Env['CF_ACCOUNT_ID']>('CF_ACCOUNT_ID')
  const token = getBinding<Env['CF_IMAGES_TOKEN']>('CF_IMAGES_TOKEN')

  if (!env || !token) {
    return json(
      { error: 'Missing CF_ACCOUNT_ID or CF_IMAGES_TOKEN configuration' },
      500
    )
  }

  const client = createImageClient(env as string, token as string)

  try {
    await client.delete(imageId)
    return json({ success: true })
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'Failed to delete image' },
      500
    )
  }
}
