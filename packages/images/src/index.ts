/**
 * @cloudwerk/images
 *
 * Cloudflare Images integration for Cloudwerk.
 *
 * @example
 * ```typescript
 * // Define an image configuration (app/images/avatars.ts)
 * import { defineImage } from '@cloudwerk/images'
 *
 * export default defineImage({
 *   variants: {
 *     thumbnail: { width: 100, height: 100, fit: 'cover' },
 *     profile: { width: 400, height: 400, fit: 'cover' },
 *   },
 * })
 * ```
 *
 * @example
 * ```typescript
 * // Use images from route handlers
 * import { images } from '@cloudwerk/core/bindings'
 * import { json } from '@cloudwerk/core'
 *
 * export async function POST(request: Request) {
 *   const formData = await request.formData()
 *   const file = formData.get('image') as File
 *
 *   const result = await images.avatars.upload(file)
 *
 *   return json({
 *     id: result.id,
 *     thumbnail: images.avatars.url(result.id, 'thumbnail'),
 *     profile: images.avatars.url(result.id, 'profile'),
 *   })
 * }
 * ```
 */

// ============================================================================
// Type Exports
// ============================================================================

export type {
  // Variant Types
  ImageVariant,

  // Configuration Types
  EnvRef,
  ImageConfig,

  // Definition Types
  ImageDefinition,

  // Upload Types
  UploadOptions,
  DirectUploadOptions,
  ListOptions,

  // Result Types
  ImageResult,
  DirectUploadResult,

  // Client Types
  ImageClientInterface,

  // Manifest Types
  ScannedImage,
  ImageScanResult,
  ImageEntry,
  ImageValidationError,
  ImageValidationWarning,
  ImageManifest,
} from './types.js'

// ============================================================================
// Error Classes
// ============================================================================

export {
  ImageError,
  ImageConfigError,
  ImageEnvError,
  ImageNotFoundError,
  ImageUploadError,
  ImageApiError,
  ImageVariantError,
  ImageContextError,
  ImageBindingNotFoundError,
} from './errors.js'

// ============================================================================
// Image Definition
// ============================================================================

export { defineImage, isImageDefinition } from './define-image.js'

// ============================================================================
// Image Client
// ============================================================================

export { ImageClient, createImageClient } from './client.js'

// ============================================================================
// Cloudflare Types (for advanced usage)
// ============================================================================

export type {
  CloudflareApiResponse,
  CloudflareApiError,
  CloudflareApiMessage,
  CloudflareImage,
  CloudflareUploadResponse,
  CloudflareDirectUploadResponse,
  CloudflareListResponse,
  CloudflareImageDetailsResponse,
  DirectUploadRequest,
  CloudflareVariant,
  CloudflareImagesStats,
} from './cloudflare-types.js'

export { CLOUDFLARE_IMAGES_API } from './cloudflare-types.js'

// ============================================================================
// Image Transformer (for Image Resizing service)
// ============================================================================

export {
  createImageTransformer,
  variantToPreset,
  ImageTransformError,
} from './transformer.js'

export type {
  TransformerConfig,
  TransformPreset,
} from './transformer.js'

// ============================================================================
// IMAGES Binding Types (for transform pipelines)
// ============================================================================

export type {
  CloudflareImagesBinding,
  CloudflareImagesTransformBuilder,
  CloudflareImagesTransformResult,
  CloudflareImageInfo,
  CloudflareImageTransformOptions,
  CloudflareImageOutputOptions,
  ImageFitMode,
  ImageGravity,
  ImageOutputFormat,
  ImageMetadataHandling,
  ImageTransformPreset,
  ImagePresetName,
} from './binding-types.js'

export { IMAGE_PRESETS } from './binding-types.js'
