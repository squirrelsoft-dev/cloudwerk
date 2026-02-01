/**
 * @cloudwerk/images - Cloudflare IMAGES Binding Types
 *
 * Type definitions for the Cloudflare IMAGES binding used in Workers.
 * This binding provides on-the-fly image transformation without uploading
 * to Cloudflare Images.
 *
 * @example
 * ```typescript
 * // wrangler.toml
 * [images]
 * binding = "MY_IMAGES"
 * ```
 *
 * @example
 * ```typescript
 * import { getBinding } from '@cloudwerk/core/bindings'
 * import type { CloudflareImagesBinding } from '@cloudwerk/images'
 *
 * const IMAGES = getBinding<CloudflareImagesBinding>('MY_IMAGES')
 *
 * // Transform an image
 * const result = await IMAGES
 *   .input(imageStream)
 *   .transform({ width: 800 })
 *   .output({ format: 'image/webp' })
 *   .response()
 * ```
 */

// ============================================================================
// Cloudflare IMAGES Binding Types
// ============================================================================

/**
 * Image information returned by the IMAGES binding.
 */
export interface CloudflareImageInfo {
  /** Width of the image in pixels */
  width: number
  /** Height of the image in pixels */
  height: number
  /** Format of the image (e.g., 'image/jpeg', 'image/png') */
  format: string
  /** File size in bytes */
  fileSize: number
}

/**
 * Transform options for the IMAGES binding.
 */
export interface CloudflareImageTransformOptions {
  /** Width in pixels */
  width?: number
  /** Height in pixels */
  height?: number
  /** Fit mode for resizing */
  fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad'
  /** Gravity for cropping */
  gravity?: 'auto' | 'left' | 'right' | 'top' | 'bottom' | 'center' | 'face'
  /** Quality for lossy formats (1-100) */
  quality?: number
  /** Device pixel ratio (1-3) */
  dpr?: number
  /** Rotation in degrees (0, 90, 180, 270) */
  rotate?: 0 | 90 | 180 | 270
  /** Sharpen amount (0-10) */
  sharpen?: number
  /** Blur radius (1-250) */
  blur?: number
  /** Brightness adjustment (-1 to 1) */
  brightness?: number
  /** Contrast adjustment (-1 to 1) */
  contrast?: number
  /** Background color for padding (hex or rgb) */
  background?: string
  /** Border configuration */
  border?: {
    color: string
    width: number
  }
  /** Trim whitespace from edges */
  trim?: {
    top?: number
    right?: number
    bottom?: number
    left?: number
  }
}

/**
 * Output options for the IMAGES binding.
 */
export interface CloudflareImageOutputOptions {
  /** Output format */
  format?: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif' | 'image/gif'
  /** Quality for lossy formats (1-100) */
  quality?: number
  /** Metadata handling */
  metadata?: 'keep' | 'copyright' | 'none'
}

/**
 * Result object returned after awaiting the transform pipeline.
 * Use `.response()` to get the transformed image.
 */
export interface CloudflareImagesTransformResult {
  /**
   * Get the transformed image as a Response.
   * @returns Response containing the transformed image
   */
  response(): Response
}

/**
 * Transform builder interface for the IMAGES binding.
 * Provides a fluent API for chaining transformations.
 *
 * @example
 * ```typescript
 * // The entire chain must be awaited, then call .response()
 * const result = await IMAGES
 *   .input(stream)
 *   .transform({ rotate: 90 })
 *   .output({ format: 'image/webp' })
 *
 * return result.response()
 * ```
 */
export interface CloudflareImagesTransformBuilder {
  /**
   * Apply transformation options to the image.
   * Can be chained multiple times.
   * @param options - Transformation options
   * @returns The builder for chaining
   */
  transform(options: CloudflareImageTransformOptions): CloudflareImagesTransformBuilder

  /**
   * Set output format and options.
   * @param options - Output options
   * @returns Promise that resolves to a result object with .response() method
   */
  output(options: CloudflareImageOutputOptions): Promise<CloudflareImagesTransformResult>

  /**
   * Draw another image over this one (watermarking/compositing).
   * @param image - Another transform builder or ReadableStream
   * @param position - Position options (top, left, bottom, right, opacity, repeat)
   * @returns The builder for chaining
   */
  draw(
    image: CloudflareImagesTransformBuilder | ReadableStream<Uint8Array>,
    position?: {
      top?: number
      left?: number
      bottom?: number
      right?: number
      opacity?: number
      repeat?: boolean | 'x' | 'y'
    }
  ): CloudflareImagesTransformBuilder
}

/**
 * Cloudflare IMAGES binding interface.
 *
 * This binding provides access to Cloudflare's image transformation pipeline
 * for on-the-fly image processing without uploading to Cloudflare Images.
 *
 * @example
 * ```typescript
 * import { getBinding } from '@cloudwerk/core/bindings'
 * import type { CloudflareImagesBinding } from '@cloudwerk/images'
 *
 * export async function GET(request: Request) {
 *   const IMAGES = getBinding<CloudflareImagesBinding>('MY_IMAGES')
 *
 *   // Transform an image from a stream
 *   // Note: await the chain, then call .response()
 *   const result = await IMAGES
 *     .input(imageStream)
 *     .transform({ width: 800, rotate: 90 })
 *     .output({ format: 'image/webp' })
 *
 *   return result.response()
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Get image information
 * const info = await IMAGES.info(imageStream)
 * console.log(`Image size: ${info.width}x${info.height}`)
 * ```
 */
export interface CloudflareImagesBinding {
  /**
   * Start a transformation pipeline with an input image.
   * @param source - Image source as Blob, ArrayBuffer, or ReadableStream
   * @returns Transform builder for chaining operations
   */
  input(source: Blob | ArrayBuffer | ReadableStream<Uint8Array>): CloudflareImagesTransformBuilder

  /**
   * Get information about an image without transforming it.
   * @param source - Image source as Blob, ArrayBuffer, or ReadableStream
   * @returns Image information including dimensions and format
   */
  info(source: Blob | ArrayBuffer | ReadableStream<Uint8Array>): Promise<CloudflareImageInfo>
}

// ============================================================================
// Additional Transform Types
// ============================================================================

/**
 * Fit modes for image resizing.
 *
 * - `scale-down`: Shrink to fit within dimensions, never enlarge
 * - `contain`: Fit within dimensions, may add letterboxing
 * - `cover`: Fill dimensions, cropping if necessary
 * - `crop`: Crop to exact dimensions from center
 * - `pad`: Fit within dimensions, padding if necessary
 */
export type ImageFitMode = 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad'

/**
 * Gravity options for cropping.
 *
 * - `auto`: Automatic based on image content
 * - `left`, `right`, `top`, `bottom`: Align to edge
 * - `center`: Center crop
 * - `face`: Focus on detected faces
 */
export type ImageGravity = 'auto' | 'left' | 'right' | 'top' | 'bottom' | 'center' | 'face'

/**
 * Supported output formats.
 */
export type ImageOutputFormat = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif' | 'image/gif'

/**
 * Metadata handling options.
 *
 * - `keep`: Preserve all metadata
 * - `copyright`: Keep only copyright information
 * - `none`: Strip all metadata
 */
export type ImageMetadataHandling = 'keep' | 'copyright' | 'none'

// ============================================================================
// Helper Types for Common Use Cases
// ============================================================================

/**
 * Preset transform configurations for common use cases.
 */
export interface ImageTransformPreset {
  /** Width in pixels */
  width?: number
  /** Height in pixels */
  height?: number
  /** Fit mode */
  fit?: ImageFitMode
  /** Quality (1-100) */
  quality?: number
  /** Output format */
  format?: ImageOutputFormat
}

/**
 * Common presets for image transformations.
 */
export const IMAGE_PRESETS = {
  /** Small thumbnail (100x100 cover) */
  thumbnail: {
    width: 100,
    height: 100,
    fit: 'cover' as const,
    quality: 80,
  },
  /** Medium preview (400x400 contain) */
  preview: {
    width: 400,
    height: 400,
    fit: 'contain' as const,
    quality: 85,
  },
  /** Large display (1200px wide) */
  large: {
    width: 1200,
    fit: 'scale-down' as const,
    quality: 90,
  },
  /** Hero banner (1920x1080 cover) */
  hero: {
    width: 1920,
    height: 1080,
    fit: 'cover' as const,
    quality: 85,
  },
  /** Social share (1200x630 for Open Graph) */
  social: {
    width: 1200,
    height: 630,
    fit: 'cover' as const,
    quality: 85,
  },
  /** Mobile optimized (640px wide, WebP) */
  mobile: {
    width: 640,
    fit: 'scale-down' as const,
    quality: 75,
    format: 'image/webp' as const,
  },
} as const

/**
 * Type for preset names.
 */
export type ImagePresetName = keyof typeof IMAGE_PRESETS
