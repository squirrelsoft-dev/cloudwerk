import type { CloudwerkHandlerContext } from '@cloudwerk/core'
import { json, getContext } from '@cloudwerk/core'
import { getBinding } from '@cloudwerk/core/bindings'
import type { CloudflareImagesBinding } from '@cloudwerk/images'

// Cloudflare Workers Cache API (only available in Workers runtime)
declare const caches: { default: Cache } | undefined

/**
 * Get the Cache API if available (Workers runtime only, not in local dev)
 */
function getCache(): Cache | null {
  try {
    if (typeof caches !== 'undefined' && caches?.default) {
      return caches.default
    }
  } catch {
    // Cache API not available in dev
  }
  return null
}

interface R2Object {
  key: string
  customMetadata?: Record<string, string>
}

interface R2Bucket {
  put(
    key: string,
    value: ArrayBuffer | ReadableStream | Blob,
    options?: {
      httpMetadata?: { contentType?: string }
      customMetadata?: Record<string, string>
    }
  ): Promise<R2Object>
  get(key: string): Promise<{ body: ReadableStream; arrayBuffer(): Promise<ArrayBuffer> } | null>
  list(options?: { prefix?: string }): Promise<{ objects: R2Object[] }>
  delete(key: string): Promise<void>
}

/**
 * GET /r2 - List images from R2 bucket
 */
export async function GET(_request: Request, _context: CloudwerkHandlerContext) {
  try {
    const BUCKET = getBinding<R2Bucket>('GALLERY_BUCKET')
    const result = await BUCKET.list()

    // Support multiple image formats
    const imageExtensions = ['.webp', '.jpg', '.jpeg', '.png', '.gif']
    const images = result.objects
      .filter((obj: R2Object) => imageExtensions.some(ext => obj.key.endsWith(ext)))
      .map((obj: R2Object) => ({
        id: obj.key,
        key: obj.key,
        thumbnailUrl: `/r2/${encodeURIComponent(obj.key)}?type=thumbnail`,
        displayUrl: `/r2/${encodeURIComponent(obj.key)}?type=display`,
        filename: obj.customMetadata?.originalName,
      }))

    return json({ images })
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : 'Failed to list images',
      images: [],
    })
  }
}

/**
 * POST /r2 - Upload an image and store in R2
 *
 * Uses the IMAGES binding to convert to WebP format if available.
 */
export async function POST(request: Request, _context: CloudwerkHandlerContext) {
  try {
    const IMAGES = getBinding<CloudflareImagesBinding>('IMAGES')
    const BUCKET = getBinding<R2Bucket>('GALLERY_BUCKET')

    const formData = await request.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      return json({ error: 'No image provided' }, 400)
    }

    const id = crypto.randomUUID()
    const fileBuffer = await file.arrayBuffer()

    let imageData: ArrayBuffer
    let contentType: string
    let extension: string

    // Use IMAGES binding to convert to WebP if available
    if (IMAGES && typeof IMAGES.input === 'function') {
      try {
        const transformed = await IMAGES
          .input(fileBuffer)
          .output({ format: 'image/webp' })

        imageData = await transformed.response().arrayBuffer()
        contentType = 'image/webp'
        extension = 'webp'
      } catch {
        // Fallback: store original
        imageData = fileBuffer
        contentType = file.type || 'image/jpeg'
        extension = file.name.split('.').pop() || 'jpg'
      }
    } else {
      // No IMAGES binding - store original
      imageData = fileBuffer
      contentType = file.type || 'image/jpeg'
      extension = file.name.split('.').pop() || 'jpg'
    }

    // Store in R2
    const key = `${id}.${extension}`
    await BUCKET.put(key, imageData, {
      httpMetadata: { contentType },
      customMetadata: { originalName: file.name },
    })

    // Redirect back to the R2 page
    return new Response(null, {
      status: 303,
      headers: { Location: '/r2' },
    })
  } catch (error) {
    console.error('Upload error:', error)
    return json(
      { error: error instanceof Error ? error.message : 'Failed to upload image' },
      500
    )
  }
}

/**
 * DELETE /r2 - Delete an image from R2 and invalidate cache
 */
export async function DELETE(request: Request, _context: CloudwerkHandlerContext) {
  const url = new URL(request.url)
  const key = url.searchParams.get('key')

  if (!key) {
    return json({ error: 'Missing image key' }, 400)
  }

  try {
    const BUCKET = getBinding<R2Bucket>('GALLERY_BUCKET')
    await BUCKET.delete(key)

    // Invalidate cached transformed images (production only)
    const cache = getCache()
    if (cache) {
      const origin = url.origin
      const encodedKey = encodeURIComponent(key)

      // Delete both thumbnail and display cache entries
      const { executionCtx } = getContext()
      executionCtx.waitUntil(
        Promise.all([
          cache.delete(`${origin}/r2/${encodedKey}?type=thumbnail`),
          cache.delete(`${origin}/r2/${encodedKey}?type=display`),
        ])
      )
    }

    return json({ success: true })
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'Failed to delete image' },
      500
    )
  }
}
