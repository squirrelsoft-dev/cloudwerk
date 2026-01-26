/**
 * @cloudwerk/core - File Scanner
 *
 * Scans the filesystem for route files using fast-glob.
 */

import * as path from 'node:path'
import fg from 'fast-glob'
import type {
  RouteFileType,
  ScannedFile,
  ScanResult,
  SupportedExtension,
  CloudwerkConfig,
} from './types.js'
import { SUPPORTED_EXTENSIONS, ROUTE_FILE_NAMES } from './types.js'
import { isRouteGroup } from './compiler.js'

// ============================================================================
// File Type Detection
// ============================================================================

/**
 * Get the file type from a filename.
 *
 * @param filename - File name without path (e.g., "page.tsx")
 * @returns The RouteFileType or null if not a route file
 *
 * @example
 * getFileType('page.tsx')       // 'page'
 * getFileType('route.ts')       // 'route'
 * getFileType('layout.tsx')     // 'layout'
 * getFileType('middleware.ts')  // 'middleware'
 * getFileType('random.ts')      // null
 */
export function getFileType(filename: string): RouteFileType | null {
  const parsed = path.parse(filename)
  const name = parsed.name
  const ext = parsed.ext as SupportedExtension

  // Check if extension is supported
  if (!SUPPORTED_EXTENSIONS.includes(ext as typeof SUPPORTED_EXTENSIONS[number])) {
    return null
  }

  // Check if name matches a route file type
  if (ROUTE_FILE_NAMES.includes(name as typeof ROUTE_FILE_NAMES[number])) {
    return name as RouteFileType
  }

  // Handle index files as pages
  if (name === 'index') {
    return 'page'
  }

  return null
}

/**
 * Check if a file is a route file (page or route).
 *
 * @param filename - File name to check
 * @returns True if this is a page or route file
 */
export function isRouteFile(filename: string): boolean {
  const fileType = getFileType(filename)
  return fileType === 'page' || fileType === 'route'
}

/**
 * Check if a file is a layout file.
 *
 * @param filename - File name to check
 * @returns True if this is a layout file
 */
export function isLayoutFile(filename: string): boolean {
  return getFileType(filename) === 'layout'
}

/**
 * Check if a file is a middleware file.
 *
 * @param filename - File name to check
 * @returns True if this is a middleware file
 */
export function isMiddlewareFile(filename: string): boolean {
  return getFileType(filename) === 'middleware'
}

// ============================================================================
// Route Group Detection
// ============================================================================

/**
 * Extract route groups from a path.
 *
 * @param relativePath - Relative path to analyze
 * @returns Array of route group names (without parentheses)
 *
 * @example
 * extractRouteGroups('(marketing)/about/page.tsx') // ['marketing']
 * extractRouteGroups('(auth)/(admin)/users/page.tsx') // ['auth', 'admin']
 */
export function extractRouteGroups(relativePath: string): string[] {
  const segments = relativePath.split(path.posix.sep)
  const groups: string[] = []

  for (const segment of segments) {
    if (isRouteGroup(segment)) {
      // Remove parentheses to get group name
      groups.push(segment.slice(1, -1))
    }
  }

  return groups
}

/**
 * Check if a path contains any route groups.
 *
 * @param relativePath - Relative path to check
 * @returns True if path contains route groups
 */
export function hasRouteGroups(relativePath: string): boolean {
  return extractRouteGroups(relativePath).length > 0
}

// ============================================================================
// File Scanning
// ============================================================================

/**
 * Create a ScannedFile object from a file path.
 *
 * @param filePath - Absolute path to the file
 * @param rootDir - Root directory for relative path calculation
 * @returns ScannedFile object
 */
function createScannedFile(filePath: string, rootDir: string): ScannedFile {
  const absolutePath = path.resolve(filePath)
  const relativePath = path.relative(rootDir, absolutePath).split(path.sep).join(path.posix.sep)
  const parsed = path.parse(filePath)

  return {
    relativePath,
    absolutePath,
    name: parsed.name,
    extension: parsed.ext as SupportedExtension,
    fileType: getFileType(parsed.base),
    isInGroup: hasRouteGroups(relativePath),
    groups: extractRouteGroups(relativePath),
  }
}

/**
 * Scan the routes directory for all route files.
 *
 * @param rootDir - Directory to scan
 * @param config - Configuration options
 * @returns ScanResult with categorized files
 *
 * @example
 * const result = await scanRoutes('./app', {
 *   extensions: ['.ts', '.tsx'],
 *   strict: true,
 * })
 */
export async function scanRoutes(
  rootDir: string,
  config: Pick<CloudwerkConfig, 'extensions'>
): Promise<ScanResult> {
  const absoluteRoot = path.resolve(rootDir)
  const extensions = config.extensions.map(ext => ext.slice(1)).join(',')

  // Build glob patterns for all route files
  const patterns = ROUTE_FILE_NAMES.map(name => `**/${name}.{${extensions}}`)

  // Also include index files as potential routes
  patterns.push(`**/index.{${extensions}}`)

  // Find all matching files
  const files = await fg(patterns, {
    cwd: absoluteRoot,
    absolute: true,
    onlyFiles: true,
    ignore: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/*.test.*',
      '**/*.spec.*',
      '**/__tests__/**',
    ],
  })

  // Categorize files
  const result: ScanResult = {
    routes: [],
    layouts: [],
    middleware: [],
    loading: [],
    errors: [],
    notFound: [],
  }

  for (const filePath of files) {
    const scannedFile = createScannedFile(filePath, absoluteRoot)

    switch (scannedFile.fileType) {
      case 'page':
      case 'route':
        result.routes.push(scannedFile)
        break
      case 'layout':
        result.layouts.push(scannedFile)
        break
      case 'middleware':
        result.middleware.push(scannedFile)
        break
      case 'loading':
        result.loading.push(scannedFile)
        break
      case 'error':
        result.errors.push(scannedFile)
        break
      case 'not-found':
        result.notFound.push(scannedFile)
        break
    }
  }

  return result
}

/**
 * Scan routes synchronously (for testing or simple use cases).
 * Uses fast-glob's sync API.
 *
 * @param rootDir - Directory to scan
 * @param config - Configuration options
 * @returns ScanResult with categorized files
 */
export function scanRoutesSync(
  rootDir: string,
  config: Pick<CloudwerkConfig, 'extensions'>
): ScanResult {
  const absoluteRoot = path.resolve(rootDir)
  const extensions = config.extensions.map(ext => ext.slice(1)).join(',')

  // Build glob patterns for all route files
  const patterns = ROUTE_FILE_NAMES.map(name => `**/${name}.{${extensions}}`)

  // Also include index files as potential routes
  patterns.push(`**/index.{${extensions}}`)

  // Find all matching files
  const files = fg.sync(patterns, {
    cwd: absoluteRoot,
    absolute: true,
    onlyFiles: true,
    ignore: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/*.test.*',
      '**/*.spec.*',
      '**/__tests__/**',
    ],
  })

  // Categorize files
  const result: ScanResult = {
    routes: [],
    layouts: [],
    middleware: [],
    loading: [],
    errors: [],
    notFound: [],
  }

  for (const filePath of files) {
    const scannedFile = createScannedFile(filePath, absoluteRoot)

    switch (scannedFile.fileType) {
      case 'page':
      case 'route':
        result.routes.push(scannedFile)
        break
      case 'layout':
        result.layouts.push(scannedFile)
        break
      case 'middleware':
        result.middleware.push(scannedFile)
        break
      case 'loading':
        result.loading.push(scannedFile)
        break
      case 'error':
        result.errors.push(scannedFile)
        break
      case 'not-found':
        result.notFound.push(scannedFile)
        break
    }
  }

  return result
}
