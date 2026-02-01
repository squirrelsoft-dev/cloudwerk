/**
 * @cloudwerk/images - Error Classes
 *
 * Custom error types for Cloudflare Images operations.
 */

// ============================================================================
// Base Error
// ============================================================================

/**
 * Base error class for all image-related errors.
 */
export class ImageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImageError'
  }
}

// ============================================================================
// Configuration Errors
// ============================================================================

/**
 * Error thrown when image configuration is invalid.
 */
export class ImageConfigError extends ImageError {
  readonly field: string

  constructor(message: string, field: string) {
    super(`Image configuration error in '${field}': ${message}`)
    this.name = 'ImageConfigError'
    this.field = field
  }
}

/**
 * Error thrown when a required environment variable is missing.
 */
export class ImageEnvError extends ImageError {
  readonly envVar: string

  constructor(envVar: string) {
    super(
      `Missing required environment variable '${envVar}' for Cloudflare Images`
    )
    this.name = 'ImageEnvError'
    this.envVar = envVar
  }
}

// ============================================================================
// Runtime Errors
// ============================================================================

/**
 * Error thrown when an image is not found.
 */
export class ImageNotFoundError extends ImageError {
  readonly imageId: string

  constructor(imageId: string) {
    super(`Image '${imageId}' not found`)
    this.name = 'ImageNotFoundError'
    this.imageId = imageId
  }
}

/**
 * Error thrown when an image upload fails.
 */
export class ImageUploadError extends ImageError {
  readonly statusCode?: number
  readonly details?: string

  constructor(message: string, statusCode?: number, details?: string) {
    super(message)
    this.name = 'ImageUploadError'
    this.statusCode = statusCode
    this.details = details
  }
}

/**
 * Error thrown when an image operation fails due to API errors.
 */
export class ImageApiError extends ImageError {
  readonly statusCode: number
  readonly errors: Array<{ code: number; message: string }>

  constructor(
    statusCode: number,
    errors: Array<{ code: number; message: string }>
  ) {
    const messages = errors.map((e) => e.message).join(', ')
    super(`Cloudflare Images API error (${statusCode}): ${messages}`)
    this.name = 'ImageApiError'
    this.statusCode = statusCode
    this.errors = errors
  }
}

/**
 * Error thrown when an invalid variant is requested.
 */
export class ImageVariantError extends ImageError {
  readonly variant: string
  readonly availableVariants: string[]

  constructor(variant: string, availableVariants: string[]) {
    const available =
      availableVariants.length > 0
        ? `Available variants: ${availableVariants.join(', ')}`
        : 'No variants are configured'

    super(`Invalid variant '${variant}'. ${available}`)
    this.name = 'ImageVariantError'
    this.variant = variant
    this.availableVariants = availableVariants
  }
}

/**
 * Error thrown when image binding is accessed outside request context.
 */
export class ImageContextError extends ImageError {
  constructor() {
    super(`Image accessed outside of request handler.

This can happen when:
1. Accessing images at module-load time (top-level code)
2. Accessing images in a setTimeout/setInterval callback
3. The request context was not properly initialized

Images can only be accessed during request handling within a Cloudwerk application.

Example of correct usage:
  import { images } from '@cloudwerk/core/bindings'

  export async function POST(request: Request) {
    const formData = await request.formData()
    const file = formData.get('image') as File
    const result = await images.avatars.upload(file)
    return json(result)
  }
`)
    this.name = 'ImageContextError'
  }
}

/**
 * Error thrown when an image configuration is not found.
 */
export class ImageBindingNotFoundError extends ImageError {
  readonly name: string
  readonly availableImages: string[]

  constructor(name: string, availableImages: string[]) {
    const available =
      availableImages.length > 0
        ? `Available images: ${availableImages.join(', ')}`
        : 'No images are configured'

    super(`Image '${name}' not found in current environment.

${available}

To add this image, create a file at app/images/${name}.ts with:
  import { defineImage } from '@cloudwerk/images'
  export default defineImage({
    variants: {
      thumbnail: { width: 100, height: 100, fit: 'cover' },
    },
  })
`)
    this.name = 'ImageBindingNotFoundError'
    this.availableImages = availableImages
  }
}
