/**
 * @cloudwerk/images - defineImage()
 *
 * Factory function for creating image definitions.
 */

import type { ImageConfig, ImageDefinition, ImageVariant } from './types.js'
import { ImageConfigError } from './errors.js'

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate a variant configuration.
 *
 * @param variant - Variant to validate
 * @param name - Variant name for error messages
 * @throws ImageConfigError if configuration is invalid
 */
function validateVariant(variant: ImageVariant, name: string): void {
  if (variant.width !== undefined) {
    if (!Number.isInteger(variant.width) || variant.width < 1) {
      throw new ImageConfigError(
        `width must be a positive integer`,
        `variants.${name}.width`
      )
    }
  }

  if (variant.height !== undefined) {
    if (!Number.isInteger(variant.height) || variant.height < 1) {
      throw new ImageConfigError(
        `height must be a positive integer`,
        `variants.${name}.height`
      )
    }
  }

  if (variant.blur !== undefined) {
    if (variant.blur < 1 || variant.blur > 250) {
      throw new ImageConfigError(
        `blur must be between 1 and 250`,
        `variants.${name}.blur`
      )
    }
  }

  if (variant.quality !== undefined) {
    if (variant.quality < 1 || variant.quality > 100) {
      throw new ImageConfigError(
        `quality must be between 1 and 100`,
        `variants.${name}.quality`
      )
    }
  }

  if (variant.dpr !== undefined) {
    if (variant.dpr < 1 || variant.dpr > 3) {
      throw new ImageConfigError(
        `dpr must be between 1 and 3`,
        `variants.${name}.dpr`
      )
    }
  }

  if (variant.sharpen !== undefined) {
    if (variant.sharpen < 0 || variant.sharpen > 10) {
      throw new ImageConfigError(
        `sharpen must be between 0 and 10`,
        `variants.${name}.sharpen`
      )
    }
  }

  if (variant.brightness !== undefined) {
    if (variant.brightness < -1 || variant.brightness > 1) {
      throw new ImageConfigError(
        `brightness must be between -1 and 1`,
        `variants.${name}.brightness`
      )
    }
  }

  if (variant.contrast !== undefined) {
    if (variant.contrast < -1 || variant.contrast > 1) {
      throw new ImageConfigError(
        `contrast must be between -1 and 1`,
        `variants.${name}.contrast`
      )
    }
  }

  if (variant.rotate !== undefined) {
    if (variant.rotate < 0 || variant.rotate > 360) {
      throw new ImageConfigError(
        `rotate must be between 0 and 360`,
        `variants.${name}.rotate`
      )
    }
  }

  const validFits = ['cover', 'contain', 'scale-down', 'crop', 'pad']
  if (variant.fit !== undefined && !validFits.includes(variant.fit)) {
    throw new ImageConfigError(
      `fit must be one of: ${validFits.join(', ')}`,
      `variants.${name}.fit`
    )
  }

  const validFormats = ['webp', 'avif', 'json', 'jpeg', 'png']
  if (variant.format !== undefined && !validFormats.includes(variant.format)) {
    throw new ImageConfigError(
      `format must be one of: ${validFormats.join(', ')}`,
      `variants.${name}.format`
    )
  }

  const validGravities = ['auto', 'center', 'top', 'bottom', 'left', 'right', 'face']
  if (variant.gravity !== undefined && !validGravities.includes(variant.gravity)) {
    throw new ImageConfigError(
      `gravity must be one of: ${validGravities.join(', ')}`,
      `variants.${name}.gravity`
    )
  }

  const validMetadatas = ['keep', 'copyright', 'none']
  if (variant.metadata !== undefined && !validMetadatas.includes(variant.metadata)) {
    throw new ImageConfigError(
      `metadata must be one of: ${validMetadatas.join(', ')}`,
      `variants.${name}.metadata`
    )
  }
}

/**
 * Validate image configuration.
 *
 * @param config - Image configuration to validate
 * @throws ImageConfigError if configuration is invalid
 */
function validateConfig(config: ImageConfig): void {
  // Validate name if provided
  if (config.name !== undefined) {
    if (typeof config.name !== 'string' || config.name.length === 0) {
      throw new ImageConfigError('name must be a non-empty string', 'name')
    }

    // Names should be lowercase alphanumeric with hyphens
    if (!/^[a-z][a-z0-9-]*$/.test(config.name)) {
      throw new ImageConfigError(
        'name must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens',
        'name'
      )
    }
  }

  // Validate deliveryUrl if provided
  if (config.deliveryUrl !== undefined) {
    if (typeof config.deliveryUrl !== 'string') {
      throw new ImageConfigError(
        'deliveryUrl must be a string',
        'deliveryUrl'
      )
    }

    try {
      new URL(config.deliveryUrl)
    } catch {
      throw new ImageConfigError(
        'deliveryUrl must be a valid URL',
        'deliveryUrl'
      )
    }
  }

  // Validate variants
  if (config.variants !== undefined) {
    if (typeof config.variants !== 'object' || config.variants === null) {
      throw new ImageConfigError('variants must be an object', 'variants')
    }

    for (const [name, variant] of Object.entries(config.variants)) {
      // Variant names should be alphanumeric with hyphens
      if (!/^[a-z][a-z0-9-]*$/.test(name)) {
        throw new ImageConfigError(
          `variant name '${name}' must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens`,
          'variants'
        )
      }

      validateVariant(variant, name)
    }
  }

  // Validate defaultVariant references an existing variant
  if (config.defaultVariant !== undefined && config.variants !== undefined) {
    if (!(config.defaultVariant in config.variants)) {
      throw new ImageConfigError(
        `defaultVariant '${config.defaultVariant}' is not defined in variants`,
        'defaultVariant'
      )
    }
  }
}

// ============================================================================
// defineImage()
// ============================================================================

/**
 * Define a Cloudflare Images configuration.
 *
 * This function creates an image definition that will be automatically
 * discovered and registered by Cloudwerk during build.
 *
 * @param config - Image configuration
 * @returns Image definition
 *
 * @example
 * ```typescript
 * // app/images/avatars.ts
 * import { defineImage } from '@cloudwerk/images'
 *
 * export default defineImage({
 *   variants: {
 *     thumbnail: { width: 100, height: 100, fit: 'cover' },
 *     profile: { width: 400, height: 400, fit: 'cover' },
 *     large: { width: 1200, height: 1200, fit: 'contain' },
 *   },
 * })
 * ```
 *
 * @example
 * ```typescript
 * // app/images/products.ts - with custom delivery domain
 * import { defineImage } from '@cloudwerk/images'
 *
 * export default defineImage({
 *   deliveryUrl: 'https://images.mystore.com',
 *   variants: {
 *     card: { width: 300, height: 300, fit: 'cover' },
 *     detail: { width: 800, height: 600, fit: 'contain' },
 *     zoom: { width: 1600, height: 1200, fit: 'contain' },
 *   },
 *   defaultVariant: 'card',
 * })
 * ```
 *
 * @example
 * ```typescript
 * // app/images/secure.ts - with signed URLs required
 * import { defineImage } from '@cloudwerk/images'
 *
 * export default defineImage({
 *   requireSignedURLs: true,
 *   variants: {
 *     preview: { width: 200, height: 200, fit: 'cover', blur: 20 },
 *     full: { width: 1920, height: 1080, fit: 'contain' },
 *   },
 * })
 * ```
 */
export function defineImage(config: ImageConfig = {}): ImageDefinition {
  // Validate configuration
  validateConfig(config)

  // Create the definition object
  const definition: ImageDefinition = {
    __brand: 'cloudwerk-image',
    name: config.name ?? '',  // Will be set from filename if empty
    config,
    variants: config.variants ?? {},
  }

  return definition
}

/**
 * Check if a value is an image definition created by defineImage().
 *
 * @param value - Value to check
 * @returns true if value is an ImageDefinition
 */
export function isImageDefinition(value: unknown): value is ImageDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__brand' in value &&
    (value as ImageDefinition).__brand === 'cloudwerk-image'
  )
}
