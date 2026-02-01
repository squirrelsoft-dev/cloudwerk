/**
 * @cloudwerk/images - Image Transformer
 *
 * Route handler helper for Cloudflare's Image Resizing service.
 * Creates a handler that transforms images via `fetch(url, { cf: { image: {...} } })`.
 *
 * @example
 * ```typescript
 * // app/cdn/images/[...path]/route.ts
 * import { createImageTransformer } from '@cloudwerk/images'
 *
 * export const GET = createImageTransformer({
 *   allowedOrigins: ['https://images.mysite.com'],
 *   presets: {
 *     thumbnail: { width: 100, height: 100, fit: 'cover' },
 *     hero: { width: 1920, height: 1080, fit: 'cover' },
 *   },
 * })
 * ```
 */

import type { ImageVariant } from './types.js'

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for the image transformer route handler.
 */
export interface TransformerConfig {
  /**
   * Allowed origin URLs for image sources.
   * If not specified, any origin is allowed (not recommended for production).
   *
   * @example ['https://images.mysite.com', 'https://cdn.example.com']
   */
  allowedOrigins?: string[]

  /**
   * Named transformation presets.
   * Can be applied via URL parameter (e.g., ?preset=thumbnail).
   *
   * @example
   * ```typescript
   * presets: {
   *   thumbnail: { width: 100, height: 100, fit: 'cover' },
   *   hero: { width: 1920, height: 1080, fit: 'cover' },
   * }
   * ```
   */
  presets?: Record<string, TransformPreset>

  /**
   * Default transformation options applied to all requests.
   */
  defaults?: TransformPreset

  /**
   * Maximum allowed width. Requests exceeding this will be clamped.
   * @default 4096
   */
  maxWidth?: number

  /**
   * Maximum allowed height. Requests exceeding this will be clamped.
   * @default 4096
   */
  maxHeight?: number

  /**
   * Cache control header for transformed images.
   * @default 'public, max-age=31536000' (1 year)
   */
  cacheControl?: string

  /**
   * Whether to allow arbitrary width/height from query parameters.
   * If false, only preset transformations are allowed.
   * @default true
   */
  allowArbitrary?: boolean

  /**
   * Custom validation function for source URLs.
   * Return true to allow the URL, false to reject.
   */
  validateSource?: (url: URL) => boolean | Promise<boolean>
}

/**
 * Transformation preset options.
 * Subset of Cloudflare Image Resizing options.
 */
export interface TransformPreset {
  /** Width in pixels */
  width?: number
  /** Height in pixels */
  height?: number
  /** Fit mode */
  fit?: 'cover' | 'contain' | 'scale-down' | 'crop' | 'pad'
  /** Output format */
  format?: 'webp' | 'avif' | 'json' | 'jpeg' | 'png' | 'auto'
  /** Quality (1-100) */
  quality?: number
  /** Device pixel ratio (1-3) */
  dpr?: number
  /** Gravity for cropping */
  gravity?: 'auto' | 'center' | 'top' | 'bottom' | 'left' | 'right' | 'face'
  /** Sharpen (0-10) */
  sharpen?: number
  /** Blur (1-250) */
  blur?: number
  /** Brightness (-1 to 1) */
  brightness?: number
  /** Contrast (-1 to 1) */
  contrast?: number
  /** Rotation (0, 90, 180, 270) */
  rotate?: 0 | 90 | 180 | 270
  /** Metadata handling */
  metadata?: 'keep' | 'copyright' | 'none'
  /** Background color for padding */
  background?: string
}

/**
 * Cloudflare Image Resizing options passed to fetch().
 */
interface CfImageOptions {
  width?: number
  height?: number
  fit?: string
  format?: string
  quality?: number
  dpr?: number
  gravity?: string
  sharpen?: number
  blur?: number
  brightness?: number
  contrast?: number
  rotate?: number
  metadata?: string
  background?: string
}

// ============================================================================
// Errors
// ============================================================================

/**
 * Error thrown when image transformation fails.
 */
export class ImageTransformError extends Error {
  readonly status: number
  readonly code: string

  constructor(message: string, status: number, code: string) {
    super(message)
    this.name = 'ImageTransformError'
    this.status = status
    this.code = code
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parse transformation options from URL search params.
 */
function parseTransformParams(
  searchParams: URLSearchParams,
  config: TransformerConfig
): TransformPreset {
  const options: TransformPreset = {}

  // Check for preset
  const presetName = searchParams.get('preset')
  if (presetName && config.presets?.[presetName]) {
    Object.assign(options, config.presets[presetName])
  }

  // Apply defaults
  if (config.defaults) {
    // Defaults are applied first, then overridden by preset and params
    Object.assign(options, config.defaults, options)
  }

  // If arbitrary params are allowed, parse them
  if (config.allowArbitrary !== false) {
    // Width
    const width = searchParams.get('w') || searchParams.get('width')
    if (width) {
      const w = parseInt(width, 10)
      if (!isNaN(w) && w > 0) {
        options.width = Math.min(w, config.maxWidth ?? 4096)
      }
    }

    // Height
    const height = searchParams.get('h') || searchParams.get('height')
    if (height) {
      const h = parseInt(height, 10)
      if (!isNaN(h) && h > 0) {
        options.height = Math.min(h, config.maxHeight ?? 4096)
      }
    }

    // Fit
    const fit = searchParams.get('fit')
    if (fit && ['cover', 'contain', 'scale-down', 'crop', 'pad'].includes(fit)) {
      options.fit = fit as TransformPreset['fit']
    }

    // Format
    const format = searchParams.get('format') || searchParams.get('f')
    if (format && ['webp', 'avif', 'jpeg', 'png', 'auto'].includes(format)) {
      options.format = format as TransformPreset['format']
    }

    // Quality
    const quality = searchParams.get('q') || searchParams.get('quality')
    if (quality) {
      const q = parseInt(quality, 10)
      if (!isNaN(q) && q >= 1 && q <= 100) {
        options.quality = q
      }
    }

    // DPR
    const dpr = searchParams.get('dpr')
    if (dpr) {
      const d = parseFloat(dpr)
      if (!isNaN(d) && d >= 1 && d <= 3) {
        options.dpr = d
      }
    }

    // Gravity
    const gravity = searchParams.get('gravity')
    if (gravity && ['auto', 'center', 'top', 'bottom', 'left', 'right', 'face'].includes(gravity)) {
      options.gravity = gravity as TransformPreset['gravity']
    }

    // Blur
    const blur = searchParams.get('blur')
    if (blur) {
      const b = parseInt(blur, 10)
      if (!isNaN(b) && b >= 1 && b <= 250) {
        options.blur = b
      }
    }

    // Sharpen
    const sharpen = searchParams.get('sharpen')
    if (sharpen) {
      const s = parseFloat(sharpen)
      if (!isNaN(s) && s >= 0 && s <= 10) {
        options.sharpen = s
      }
    }

    // Brightness
    const brightness = searchParams.get('brightness')
    if (brightness) {
      const br = parseFloat(brightness)
      if (!isNaN(br) && br >= -1 && br <= 1) {
        options.brightness = br
      }
    }

    // Contrast
    const contrast = searchParams.get('contrast')
    if (contrast) {
      const c = parseFloat(contrast)
      if (!isNaN(c) && c >= -1 && c <= 1) {
        options.contrast = c
      }
    }

    // Rotate
    const rotate = searchParams.get('rotate')
    if (rotate) {
      const r = parseInt(rotate, 10)
      if ([0, 90, 180, 270].includes(r)) {
        options.rotate = r as TransformPreset['rotate']
      }
    }
  }

  return options
}

/**
 * Convert TransformPreset to Cloudflare Image options.
 */
function presetToCfOptions(preset: TransformPreset): CfImageOptions {
  const options: CfImageOptions = {}

  if (preset.width !== undefined) options.width = preset.width
  if (preset.height !== undefined) options.height = preset.height
  if (preset.fit !== undefined) options.fit = preset.fit
  if (preset.format !== undefined) options.format = preset.format
  if (preset.quality !== undefined) options.quality = preset.quality
  if (preset.dpr !== undefined) options.dpr = preset.dpr
  if (preset.gravity !== undefined) options.gravity = preset.gravity
  if (preset.sharpen !== undefined) options.sharpen = preset.sharpen
  if (preset.blur !== undefined) options.blur = preset.blur
  if (preset.brightness !== undefined) options.brightness = preset.brightness
  if (preset.contrast !== undefined) options.contrast = preset.contrast
  if (preset.rotate !== undefined) options.rotate = preset.rotate
  if (preset.metadata !== undefined) options.metadata = preset.metadata
  if (preset.background !== undefined) options.background = preset.background

  return options
}

/**
 * Validate a source URL against allowed origins.
 */
function validateOrigin(sourceUrl: URL, allowedOrigins?: string[]): boolean {
  if (!allowedOrigins || allowedOrigins.length === 0) {
    return true // No restrictions
  }

  const sourceOrigin = sourceUrl.origin
  return allowedOrigins.some((origin) => {
    // Exact match
    if (origin === sourceOrigin) return true
    // Wildcard subdomain match (e.g., 'https://*.example.com')
    if (origin.includes('*')) {
      const pattern = origin.replace(/\*/g, '[^.]+')
      const regex = new RegExp(`^${pattern}$`)
      return regex.test(sourceOrigin)
    }
    return false
  })
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Create an image transformer route handler.
 *
 * This creates a GET handler that:
 * 1. Extracts the source image URL from the request path
 * 2. Parses transformation options from query parameters
 * 3. Fetches the source image with Cloudflare Image Resizing options
 * 4. Returns the transformed image
 *
 * @param config - Transformer configuration
 * @returns Route handler function
 *
 * @example
 * ```typescript
 * // app/cdn/images/[...path]/route.ts
 * import { createImageTransformer } from '@cloudwerk/images'
 *
 * export const GET = createImageTransformer({
 *   allowedOrigins: ['https://images.mysite.com'],
 *   presets: {
 *     thumbnail: { width: 100, height: 100, fit: 'cover' },
 *     hero: { width: 1920, height: 1080, fit: 'cover' },
 *   },
 *   defaults: {
 *     format: 'auto',
 *     quality: 85,
 *   },
 * })
 *
 * // Usage:
 * // /cdn/images/https://images.mysite.com/photo.jpg?preset=thumbnail
 * // /cdn/images/https://images.mysite.com/photo.jpg?w=800&h=600&fit=cover
 * ```
 */
export function createImageTransformer(
  config: TransformerConfig = {}
): (request: Request, context: { params: Record<string, string | string[]> }) => Promise<Response> {
  const {
    allowedOrigins,
    presets = {},
    defaults = {},
    maxWidth = 4096,
    maxHeight = 4096,
    cacheControl = 'public, max-age=31536000',
    allowArbitrary = true,
    validateSource,
  } = config

  return async (request: Request, context: { params: Record<string, string | string[]> }) => {
    // Get the source URL from the path parameter
    const pathParam = context.params.path
    if (!pathParam) {
      return new Response(JSON.stringify({ error: 'Missing image path' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Reconstruct the source URL
    const sourcePath = Array.isArray(pathParam) ? pathParam.join('/') : pathParam
    let sourceUrl: URL

    try {
      sourceUrl = new URL(sourcePath)
    } catch {
      // Try treating it as a relative path if it doesn't look like a URL
      return new Response(JSON.stringify({ error: 'Invalid image URL' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Validate origin
    if (!validateOrigin(sourceUrl, allowedOrigins)) {
      return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Custom validation
    if (validateSource) {
      const isValid = await validateSource(sourceUrl)
      if (!isValid) {
        return new Response(JSON.stringify({ error: 'Source URL rejected' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    // Parse transformation options
    const requestUrl = new URL(request.url)
    const transformOptions = parseTransformParams(requestUrl.searchParams, {
      presets,
      defaults,
      maxWidth,
      maxHeight,
      allowArbitrary,
    })

    // Convert to Cloudflare options
    const cfOptions = presetToCfOptions(transformOptions)

    // Check if there are any transformations
    const hasTransforms = Object.keys(cfOptions).length > 0

    try {
      // Fetch the image with transformations
      const imageRequest = new Request(sourceUrl.toString(), {
        headers: request.headers,
      })

      const fetchOptions: RequestInit & { cf?: { image?: CfImageOptions } } = {}
      if (hasTransforms) {
        fetchOptions.cf = { image: cfOptions }
      }

      const response = await fetch(imageRequest, fetchOptions)

      if (!response.ok) {
        return new Response(JSON.stringify({ error: 'Failed to fetch source image' }), {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Return the transformed image with appropriate headers
      const headers = new Headers(response.headers)
      headers.set('Cache-Control', cacheControl)

      // Add Vary header for content negotiation
      headers.set('Vary', 'Accept')

      return new Response(response.body, {
        status: 200,
        headers,
      })
    } catch (error) {
      console.error('Image transform error:', error)
      return new Response(JSON.stringify({ error: 'Image transformation failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }
}

/**
 * Convert an ImageVariant to a TransformPreset.
 * Useful when you want to reuse variants defined for Hosted Images.
 */
export function variantToPreset(variant: ImageVariant): TransformPreset {
  const preset: TransformPreset = {}

  if (variant.width !== undefined) preset.width = variant.width
  if (variant.height !== undefined) preset.height = variant.height
  if (variant.fit !== undefined) preset.fit = variant.fit
  if (variant.format !== undefined) preset.format = variant.format
  if (variant.quality !== undefined) preset.quality = variant.quality
  if (variant.dpr !== undefined) preset.dpr = variant.dpr
  if (variant.gravity !== undefined) {
    // Map gravity values
    preset.gravity = variant.gravity
  }
  if (variant.sharpen !== undefined) preset.sharpen = variant.sharpen
  if (variant.blur !== undefined) preset.blur = variant.blur
  if (variant.brightness !== undefined) preset.brightness = variant.brightness
  if (variant.contrast !== undefined) preset.contrast = variant.contrast
  if (variant.rotate !== undefined) {
    // Ensure rotation is valid
    if ([0, 90, 180, 270].includes(variant.rotate)) {
      preset.rotate = variant.rotate as 0 | 90 | 180 | 270
    }
  }
  if (variant.metadata !== undefined) preset.metadata = variant.metadata

  return preset
}
