/**
 * @cloudwerk/core - Image Compiler
 *
 * Compiles scanned image files into an ImageManifest.
 */

import type { ScannedImage, ImageScanResult } from './image-scanner.js'
import {
  fileNameToImageName,
  imageNameToBindingName,
} from './image-scanner.js'

// ============================================================================
// Types
// ============================================================================

/**
 * Image variant configuration.
 */
export interface ImageVariant {
  width?: number
  height?: number
  fit?: 'cover' | 'contain' | 'scale-down' | 'crop' | 'pad'
  blur?: number
  quality?: number
  format?: 'webp' | 'avif' | 'json' | 'jpeg' | 'png'
  dpr?: number
  gravity?: 'auto' | 'center' | 'top' | 'bottom' | 'left' | 'right' | 'face'
  sharpen?: number
  brightness?: number
  contrast?: number
  rotate?: number
  metadata?: 'keep' | 'copyright' | 'none'
}

/**
 * Environment variable reference.
 */
export interface EnvRef {
  env: string
}

/**
 * Image configuration.
 */
export interface ImageConfig {
  name?: string
  accountId?: string | EnvRef
  apiToken?: string | EnvRef
  variants?: Record<string, ImageVariant>
  deliveryUrl?: string
  defaultVariant?: string
  requireSignedURLs?: boolean
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

/**
 * Options for building the image manifest.
 */
export interface BuildImageManifestOptions {
  /** Skip loading image modules (for static analysis only) */
  skipModuleLoad?: boolean
}

// ============================================================================
// Compilation
// ============================================================================

/**
 * Compile a scanned image file into an ImageEntry.
 *
 * This creates a basic entry from file information. The actual config
 * values are loaded separately via loadImageDefinition.
 *
 * @param scannedImage - Scanned image file
 * @returns Compiled image entry
 */
export function compileImage(scannedImage: ScannedImage): ImageEntry {
  const name = fileNameToImageName(scannedImage.name)
  const bindingName = imageNameToBindingName(name)

  return {
    name,
    bindingName,
    filePath: scannedImage.relativePath,
    absolutePath: scannedImage.absolutePath,
    variants: {},
    config: {},
  }
}

/**
 * Validate an image name.
 *
 * @param name - Image name to validate
 * @returns Error message if invalid, null if valid
 */
function validateImageName(name: string): string | null {
  if (name.length === 0) {
    return 'Image name cannot be empty'
  }

  // Names should start with lowercase letter
  if (!/^[a-z]/.test(name)) {
    return 'Image name must start with a lowercase letter'
  }

  // Names should be camelCase (no hyphens, underscores)
  if (/[-_]/.test(name)) {
    return 'Image name should be camelCase (file can be kebab-case)'
  }

  return null
}

/**
 * Build the complete image manifest from scan results.
 *
 * @param scanResult - Result from scanImages()
 * @param rootDir - Root directory of the app
 * @param options - Build options
 * @returns Complete image manifest
 */
export function buildImageManifest(
  scanResult: ImageScanResult,
  rootDir: string,
  _options: BuildImageManifestOptions = {}
): ImageManifest {
  const images: ImageEntry[] = []
  const errors: ImageValidationError[] = []
  const warnings: ImageValidationWarning[] = []
  const seenNames = new Set<string>()

  for (const scannedImage of scanResult.images) {
    const entry = compileImage(scannedImage)

    // Validate name
    const nameError = validateImageName(entry.name)
    if (nameError) {
      errors.push({
        file: scannedImage.relativePath,
        message: nameError,
        code: 'INVALID_NAME',
      })
      continue
    }

    // Check for duplicate names
    if (seenNames.has(entry.name)) {
      errors.push({
        file: scannedImage.relativePath,
        message: `Duplicate image name '${entry.name}'`,
        code: 'DUPLICATE_NAME',
      })
      continue
    }
    seenNames.add(entry.name)

    // Add warning for no variants
    if (Object.keys(entry.variants).length === 0) {
      warnings.push({
        file: scannedImage.relativePath,
        message: `Image '${entry.name}' has no variants configured`,
        code: 'NO_VARIANTS',
      })
    }

    images.push(entry)
  }

  return {
    images,
    errors,
    warnings,
    generatedAt: new Date(),
    rootDir,
  }
}

/**
 * Update an image entry with loaded module information.
 *
 * Call this after dynamically importing the image module to fill in
 * config, variants, etc.
 *
 * @param entry - Image entry to update
 * @param definition - Loaded image definition from the module
 * @returns Updated image entry
 */
export function updateImageEntryFromDefinition(
  entry: ImageEntry,
  definition: {
    name?: string
    config?: ImageConfig
    variants?: Record<string, ImageVariant>
  }
): ImageEntry {
  return {
    ...entry,
    // Use explicit name if provided
    name: definition.name || entry.name,
    // Set config
    config: definition.config || {},
    // Set variants
    variants: definition.variants || {},
  }
}

/**
 * Add warnings based on loaded image definition.
 *
 * @param entry - Image entry
 * @param definition - Loaded definition
 * @param warnings - Warnings array to append to
 */
export function addImageWarnings(
  entry: ImageEntry,
  definition: {
    config?: ImageConfig
    variants?: Record<string, ImageVariant>
  },
  warnings: ImageValidationWarning[]
): void {
  // Warn if no account ID configured
  if (!definition.config?.accountId) {
    warnings.push({
      file: entry.filePath,
      message: `Image '${entry.name}' has no accountId configured. Set it in config or via environment variable.`,
      code: 'MISSING_ACCOUNT_ID',
    })
  }

  // Warn if no API token configured
  if (!definition.config?.apiToken) {
    warnings.push({
      file: entry.filePath,
      message: `Image '${entry.name}' has no apiToken configured. Set it in config or via environment variable.`,
      code: 'MISSING_API_TOKEN',
    })
  }

  // Warn if no variants configured
  if (!definition.variants || Object.keys(definition.variants).length === 0) {
    warnings.push({
      file: entry.filePath,
      message: `Image '${entry.name}' has no variants configured`,
      code: 'NO_VARIANTS',
    })
  }
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format image validation errors for display.
 *
 * @param errors - Validation errors
 * @returns Formatted error string
 */
export function formatImageErrors(errors: ImageValidationError[]): string {
  if (errors.length === 0) {
    return ''
  }

  const lines = ['Image validation errors:']
  for (const error of errors) {
    lines.push(`  - ${error.file}: ${error.message}`)
  }
  return lines.join('\n')
}

/**
 * Format image validation warnings for display.
 *
 * @param warnings - Validation warnings
 * @returns Formatted warning string
 */
export function formatImageWarnings(warnings: ImageValidationWarning[]): string {
  if (warnings.length === 0) {
    return ''
  }

  const lines = ['Image validation warnings:']
  for (const warning of warnings) {
    lines.push(`  - ${warning.file}: ${warning.message}`)
  }
  return lines.join('\n')
}

/**
 * Check if the manifest has errors.
 *
 * @param manifest - Image manifest
 * @returns true if there are errors
 */
export function hasImageErrors(manifest: ImageManifest): boolean {
  return manifest.errors.length > 0
}

/**
 * Check if the manifest has warnings.
 *
 * @param manifest - Image manifest
 * @returns true if there are warnings
 */
export function hasImageWarnings(manifest: ImageManifest): boolean {
  return manifest.warnings.length > 0
}
