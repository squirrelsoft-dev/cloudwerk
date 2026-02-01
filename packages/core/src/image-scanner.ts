/**
 * @cloudwerk/core - Image Scanner
 *
 * Scans the app/images/ directory for image definition files.
 */

import * as path from 'node:path'
import fg from 'fast-glob'
import type { SupportedExtension, CloudwerkConfig } from './types.js'
import { SUPPORTED_EXTENSIONS } from './types.js'

// ============================================================================
// Types
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
  extension: SupportedExtension
}

/**
 * Result of scanning the app/images/ directory.
 */
export interface ImageScanResult {
  /** All discovered image files */
  images: ScannedImage[]
}

// ============================================================================
// Constants
// ============================================================================

/** Default directory name for images */
export const IMAGES_DIR = 'images'

// ============================================================================
// File Detection
// ============================================================================

/**
 * Check if a file is a valid image definition file.
 *
 * @param filename - File name to check
 * @returns True if this is a valid image file
 */
export function isImageFile(filename: string): boolean {
  const parsed = path.parse(filename)
  const ext = parsed.ext as SupportedExtension

  // Must have a supported extension
  if (!SUPPORTED_EXTENSIONS.includes(ext as typeof SUPPORTED_EXTENSIONS[number])) {
    return false
  }

  // Image files should not be test files
  if (parsed.name.endsWith('.test') || parsed.name.endsWith('.spec')) {
    return false
  }

  // Image files should not be type definition files
  if (parsed.base.endsWith('.d.ts')) {
    return false
  }

  return true
}

/**
 * Convert a filename to an image name.
 *
 * Converts kebab-case to camelCase.
 *
 * @param filename - File name without extension
 * @returns Image name in camelCase
 *
 * @example
 * fileNameToImageName('avatars')           // 'avatars'
 * fileNameToImageName('product-images')    // 'productImages'
 * fileNameToImageName('user-profile-pics') // 'userProfilePics'
 */
export function fileNameToImageName(filename: string): string {
  return filename.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Convert an image name to a binding name.
 *
 * Converts camelCase to SCREAMING_SNAKE_CASE with _IMAGES suffix.
 *
 * @param imageName - Image name in camelCase
 * @returns Binding name in SCREAMING_SNAKE_CASE
 *
 * @example
 * imageNameToBindingName('avatars')        // 'AVATARS_IMAGES'
 * imageNameToBindingName('productImages')  // 'PRODUCT_IMAGES_IMAGES'
 */
export function imageNameToBindingName(imageName: string): string {
  const screaming = imageName
    .replace(/([A-Z])/g, '_$1')
    .toUpperCase()
    .replace(/^_/, '')

  return `${screaming}_IMAGES`
}

/**
 * Convert a binding name to an image name.
 *
 * Converts SCREAMING_SNAKE_CASE_IMAGES to camelCase.
 *
 * @param bindingName - Binding name in SCREAMING_SNAKE_CASE
 * @returns Image name in camelCase
 *
 * @example
 * bindingNameToImageName('AVATARS_IMAGES')        // 'avatars'
 * bindingNameToImageName('PRODUCT_IMAGES_IMAGES') // 'productImages'
 */
export function bindingNameToImageName(bindingName: string): string {
  // Remove _IMAGES suffix and convert to camelCase
  const withoutSuffix = bindingName.replace(/_IMAGES$/, '')
  return withoutSuffix.toLowerCase().replace(/_([a-z])/g, (_, letter) =>
    letter.toUpperCase()
  )
}

// ============================================================================
// Image Scanning
// ============================================================================

/**
 * Create a ScannedImage object from a file path.
 *
 * @param filePath - Absolute path to the file
 * @param imagesDir - Root images directory for relative path calculation
 * @returns ScannedImage object
 */
function createScannedImage(filePath: string, imagesDir: string): ScannedImage {
  const absolutePath = path.resolve(filePath)
  const relativePath = path
    .relative(imagesDir, absolutePath)
    .split(path.sep)
    .join(path.posix.sep)
  const parsed = path.parse(filePath)

  return {
    relativePath,
    absolutePath,
    name: parsed.name,
    extension: parsed.ext as SupportedExtension,
  }
}

/**
 * Scan the images directory for all image definition files.
 *
 * @param rootDir - App root directory (should contain images/ subdirectory)
 * @param config - Configuration options
 * @returns ImageScanResult with discovered image files
 *
 * @example
 * const result = await scanImages('./app', {
 *   extensions: ['.ts', '.tsx'],
 * })
 */
export async function scanImages(
  rootDir: string,
  config: Pick<CloudwerkConfig, 'extensions'>
): Promise<ImageScanResult> {
  const imagesDir = path.resolve(rootDir, IMAGES_DIR)
  const extensions = config.extensions.map((ext) => ext.slice(1)).join(',')

  // Build glob pattern for image files (direct children only, no subdirectories)
  const pattern = `*.{${extensions}}`

  // Find all matching files
  const files = await fg(pattern, {
    cwd: imagesDir,
    absolute: true,
    onlyFiles: true,
    ignore: [
      '**/*.test.*',
      '**/*.spec.*',
      '**/*.d.ts',
      '**/index.ts',
      '**/index.tsx',
    ],
  })

  // Create scanned image objects
  const images: ScannedImage[] = []

  for (const filePath of files) {
    const parsed = path.parse(filePath)
    if (isImageFile(parsed.base)) {
      images.push(createScannedImage(filePath, imagesDir))
    }
  }

  return { images }
}

/**
 * Scan images synchronously (for testing or simple use cases).
 *
 * @param rootDir - App root directory (should contain images/ subdirectory)
 * @param config - Configuration options
 * @returns ImageScanResult with discovered image files
 */
export function scanImagesSync(
  rootDir: string,
  config: Pick<CloudwerkConfig, 'extensions'>
): ImageScanResult {
  const imagesDir = path.resolve(rootDir, IMAGES_DIR)
  const extensions = config.extensions.map((ext) => ext.slice(1)).join(',')

  // Build glob pattern for image files (direct children only, no subdirectories)
  const pattern = `*.{${extensions}}`

  // Find all matching files
  const files = fg.sync(pattern, {
    cwd: imagesDir,
    absolute: true,
    onlyFiles: true,
    ignore: [
      '**/*.test.*',
      '**/*.spec.*',
      '**/*.d.ts',
      '**/index.ts',
      '**/index.tsx',
    ],
  })

  // Create scanned image objects
  const images: ScannedImage[] = []

  for (const filePath of files) {
    const parsed = path.parse(filePath)
    if (isImageFile(parsed.base)) {
      images.push(createScannedImage(filePath, imagesDir))
    }
  }

  return { images }
}
