/**
 * @cloudwerk/images - Image Client
 *
 * Client for interacting with Cloudflare Images API.
 */

import type {
  ImageClientInterface,
  ImageResult,
  DirectUploadResult,
  UploadOptions,
  DirectUploadOptions,
  ListOptions,
  ImageVariant,
} from './types.js'
import type {
  CloudflareApiResponse,
  CloudflareUploadResponse,
  CloudflareDirectUploadResponse,
  CloudflareListResponse,
  CloudflareImage,
} from './cloudflare-types.js'
import { CLOUDFLARE_IMAGES_API } from './cloudflare-types.js'
import {
  ImageApiError,
  ImageNotFoundError,
  ImageUploadError,
  ImageVariantError,
} from './errors.js'

// ============================================================================
// Utilities
// ============================================================================

/**
 * Parse a duration string into an ISO 8601 expiry timestamp.
 *
 * @param duration - Duration string ('30m', '1h') or seconds
 * @returns ISO 8601 timestamp string
 */
function parseExpiry(duration: string | number): string {
  let seconds: number

  if (typeof duration === 'number') {
    seconds = duration
  } else {
    const match = duration.match(/^(\d+)(s|m|h|d)$/)
    if (!match) {
      // Default to 30 minutes if invalid format
      seconds = 30 * 60
    } else {
      const value = parseInt(match[1], 10)
      const unit = match[2]

      switch (unit) {
        case 's':
          seconds = value
          break
        case 'm':
          seconds = value * 60
          break
        case 'h':
          seconds = value * 3600
          break
        case 'd':
          seconds = value * 86400
          break
        default:
          seconds = 30 * 60
      }
    }
  }

  const expiryDate = new Date(Date.now() + seconds * 1000)
  return expiryDate.toISOString()
}

/**
 * Convert Cloudflare API image to ImageResult.
 */
function toImageResult(image: CloudflareImage | CloudflareUploadResponse): ImageResult {
  return {
    id: image.id,
    filename: image.filename || undefined,
    uploaded: new Date(image.uploaded),
    variants: image.variants.map((url) => {
      // Extract variant name from URL
      const parts = url.split('/')
      return parts[parts.length - 1]
    }),
    metadata: image.meta,
    requireSignedURLs: image.requireSignedURLs,
  }
}

// ============================================================================
// Image Client
// ============================================================================

/**
 * Client for interacting with Cloudflare Images.
 *
 * @example
 * ```typescript
 * const client = new ImageClient('account-id', 'api-token', {
 *   thumbnail: { width: 100, height: 100, fit: 'cover' },
 * })
 *
 * // Upload an image
 * const result = await client.upload(file)
 *
 * // Get URL with variant
 * const url = client.url(result.id, 'thumbnail')
 * ```
 */
export class ImageClient<T extends string = string>
  implements ImageClientInterface<T>
{
  private readonly accountId: string
  private readonly apiToken: string
  private readonly deliveryUrl?: string
  private readonly variants: Record<string, ImageVariant>
  private readonly variantNames: string[]

  constructor(
    accountId: string,
    apiToken: string,
    variants: Record<string, ImageVariant> = {},
    deliveryUrl?: string
  ) {
    this.accountId = accountId
    this.apiToken = apiToken
    this.variants = variants
    this.variantNames = Object.keys(variants)
    this.deliveryUrl = deliveryUrl
  }

  /**
   * Make an authenticated API request.
   */
  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<CloudflareApiResponse<T>> {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        ...options.headers,
      },
    })

    const data = (await response.json()) as CloudflareApiResponse<T>

    if (!response.ok || !data.success) {
      throw new ImageApiError(response.status, data.errors || [])
    }

    return data
  }

  /**
   * Upload an image file.
   */
  async upload(
    file: File | Blob | ReadableStream,
    options: UploadOptions = {}
  ): Promise<ImageResult> {
    const endpoint = CLOUDFLARE_IMAGES_API.images(this.accountId)

    const formData = new FormData()

    // Handle different file types
    if (file instanceof ReadableStream) {
      // Convert ReadableStream to Blob
      const response = new Response(file)
      const blob = await response.blob()
      formData.append('file', blob)
    } else {
      formData.append('file', file)
    }

    // Add optional parameters
    if (options.id) {
      formData.append('id', options.id)
    }

    if (options.requireSignedURLs !== undefined) {
      formData.append('requireSignedURLs', String(options.requireSignedURLs))
    }

    if (options.metadata) {
      formData.append('metadata', JSON.stringify(options.metadata))
    }

    try {
      const response = await this.fetch<CloudflareUploadResponse>(endpoint, {
        method: 'POST',
        body: formData,
      })

      return toImageResult(response.result)
    } catch (error) {
      if (error instanceof ImageApiError) {
        throw new ImageUploadError(
          `Failed to upload image: ${error.message}`,
          error.statusCode,
          error.errors.map((e) => e.message).join(', ')
        )
      }
      throw error
    }
  }

  /**
   * Generate a direct upload URL for client-side uploads.
   */
  async getDirectUploadUrl(
    options: DirectUploadOptions = {}
  ): Promise<DirectUploadResult> {
    const endpoint = CLOUDFLARE_IMAGES_API.directUpload(this.accountId)

    const body: Record<string, unknown> = {}

    if (options.requireSignedURLs !== undefined) {
      body.requireSignedURLs = options.requireSignedURLs
    }

    if (options.metadata) {
      body.metadata = options.metadata
    }

    if (options.expiry) {
      body.expiry = parseExpiry(options.expiry)
    }

    const response = await this.fetch<CloudflareDirectUploadResponse>(
      endpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    return {
      uploadUrl: response.result.uploadURL,
      id: response.result.id,
    }
  }

  /**
   * Delete an image.
   */
  async delete(imageId: string): Promise<void> {
    const endpoint = CLOUDFLARE_IMAGES_API.image(this.accountId, imageId)

    try {
      await this.fetch(endpoint, {
        method: 'DELETE',
      })
    } catch (error) {
      if (error instanceof ImageApiError && error.statusCode === 404) {
        throw new ImageNotFoundError(imageId)
      }
      throw error
    }
  }

  /**
   * Get image details.
   */
  async get(imageId: string): Promise<ImageResult | null> {
    const endpoint = CLOUDFLARE_IMAGES_API.image(this.accountId, imageId)

    try {
      const response = await this.fetch<CloudflareImage>(endpoint)
      return toImageResult(response.result)
    } catch (error) {
      if (error instanceof ImageApiError && error.statusCode === 404) {
        return null
      }
      throw error
    }
  }

  /**
   * List images with pagination.
   */
  async list(options: ListOptions = {}): Promise<ImageResult[]> {
    const endpoint = CLOUDFLARE_IMAGES_API.images(this.accountId)
    const params = new URLSearchParams()

    if (options.page !== undefined) {
      params.set('page', String(options.page))
    }

    if (options.perPage !== undefined) {
      params.set('per_page', String(Math.min(100, Math.max(1, options.perPage))))
    }

    const urlWithParams = params.toString()
      ? `${endpoint}?${params}`
      : endpoint

    const response = await this.fetch<CloudflareListResponse>(urlWithParams)
    return response.result.images.map(toImageResult)
  }

  /**
   * Generate URL for an image with optional variant.
   */
  url(imageId: string, variant?: T): string {
    // Validate variant if provided
    if (variant !== undefined && !this.variantNames.includes(variant)) {
      throw new ImageVariantError(variant, this.variantNames)
    }

    // Use custom delivery URL if provided
    if (this.deliveryUrl) {
      const variantPath = variant ? `/${variant}` : ''
      return `${this.deliveryUrl}/${imageId}${variantPath}`
    }

    // Use default Cloudflare Images delivery URL
    const variantName = variant ?? 'public'
    return CLOUDFLARE_IMAGES_API.deliveryUrl(
      this.accountId,
      imageId,
      variantName
    )
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an image client from configuration.
 *
 * @param accountId - Cloudflare account ID
 * @param apiToken - Cloudflare Images API token
 * @param variants - Variant definitions
 * @param deliveryUrl - Custom delivery URL (optional)
 * @returns Image client instance
 */
export function createImageClient<T extends string = string>(
  accountId: string,
  apiToken: string,
  variants: Record<T, ImageVariant> = {} as Record<T, ImageVariant>,
  deliveryUrl?: string
): ImageClient<T> {
  return new ImageClient<T>(accountId, apiToken, variants, deliveryUrl)
}
