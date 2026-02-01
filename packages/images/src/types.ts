/**
 * @cloudwerk/images - Type Definitions
 *
 * Core types for Cloudflare Images integration.
 */

// ============================================================================
// Variant Types
// ============================================================================

/**
 * Configuration for an image variant (transformation preset).
 *
 * @example
 * ```typescript
 * const thumbnailVariant: ImageVariant = {
 *   width: 100,
 *   height: 100,
 *   fit: 'cover',
 *   quality: 80,
 * }
 * ```
 */
export interface ImageVariant {
  /** Width in pixels */
  width?: number

  /** Height in pixels */
  height?: number

  /**
   * How the image should be resized to fit the dimensions.
   *
   * - 'cover': Fill the dimensions, cropping if necessary
   * - 'contain': Fit within dimensions, may have letterboxing
   * - 'scale-down': Only shrink, never enlarge
   * - 'crop': Crop to exact dimensions from center
   * - 'pad': Fit within dimensions, padding if necessary
   */
  fit?: 'cover' | 'contain' | 'scale-down' | 'crop' | 'pad'

  /**
   * Blur radius (1-250).
   * Higher values = more blur.
   */
  blur?: number

  /**
   * Quality for lossy formats (1-100).
   * @default 85
   */
  quality?: number

  /**
   * Output format override.
   * If not specified, format is negotiated based on Accept header.
   */
  format?: 'webp' | 'avif' | 'json' | 'jpeg' | 'png'

  /**
   * Device pixel ratio (1-3).
   * Multiplies width/height for retina displays.
   */
  dpr?: number

  /**
   * Gravity for cropping (where to focus when cropping).
   */
  gravity?: 'auto' | 'center' | 'top' | 'bottom' | 'left' | 'right' | 'face'

  /**
   * Sharpen the image (0-10).
   */
  sharpen?: number

  /**
   * Brightness adjustment (-1 to 1).
   */
  brightness?: number

  /**
   * Contrast adjustment (-1 to 1).
   */
  contrast?: number

  /**
   * Rotate the image in degrees (0-360).
   */
  rotate?: number

  /**
   * Metadata handling.
   *
   * - 'keep': Preserve all metadata
   * - 'copyright': Keep only copyright info
   * - 'none': Strip all metadata
   */
  metadata?: 'keep' | 'copyright' | 'none'
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Environment variable reference for sensitive configuration.
 *
 * @example
 * ```typescript
 * const config: ImageConfig = {
 *   accountId: { env: 'CF_ACCOUNT_ID' },
 *   apiToken: { env: 'CF_IMAGES_API_TOKEN' },
 * }
 * ```
 */
export interface EnvRef {
  /** Name of the environment variable */
  env: string
}

/**
 * Configuration for defining a Cloudflare Images integration.
 *
 * @example
 * ```typescript
 * // app/images/avatars.ts
 * export default defineImage({
 *   name: 'avatars',
 *   variants: {
 *     thumbnail: { width: 100, height: 100, fit: 'cover' },
 *     profile: { width: 400, height: 400, fit: 'cover' },
 *   },
 * })
 * ```
 */
export interface ImageConfig {
  /**
   * Unique name for this image configuration.
   * Defaults to the filename (without extension).
   */
  name?: string

  /**
   * Cloudflare account ID.
   * Can be a string value or environment variable reference.
   */
  accountId?: string | EnvRef

  /**
   * Cloudflare Images API token.
   * Can be a string value or environment variable reference.
   */
  apiToken?: string | EnvRef

  /**
   * Predefined image variants (transformation presets).
   *
   * @example
   * ```typescript
   * variants: {
   *   thumbnail: { width: 100, height: 100, fit: 'cover' },
   *   large: { width: 1200, height: 800, fit: 'contain' },
   *   blur: { blur: 20, width: 20 },
   * }
   * ```
   */
  variants?: Record<string, ImageVariant>

  /**
   * Custom domain for image delivery.
   * If not specified, uses the default Cloudflare Images URL.
   *
   * @example 'https://images.example.com'
   */
  deliveryUrl?: string

  /**
   * Default variant to use when none is specified.
   */
  defaultVariant?: string

  /**
   * Whether to require signed URLs for this image configuration.
   * @default false
   */
  requireSignedURLs?: boolean
}

// ============================================================================
// Definition Types
// ============================================================================

/**
 * An image definition created by `defineImage()`.
 *
 * This is the return type of the factory function and contains
 * the processed configuration with a brand marker for type safety.
 */
export interface ImageDefinition {
  /** Internal marker identifying this as an image definition */
  readonly __brand: 'cloudwerk-image'

  /** Image configuration name */
  readonly name: string

  /** Processed configuration with defaults applied */
  readonly config: ImageConfig

  /** Variant definitions */
  readonly variants: Record<string, ImageVariant>
}

// ============================================================================
// Upload Types
// ============================================================================

/**
 * Options for uploading an image.
 *
 * @example
 * ```typescript
 * const result = await images.avatars.upload(file, {
 *   id: 'user-123-avatar',
 *   metadata: { userId: '123', uploadedAt: new Date().toISOString() },
 * })
 * ```
 */
export interface UploadOptions {
  /**
   * Custom metadata to attach to the image.
   * Can be used for organization and filtering.
   */
  metadata?: Record<string, string>

  /**
   * Whether to require signed URLs to access this image.
   * Overrides the configuration-level setting.
   */
  requireSignedURLs?: boolean

  /**
   * Custom image ID.
   * If not specified, Cloudflare generates a UUID.
   */
  id?: string
}

/**
 * Options for generating a direct upload URL.
 *
 * Direct upload URLs allow clients to upload images directly to Cloudflare
 * without going through your server, reducing bandwidth costs.
 *
 * @example
 * ```typescript
 * const { uploadUrl, id } = await images.avatars.getDirectUploadUrl({
 *   expiry: '1h',
 *   metadata: { userId: '123' },
 * })
 *
 * // Return uploadUrl to client for direct upload
 * ```
 */
export interface DirectUploadOptions {
  /**
   * Custom metadata to attach to the uploaded image.
   */
  metadata?: Record<string, string>

  /**
   * Whether to require signed URLs to access the uploaded image.
   */
  requireSignedURLs?: boolean

  /**
   * How long the upload URL is valid.
   * Can be a duration string ('1h', '30m') or seconds.
   * @default '30m'
   */
  expiry?: string | number
}

/**
 * Options for listing images.
 */
export interface ListOptions {
  /** Page number (1-based) */
  page?: number

  /** Number of images per page (1-100) */
  perPage?: number
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * Result of an image upload operation.
 *
 * @example
 * ```typescript
 * const result = await images.avatars.upload(file)
 * console.log(result.id)        // 'abc123'
 * console.log(result.variants)  // ['thumbnail', 'profile']
 * console.log(result.uploaded)  // Date object
 * ```
 */
export interface ImageResult {
  /** Unique image ID */
  id: string

  /** Original filename (if provided during upload) */
  filename?: string

  /** When the image was uploaded */
  uploaded: Date

  /** Available variant names for this image */
  variants: string[]

  /** Custom metadata attached to the image */
  metadata?: Record<string, string>

  /** Whether the image requires signed URLs */
  requireSignedURLs?: boolean
}

/**
 * Result of generating a direct upload URL.
 */
export interface DirectUploadResult {
  /** One-time upload URL for direct client upload */
  uploadUrl: string

  /** Image ID that will be assigned to the uploaded image */
  id: string
}

// ============================================================================
// Client Types
// ============================================================================

/**
 * Image client interface for interacting with Cloudflare Images.
 *
 * @typeParam T - Variant names type for this image configuration
 */
export interface ImageClientInterface<T extends string = string> {
  /**
   * Upload an image file.
   *
   * @param file - File, Blob, or ReadableStream to upload
   * @param options - Upload options
   * @returns Upload result with image ID and metadata
   */
  upload(
    file: File | Blob | ReadableStream,
    options?: UploadOptions
  ): Promise<ImageResult>

  /**
   * Generate a direct upload URL for client-side uploads.
   *
   * @param options - Direct upload options
   * @returns Upload URL and image ID
   */
  getDirectUploadUrl(options?: DirectUploadOptions): Promise<DirectUploadResult>

  /**
   * Delete an image.
   *
   * @param imageId - ID of the image to delete
   */
  delete(imageId: string): Promise<void>

  /**
   * Get image details.
   *
   * @param imageId - ID of the image
   * @returns Image result or null if not found
   */
  get(imageId: string): Promise<ImageResult | null>

  /**
   * List images with pagination.
   *
   * @param options - Pagination options
   * @returns Array of image results
   */
  list(options?: ListOptions): Promise<ImageResult[]>

  /**
   * Generate URL for an image with optional variant.
   *
   * @param imageId - ID of the image
   * @param variant - Variant name (optional)
   * @returns Full URL to the image
   */
  url(imageId: string, variant?: T): string
}

// ============================================================================
// Manifest Types
// ============================================================================

/**
 * A scanned image file from the app/images/ directory.
 */
export interface ScannedImage {
  /** Relative path from app/images/ (e.g., 'avatars.ts') */
  relativePath: string

  /** Absolute filesystem path */
  absolutePath: string

  /** File name without extension (e.g., 'avatars') */
  name: string

  /** File extension (e.g., '.ts') */
  extension: string
}

/**
 * Result of scanning the app/images/ directory.
 */
export interface ImageScanResult {
  /** All discovered image files */
  images: ScannedImage[]
}

/**
 * A compiled image entry in the manifest.
 */
export interface ImageEntry {
  /** Image name derived from filename (e.g., 'avatars') */
  name: string

  /** Binding name for wrangler.toml (e.g., 'AVATARS_IMAGES') */
  bindingName: string

  /** Relative path to the image definition file */
  filePath: string

  /** Absolute path to the image definition file */
  absolutePath: string

  /** Variant definitions from the image config */
  variants: Record<string, ImageVariant>

  /** Full image configuration */
  config: ImageConfig
}

/**
 * Validation error for an image definition.
 */
export interface ImageValidationError {
  /** Image file path */
  file: string

  /** Error message */
  message: string

  /** Error code for programmatic handling */
  code: 'INVALID_CONFIG' | 'DUPLICATE_NAME' | 'INVALID_NAME' | 'MISSING_REQUIRED'
}

/**
 * Validation warning for an image definition.
 */
export interface ImageValidationWarning {
  /** Image file path */
  file: string

  /** Warning message */
  message: string

  /** Warning code */
  code: 'NO_VARIANTS' | 'MISSING_ACCOUNT_ID' | 'MISSING_API_TOKEN'
}

/**
 * Complete image manifest generated during build.
 */
export interface ImageManifest {
  /** All compiled image entries */
  images: ImageEntry[]

  /** Validation errors (image won't be registered) */
  errors: ImageValidationError[]

  /** Validation warnings (image will be registered with warning) */
  warnings: ImageValidationWarning[]

  /** When the manifest was generated */
  generatedAt: Date

  /** Root directory of the app */
  rootDir: string
}
