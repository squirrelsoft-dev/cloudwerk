/**
 * @cloudwerk/core - Route Validator
 *
 * Validates route configurations and detects conflicts.
 */

import * as path from 'node:path'
import type {
  RouteEntry,
  RouteManifest,
  RouteValidationError,
  RouteValidationWarning,
  ScannedFile,
  ScanResult,
} from './types.js'

// ============================================================================
// Single Route Validation
// ============================================================================

/**
 * Validate a single route entry.
 *
 * @param route - Route entry to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateRoute(route: RouteEntry): RouteValidationError[] {
  const errors: RouteValidationError[] = []

  // Validate URL pattern is not empty
  if (!route.urlPattern || route.urlPattern.trim() === '') {
    errors.push({
      type: 'invalid-pattern',
      message: 'Route URL pattern cannot be empty',
      files: [route.filePath],
    })
  }

  // Validate URL pattern starts with /
  if (!route.urlPattern.startsWith('/')) {
    errors.push({
      type: 'invalid-pattern',
      message: `Route URL pattern must start with /: ${route.urlPattern}`,
      files: [route.filePath],
    })
  }

  // Check for multiple catch-all segments (not allowed)
  const catchAllCount = route.segments.filter(
    s => s.type === 'catchAll' || s.type === 'optionalCatchAll'
  ).length

  if (catchAllCount > 1) {
    errors.push({
      type: 'invalid-pattern',
      message: 'Route cannot have multiple catch-all segments',
      files: [route.filePath],
    })
  }

  // Catch-all must be the last segment
  const lastSegment = route.segments[route.segments.length - 1]
  const hasCatchAll = route.segments.some(
    s => s.type === 'catchAll' || s.type === 'optionalCatchAll'
  )

  if (
    hasCatchAll &&
    lastSegment &&
    lastSegment.type !== 'catchAll' &&
    lastSegment.type !== 'optionalCatchAll'
  ) {
    errors.push({
      type: 'invalid-pattern',
      message: 'Catch-all segment must be the last segment in the route',
      files: [route.filePath],
    })
  }

  // Validate segment names (no duplicates)
  const dynamicNames = route.segments
    .filter(s => s.type !== 'static')
    .map(s => ('name' in s ? s.name : null))
    .filter(Boolean) as string[]

  const uniqueNames = new Set(dynamicNames)
  if (uniqueNames.size !== dynamicNames.length) {
    errors.push({
      type: 'invalid-pattern',
      message: 'Route cannot have duplicate dynamic segment names',
      files: [route.filePath],
    })
  }

  return errors
}

// ============================================================================
// Conflict Detection
// ============================================================================

/**
 * Detect conflicts between page.tsx and route.ts at the same path.
 * Having both at the same location is an error.
 *
 * @param routes - All route entries
 * @returns Array of conflict errors
 */
export function detectPageRouteConflicts(routes: RouteEntry[]): RouteValidationError[] {
  const errors: RouteValidationError[] = []

  // Group routes by URL pattern
  const routesByPattern = new Map<string, RouteEntry[]>()

  for (const route of routes) {
    const existing = routesByPattern.get(route.urlPattern) || []
    existing.push(route)
    routesByPattern.set(route.urlPattern, existing)
  }

  // Check for page + route conflicts
  for (const [pattern, matchingRoutes] of routesByPattern) {
    if (matchingRoutes.length > 1) {
      const hasPage = matchingRoutes.some(r => r.fileType === 'page')
      const hasRoute = matchingRoutes.some(r => r.fileType === 'route')

      if (hasPage && hasRoute) {
        errors.push({
          type: 'conflict',
          message: `Cannot have both page.tsx and route.ts at the same path: ${pattern}`,
          files: matchingRoutes.map(r => r.filePath),
        })
      }
    }
  }

  return errors
}

/**
 * Detect routes that would shadow each other.
 * For example, /users/:id would shadow /users/profile if registered first.
 *
 * @param routes - Sorted route entries
 * @returns Array of shadow warnings (not errors, just warnings)
 */
export function detectShadowedRoutes(routes: RouteEntry[]): RouteValidationWarning[] {
  const warnings: RouteValidationWarning[] = []

  for (let i = 0; i < routes.length; i++) {
    for (let j = i + 1; j < routes.length; j++) {
      const earlier = routes[i]
      const later = routes[j]

      // Check if earlier route could match later route's pattern
      if (couldShadow(earlier, later)) {
        warnings.push({
          type: 'naming-convention',
          message: `Route ${earlier.urlPattern} may shadow ${later.urlPattern}. Consider reordering or renaming.`,
          files: [earlier.filePath, later.filePath],
        })
      }
    }
  }

  return warnings
}

/**
 * Check if one route could shadow another.
 *
 * @param earlier - Route registered first
 * @param later - Route registered later
 * @returns True if earlier could match requests meant for later
 */
function couldShadow(earlier: RouteEntry, later: RouteEntry): boolean {
  // Same pattern - definitely conflicts
  if (earlier.urlPattern === later.urlPattern) {
    return true
  }

  // Catch-all at same prefix level could shadow
  const hasCatchAll = earlier.segments.some(
    s => s.type === 'catchAll' || s.type === 'optionalCatchAll'
  )

  if (hasCatchAll) {
    // Get the prefix before catch-all
    const catchAllIndex = earlier.segments.findIndex(
      s => s.type === 'catchAll' || s.type === 'optionalCatchAll'
    )

    const earlierPrefix = earlier.segments.slice(0, catchAllIndex)
    const laterPrefix = later.segments.slice(0, catchAllIndex)

    // Check if prefixes match
    if (earlierPrefix.length === laterPrefix.length) {
      let prefixMatch = true
      for (let i = 0; i < earlierPrefix.length; i++) {
        const e = earlierPrefix[i]
        const l = laterPrefix[i]

        if (e.type === 'static' && l.type === 'static' && e.value !== l.value) {
          prefixMatch = false
          break
        }
      }

      if (prefixMatch) {
        return true
      }
    }
  }

  return false
}

// ============================================================================
// Manifest Validation
// ============================================================================

/**
 * Validate an entire route manifest.
 *
 * @param manifest - Route manifest to validate
 * @returns Updated manifest with validation results
 */
export function validateManifest(manifest: RouteManifest): RouteManifest {
  const errors: RouteValidationError[] = [...manifest.errors]
  const warnings: RouteValidationWarning[] = [...manifest.warnings]

  // Validate each route individually
  for (const route of manifest.routes) {
    errors.push(...validateRoute(route))
  }

  // Check for page/route conflicts
  errors.push(...detectPageRouteConflicts(manifest.routes))

  // Check for shadowed routes (warnings only)
  warnings.push(...detectShadowedRoutes(manifest.routes))

  return {
    ...manifest,
    errors,
    warnings,
  }
}

// ============================================================================
// Scan Result Validation
// ============================================================================

/**
 * Validate scan results before compilation.
 *
 * @param scanResult - Results from scanning
 * @returns Array of validation errors
 */
export function validateScanResult(scanResult: ScanResult): RouteValidationError[] {
  const errors: RouteValidationError[] = []

  // Check for duplicate files at same location
  const routePaths = new Map<string, ScannedFile[]>()

  for (const route of scanResult.routes) {
    const dir = path.posix.dirname(route.relativePath)
    const existing = routePaths.get(dir) || []
    existing.push(route)
    routePaths.set(dir, existing)
  }

  // Detect page + route at same directory
  for (const [dir, files] of routePaths) {
    const hasPage = files.some(f => f.fileType === 'page')
    const hasRoute = files.some(f => f.fileType === 'route')

    if (hasPage && hasRoute) {
      errors.push({
        type: 'conflict',
        message: `Cannot have both page and route files in the same directory: ${dir || '/'}`,
        files: files.map(f => f.relativePath),
      })
    }
  }

  return errors
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a manifest has any blocking errors.
 *
 * @param manifest - Route manifest to check
 * @returns True if manifest has errors
 */
export function hasErrors(manifest: RouteManifest): boolean {
  return manifest.errors.length > 0
}

/**
 * Check if a manifest has warnings.
 *
 * @param manifest - Route manifest to check
 * @returns True if manifest has warnings
 */
export function hasWarnings(manifest: RouteManifest): boolean {
  return manifest.warnings.length > 0
}

/**
 * Format validation errors for display.
 *
 * @param errors - Array of validation errors
 * @returns Formatted error string
 */
export function formatErrors(errors: RouteValidationError[]): string {
  if (errors.length === 0) {
    return 'No errors'
  }

  return errors
    .map((e, i) => {
      const files = e.files.join(', ')
      return `${i + 1}. [${e.type}] ${e.message}\n   Files: ${files}`
    })
    .join('\n\n')
}

/**
 * Format validation warnings for display.
 *
 * @param warnings - Array of validation warnings
 * @returns Formatted warning string
 */
export function formatWarnings(warnings: RouteValidationWarning[]): string {
  if (warnings.length === 0) {
    return 'No warnings'
  }

  return warnings
    .map((w, i) => {
      const files = w.files.join(', ')
      return `${i + 1}. [${w.type}] ${w.message}\n   Files: ${files}`
    })
    .join('\n\n')
}
