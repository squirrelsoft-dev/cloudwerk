/**
 * @cloudwerk/core - Durable Object Scanner
 *
 * Scans the app/objects/ directory for durable object definition files.
 */

import * as path from 'node:path'
import fg from 'fast-glob'
import type { SupportedExtension, CloudwerkConfig } from './types.js'
import { SUPPORTED_EXTENSIONS } from './types.js'

// ============================================================================
// Types
// ============================================================================

/**
 * A scanned durable object file from the app/objects/ directory.
 */
export interface ScannedDurableObject {
  /** Relative path from app/objects/ (e.g., 'counter.ts') */
  relativePath: string

  /** Absolute filesystem path */
  absolutePath: string

  /** File name without extension (e.g., 'counter') */
  name: string

  /** File extension (e.g., '.ts') */
  extension: SupportedExtension
}

/**
 * Result of scanning the app/objects/ directory.
 */
export interface DurableObjectScanResult {
  /** All discovered durable object files */
  durableObjects: ScannedDurableObject[]
}

// ============================================================================
// Constants
// ============================================================================

/** Default directory name for durable objects */
export const OBJECTS_DIR = 'objects'

// ============================================================================
// File Detection
// ============================================================================

/**
 * Check if a file is a valid durable object file.
 *
 * @param filename - File name to check
 * @returns True if this is a valid durable object file
 */
export function isDurableObjectFile(filename: string): boolean {
  const parsed = path.parse(filename)
  const ext = parsed.ext as SupportedExtension

  // Must have a supported extension
  if (!SUPPORTED_EXTENSIONS.includes(ext as typeof SUPPORTED_EXTENSIONS[number])) {
    return false
  }

  // Durable object files should not be test files
  if (parsed.name.endsWith('.test') || parsed.name.endsWith('.spec')) {
    return false
  }

  // Durable object files should not be type definition files
  if (parsed.base.endsWith('.d.ts')) {
    return false
  }

  return true
}

/**
 * Convert a filename to a durable object name.
 *
 * Converts kebab-case to camelCase.
 *
 * @param filename - File name without extension
 * @returns Durable object name in camelCase
 *
 * @example
 * fileNameToObjectName('counter')      // 'counter'
 * fileNameToObjectName('chat-room')    // 'chatRoom'
 * fileNameToObjectName('rate-limiter') // 'rateLimiter'
 */
export function fileNameToObjectName(filename: string): string {
  return filename.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Convert a durable object name to a binding name.
 *
 * Converts camelCase to SCREAMING_SNAKE_CASE.
 *
 * @param objectName - Object name in camelCase
 * @returns Binding name in SCREAMING_SNAKE_CASE
 *
 * @example
 * objectNameToBindingName('counter')     // 'COUNTER'
 * objectNameToBindingName('chatRoom')    // 'CHAT_ROOM'
 * objectNameToBindingName('rateLimiter') // 'RATE_LIMITER'
 */
export function objectNameToBindingName(objectName: string): string {
  return objectName
    .replace(/([A-Z])/g, '_$1')
    .toUpperCase()
    .replace(/^_/, '')
}

/**
 * Convert a durable object name to a class name.
 *
 * Converts camelCase to PascalCase.
 *
 * @param objectName - Object name in camelCase
 * @returns Class name in PascalCase
 *
 * @example
 * objectNameToClassName('counter')     // 'Counter'
 * objectNameToClassName('chatRoom')    // 'ChatRoom'
 * objectNameToClassName('rateLimiter') // 'RateLimiter'
 */
export function objectNameToClassName(objectName: string): string {
  return objectName.charAt(0).toUpperCase() + objectName.slice(1)
}

/**
 * Convert a binding name back to a durable object name.
 *
 * Converts SCREAMING_SNAKE_CASE to camelCase.
 *
 * @param bindingName - Binding name in SCREAMING_SNAKE_CASE
 * @returns Object name in camelCase
 *
 * @example
 * bindingNameToObjectName('COUNTER')      // 'counter'
 * bindingNameToObjectName('CHAT_ROOM')    // 'chatRoom'
 * bindingNameToObjectName('RATE_LIMITER') // 'rateLimiter'
 */
export function bindingNameToObjectName(bindingName: string): string {
  return bindingName
    .toLowerCase()
    .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

// ============================================================================
// Durable Object Scanning
// ============================================================================

/**
 * Create a ScannedDurableObject from a file path.
 *
 * @param filePath - Absolute path to the file
 * @param objectsDir - Root objects directory for relative path calculation
 * @returns ScannedDurableObject object
 */
function createScannedDurableObject(
  filePath: string,
  objectsDir: string
): ScannedDurableObject {
  const absolutePath = path.resolve(filePath)
  const relativePath = path
    .relative(objectsDir, absolutePath)
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
 * Scan the objects directory for all durable object files.
 *
 * @param rootDir - App root directory (should contain objects/ subdirectory)
 * @param config - Configuration options
 * @returns DurableObjectScanResult with discovered durable object files
 *
 * @example
 * const result = await scanDurableObjects('./app', {
 *   extensions: ['.ts', '.tsx'],
 * })
 */
export async function scanDurableObjects(
  rootDir: string,
  config: Pick<CloudwerkConfig, 'extensions'>
): Promise<DurableObjectScanResult> {
  const objectsDir = path.resolve(rootDir, OBJECTS_DIR)
  const extensions = config.extensions.map((ext) => ext.slice(1)).join(',')

  // Build glob pattern for durable object files (direct children only, no subdirectories)
  const pattern = `*.{${extensions}}`

  // Find all matching files
  const files = await fg(pattern, {
    cwd: objectsDir,
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

  // Create scanned durable object objects
  const durableObjects: ScannedDurableObject[] = []

  for (const filePath of files) {
    const parsed = path.parse(filePath)
    if (isDurableObjectFile(parsed.base)) {
      durableObjects.push(createScannedDurableObject(filePath, objectsDir))
    }
  }

  return { durableObjects }
}

/**
 * Scan durable objects synchronously (for testing or simple use cases).
 *
 * @param rootDir - App root directory (should contain objects/ subdirectory)
 * @param config - Configuration options
 * @returns DurableObjectScanResult with discovered durable object files
 */
export function scanDurableObjectsSync(
  rootDir: string,
  config: Pick<CloudwerkConfig, 'extensions'>
): DurableObjectScanResult {
  const objectsDir = path.resolve(rootDir, OBJECTS_DIR)
  const extensions = config.extensions.map((ext) => ext.slice(1)).join(',')

  // Build glob pattern for durable object files (direct children only, no subdirectories)
  const pattern = `*.{${extensions}}`

  // Find all matching files
  const files = fg.sync(pattern, {
    cwd: objectsDir,
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

  // Create scanned durable object objects
  const durableObjects: ScannedDurableObject[] = []

  for (const filePath of files) {
    const parsed = path.parse(filePath)
    if (isDurableObjectFile(parsed.base)) {
      durableObjects.push(createScannedDurableObject(filePath, objectsDir))
    }
  }

  return { durableObjects }
}
