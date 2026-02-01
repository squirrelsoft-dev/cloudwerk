/**
 * @cloudwerk/images - Cloudflare API Types
 *
 * Type definitions for Cloudflare Images API responses.
 * Based on Cloudflare API documentation.
 */

// ============================================================================
// API Response Wrapper
// ============================================================================

/**
 * Standard Cloudflare API response wrapper.
 */
export interface CloudflareApiResponse<T> {
  result: T
  success: boolean
  errors: CloudflareApiError[]
  messages: CloudflareApiMessage[]
}

/**
 * Cloudflare API error.
 */
export interface CloudflareApiError {
  code: number
  message: string
}

/**
 * Cloudflare API message.
 */
export interface CloudflareApiMessage {
  code: number
  message: string
}

// ============================================================================
// Image Types
// ============================================================================

/**
 * Cloudflare Image object from API.
 */
export interface CloudflareImage {
  /** Unique image identifier */
  id: string

  /** Original filename */
  filename: string

  /** Upload timestamp (ISO 8601) */
  uploaded: string

  /** Whether signed URLs are required */
  requireSignedURLs: boolean

  /** Available variant URLs */
  variants: string[]

  /** Custom metadata */
  meta?: Record<string, string>
}

/**
 * Response from uploading an image.
 */
export interface CloudflareUploadResponse {
  id: string
  filename: string
  uploaded: string
  requireSignedURLs: boolean
  variants: string[]
  meta?: Record<string, string>
}

/**
 * Response from creating a direct upload URL.
 */
export interface CloudflareDirectUploadResponse {
  id: string
  uploadURL: string
}

/**
 * Response from listing images.
 */
export interface CloudflareListResponse {
  images: CloudflareImage[]
  continuation_token?: string
}

/**
 * Response from getting image details.
 */
export interface CloudflareImageDetailsResponse {
  id: string
  filename: string
  uploaded: string
  requireSignedURLs: boolean
  variants: string[]
  meta?: Record<string, string>
}

// ============================================================================
// Request Types
// ============================================================================

/**
 * Request body for creating a direct upload URL.
 */
export interface DirectUploadRequest {
  /** Whether to require signed URLs */
  requireSignedURLs?: boolean

  /** Custom metadata */
  metadata?: Record<string, string>

  /** Expiry timestamp (ISO 8601 or Unix timestamp) */
  expiry?: string
}

// ============================================================================
// Variant Types
// ============================================================================

/**
 * Cloudflare Images variant configuration (API format).
 */
export interface CloudflareVariant {
  id: string
  options: {
    fit?: 'cover' | 'contain' | 'scale-down' | 'crop' | 'pad'
    width?: number
    height?: number
    metadata?: 'keep' | 'copyright' | 'none'
  }
  neverRequireSignedURLs?: boolean
}

// ============================================================================
// Stats Types
// ============================================================================

/**
 * Cloudflare Images usage statistics.
 */
export interface CloudflareImagesStats {
  count: {
    current: number
    allowed: number
  }
}

// ============================================================================
// API Endpoints
// ============================================================================

/**
 * Cloudflare Images API endpoints.
 */
export const CLOUDFLARE_IMAGES_API = {
  /** Base URL for Cloudflare API v4 */
  BASE: 'https://api.cloudflare.com/client/v4',

  /**
   * Get the images endpoint for an account.
   */
  images: (accountId: string) =>
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`,

  /**
   * Get the direct upload endpoint.
   */
  directUpload: (accountId: string) =>
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v2/direct_upload`,

  /**
   * Get a specific image endpoint.
   */
  image: (accountId: string, imageId: string) =>
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/${imageId}`,

  /**
   * Get the default delivery URL format.
   */
  deliveryUrl: (accountId: string, imageId: string, variant: string) =>
    `https://imagedelivery.net/${accountId}/${imageId}/${variant}`,
} as const
