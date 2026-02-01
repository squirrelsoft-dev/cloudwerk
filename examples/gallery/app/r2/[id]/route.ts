import type { CloudwerkHandlerContext } from '@cloudwerk/core'
import { getContext } from '@cloudwerk/core'
import { getBinding } from '@cloudwerk/core/bindings'
import type { CloudflareImagesBinding } from '@cloudwerk/images'

interface R2Bucket {
  get(key: string): Promise<{
    body: ReadableStream
    arrayBuffer(): Promise<ArrayBuffer>
    httpMetadata?: { contentType?: string }
  } | null>
}

// Cloudflare Workers Cache API (only available in Workers runtime)
declare const caches: { default: Cache } | undefined

/** Cache TTL: 1 day for transformed images */
const CACHE_TTL = 86400

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

/**
 * GET /r2/:id - Fetch from R2 and optionally transform
 *
 * The :id param is the full R2 key (e.g., "abc123.webp")
 *
 * Query params:
 * - type=thumbnail: resize to 128x128 cover
 * - type=display: resize to 1280x720 contain
 *
 * Uses IMAGES binding for on-the-fly resizing when available.
 * Caches transformed images using the Cache API (production only).
 */
export async function GET(
  request: Request,
  { params }: CloudwerkHandlerContext<{ id: string }>
) {
  const url = new URL(request.url)
  const type = url.searchParams.get('type') || 'display'
  const key = decodeURIComponent(params.id)

  // Create a cache key based on the image key and transform type
  const cacheKey = new Request(url.toString(), { method: 'GET' })
  const cache = getCache()

  // Check cache first (production only)
  if (cache) {
    try {
      const cachedResponse = await cache.match(cacheKey)
      if (cachedResponse) {
        return cachedResponse
      }
    } catch {
      // Cache check failed, continue without cache
    }
  }

  try {
    const BUCKET = getBinding<R2Bucket>('GALLERY_BUCKET')
    const object = await BUCKET.get(key)

    if (!object) {
      return new Response('Not found', { status: 404 })
    }

    // Try to use IMAGES binding for resizing
    try {
      const IMAGES = getBinding<CloudflareImagesBinding>('IMAGES')

      if (IMAGES && typeof IMAGES.input === 'function') {
        const transform =
          type === 'thumbnail'
            ? { width: 128, height: 128, fit: 'cover' as const }
            : { width: 1280, height: 720, fit: 'contain' as const }

        const transformed = await IMAGES
          .input(object.body)
          .transform(transform)
          .output({ format: 'image/webp' })

        // Get the response and add cache headers
        const imageResponse = transformed.response()
        const responseBody = await imageResponse.arrayBuffer()

        const response = new Response(responseBody, {
          headers: {
            'Content-Type': 'image/webp',
            'Cache-Control': `public, max-age=${CACHE_TTL}`,
          },
        })

        // Cache the response in the background (production only)
        if (cache) {
          const { executionCtx } = getContext()
          executionCtx.waitUntil(cache.put(cacheKey, response.clone()))
        }

        return response
      }
    } catch {
      // Fall through to serve original
    }

    // Fallback: serve original image (also cache it)
    const contentType = object.httpMetadata?.contentType || 'image/jpeg'
    const body = await object.arrayBuffer()

    const response = new Response(body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': `public, max-age=${CACHE_TTL}`,
      },
    })

    // Cache the fallback response too (production only)
    if (cache) {
      const { executionCtx } = getContext()
      executionCtx.waitUntil(cache.put(cacheKey, response.clone()))
    }

    return response
  } catch (error) {
    console.error('Error serving image:', error)
    return new Response(
      error instanceof Error ? error.message : 'Failed to serve image',
      { status: 500 }
    )
  }
}
