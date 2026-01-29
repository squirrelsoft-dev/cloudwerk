/**
 * @cloudwerk/core - Path Compiler
 *
 * Converts filesystem paths to URL patterns for Hono routing.
 * Uses path.posix for cross-platform URL path manipulation.
 */

import * as path from 'node:path'
import type {
  RouteSegment,
  StaticSegment,
  DynamicSegment,
  CatchAllSegment,
  OptionalCatchAllSegment,
  RouteEntry,
  RouteFileType,
  RouteManifest,
  RouteValidationError,
  RouteValidationWarning,
  ScannedFile,
  ScanResult,
} from './types.js'

// ============================================================================
// Segment Parsing
// ============================================================================

/**
 * Pattern matchers for route segments
 */
const DYNAMIC_SEGMENT_PATTERN = /^\[([a-zA-Z_][a-zA-Z0-9_]*)\]$/
const CATCH_ALL_PATTERN = /^\[\.\.\.([a-zA-Z_][a-zA-Z0-9_]*)\]$/
const OPTIONAL_CATCH_ALL_PATTERN = /^\[\[\.\.\.([a-zA-Z_][a-zA-Z0-9_]*)\]\]$/
const ROUTE_GROUP_PATTERN = /^\([a-zA-Z_][a-zA-Z0-9_-]*\)$/

/**
 * Parse a single path segment into a typed RouteSegment.
 *
 * @param segment - The raw path segment string
 * @returns Parsed RouteSegment or null if invalid
 *
 * @example
 * parseSegment('users')        // { type: 'static', value: 'users' }
 * parseSegment('[id]')         // { type: 'dynamic', name: 'id' }
 * parseSegment('[...path]')    // { type: 'catchAll', name: 'path' }
 * parseSegment('[[...cat]]')   // { type: 'optionalCatchAll', name: 'cat' }
 */
export function parseSegment(segment: string): RouteSegment | null {
  // Skip empty segments
  if (!segment || segment.trim() === '') {
    return null
  }

  // Skip route groups - they don't appear in URL
  if (ROUTE_GROUP_PATTERN.test(segment)) {
    return null
  }

  // Check for optional catch-all first (more specific pattern)
  const optionalCatchAllMatch = segment.match(OPTIONAL_CATCH_ALL_PATTERN)
  if (optionalCatchAllMatch) {
    return {
      type: 'optionalCatchAll',
      name: optionalCatchAllMatch[1],
    } satisfies OptionalCatchAllSegment
  }

  // Check for catch-all
  const catchAllMatch = segment.match(CATCH_ALL_PATTERN)
  if (catchAllMatch) {
    return {
      type: 'catchAll',
      name: catchAllMatch[1],
    } satisfies CatchAllSegment
  }

  // Check for dynamic segment
  const dynamicMatch = segment.match(DYNAMIC_SEGMENT_PATTERN)
  if (dynamicMatch) {
    return {
      type: 'dynamic',
      name: dynamicMatch[1],
    } satisfies DynamicSegment
  }

  // Must be a static segment
  // Validate static segments don't contain special characters
  if (!/^[a-zA-Z0-9_-]+$/.test(segment)) {
    return null // Invalid segment
  }

  return {
    type: 'static',
    value: segment,
  } satisfies StaticSegment
}

/**
 * Check if a folder name is a route group (parentheses pattern).
 *
 * @param name - Folder name to check
 * @returns True if this is a route group
 *
 * @example
 * isRouteGroup('(marketing)') // true
 * isRouteGroup('(auth)')      // true
 * isRouteGroup('users')       // false
 */
export function isRouteGroup(name: string): boolean {
  return ROUTE_GROUP_PATTERN.test(name)
}

// ============================================================================
// Path to URL Conversion
// ============================================================================

/**
 * Convert a filesystem path to a Hono URL pattern.
 *
 * @param filePath - Relative path from routes directory
 * @returns URL pattern for Hono, or null if invalid
 *
 * @example
 * filePathToRoutePath('index.ts')                    // '/'
 * filePathToRoutePath('about/page.tsx')              // '/about'
 * filePathToRoutePath('users/[id]/route.ts')         // '/users/:id'
 * filePathToRoutePath('docs/[...path]/page.tsx')     // '/docs/*path'
 * filePathToRoutePath('shop/[[...cat]]/page.tsx')    // '/shop/:cat*'
 * filePathToRoutePath('(marketing)/about/page.tsx')  // '/about'
 */
export function filePathToRoutePath(filePath: string): {
  urlPattern: string
  segments: RouteSegment[]
} | null {
  // Normalize path separators to posix
  const normalizedPath = filePath.split(path.sep).join(path.posix.sep)

  // Parse the path
  const parsed = path.posix.parse(normalizedPath)
  const dir = parsed.dir

  // Handle index files at root
  if (dir === '' || dir === '.') {
    return {
      urlPattern: '/',
      segments: [],
    }
  }

  // Split directory into segments
  const pathSegments = dir.split(path.posix.sep).filter(Boolean)

  // Parse each segment, filtering out route groups
  const parsedSegments: RouteSegment[] = []
  const urlParts: string[] = []

  for (const segment of pathSegments) {
    // Skip route groups - they don't appear in URL
    if (isRouteGroup(segment)) {
      continue
    }

    const parsed = parseSegment(segment)
    if (parsed === null && !isRouteGroup(segment)) {
      // Invalid segment that's not a route group
      return null
    }

    if (parsed !== null) {
      parsedSegments.push(parsed)

      // Convert to Hono URL pattern syntax
      switch (parsed.type) {
        case 'static':
          urlParts.push(parsed.value)
          break
        case 'dynamic':
          urlParts.push(`:${parsed.name}`)
          break
        case 'catchAll':
          // Use Hono's regex pattern for catch-all (one or more path segments)
          urlParts.push(`:${parsed.name}{.+}`)
          break
        case 'optionalCatchAll':
          // Use Hono's regex pattern for optional catch-all (zero or more path segments)
          // Note: This requires the base path to also be registered separately
          urlParts.push(`:${parsed.name}{.*}`)
          break
      }
    }
  }

  const urlPattern = '/' + urlParts.join('/')

  return {
    urlPattern,
    segments: parsedSegments,
  }
}

// ============================================================================
// Route Sorting
// ============================================================================

/**
 * Calculate priority for a route (lower = higher priority).
 * Static routes have highest priority, catch-all have lowest.
 *
 * @param segments - Parsed route segments
 * @returns Priority number
 */
export function calculateRoutePriority(segments: RouteSegment[]): number {
  let priority = 0

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const position = i + 1

    switch (segment.type) {
      case 'static':
        // Static segments have highest priority
        priority += position * 1
        break
      case 'dynamic':
        // Dynamic segments have medium priority
        priority += position * 10
        break
      case 'catchAll':
        // Catch-all has low priority
        priority += position * 100
        break
      case 'optionalCatchAll':
        // Optional catch-all has lowest priority
        priority += position * 1000
        break
    }
  }

  // Longer paths (more specific) have higher priority within same type
  // But we want more specific to come first, so we subtract segment count
  priority -= segments.length * 0.1

  return priority
}

/**
 * Sort routes by priority for Hono registration.
 * More specific routes should be registered first.
 *
 * @param routes - Array of route entries
 * @returns Sorted array (mutates original)
 */
export function sortRoutes(routes: RouteEntry[]): RouteEntry[] {
  return routes.sort((a, b) => {
    // First sort by priority
    if (a.priority !== b.priority) {
      return a.priority - b.priority
    }

    // Then by number of segments (more specific first)
    if (a.segments.length !== b.segments.length) {
      return b.segments.length - a.segments.length
    }

    // Finally by URL pattern alphabetically for determinism
    return a.urlPattern.localeCompare(b.urlPattern)
  })
}

// ============================================================================
// Route Compilation
// ============================================================================

/**
 * Compile a single scanned file into a RouteEntry.
 *
 * @param file - Scanned file information
 * @param layouts - Resolved layout files for this route
 * @param middleware - Resolved middleware files for this route
 * @returns Compiled RouteEntry or null if invalid
 */
export function compileRoute(
  file: ScannedFile,
  layouts: string[],
  middleware: string[]
): RouteEntry | null {
  const result = filePathToRoutePath(file.relativePath)

  if (!result) {
    return null
  }

  const { urlPattern, segments } = result

  return {
    urlPattern,
    filePath: file.relativePath,
    absolutePath: file.absolutePath,
    fileType: file.fileType as RouteFileType,
    segments,
    layouts,
    middleware,
    priority: calculateRoutePriority(segments),
  }
}

// ============================================================================
// Manifest Building
// ============================================================================

/**
 * Build the complete route manifest from scan results.
 *
 * @param scanResult - Results from scanning the routes directory
 * @param rootDir - Root directory that was scanned
 * @param resolveLayouts - Function to resolve layouts for a path
 * @param resolveMiddleware - Function to resolve middleware for a path
 * @returns Complete RouteManifest
 */
export function buildRouteManifest(
  scanResult: ScanResult,
  rootDir: string,
  resolveLayouts: (relativePath: string, allLayouts: ScannedFile[]) => string[],
  resolveMiddleware: (relativePath: string, allMiddleware: ScannedFile[]) => string[]
): RouteManifest {
  const routes: RouteEntry[] = []
  const errors: RouteValidationError[] = []
  const warnings: RouteValidationWarning[] = []

  // Build layout and middleware maps
  const layoutMap = new Map<string, string>()
  for (const layout of scanResult.layouts) {
    const dir = path.posix.dirname(layout.relativePath)
    layoutMap.set(dir, layout.absolutePath)
  }

  const middlewareMap = new Map<string, string>()
  for (const mw of scanResult.middleware) {
    const dir = path.posix.dirname(mw.relativePath)
    middlewareMap.set(dir, mw.absolutePath)
  }

  // Compile each route file
  for (const file of scanResult.routes) {
    const layouts = resolveLayouts(file.relativePath, scanResult.layouts)
    const middleware = resolveMiddleware(file.relativePath, scanResult.middleware)

    const route = compileRoute(file, layouts, middleware)

    if (route) {
      routes.push(route)
    } else {
      errors.push({
        type: 'invalid-pattern',
        message: `Invalid route pattern in file: ${file.relativePath}`,
        files: [file.relativePath],
      })
    }
  }

  // Sort routes by priority
  sortRoutes(routes)

  // Check for deep nesting warning
  for (const route of routes) {
    if (route.segments.length > 5) {
      warnings.push({
        type: 'deep-nesting',
        message: `Route has ${route.segments.length} levels of nesting. Consider flattening.`,
        files: [route.filePath],
      })
    }
  }

  return {
    routes,
    layouts: layoutMap,
    middleware: middlewareMap,
    errors,
    warnings,
    generatedAt: new Date(),
    rootDir,
  }
}
