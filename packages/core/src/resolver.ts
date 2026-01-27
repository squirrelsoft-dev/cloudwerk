/**
 * @cloudwerk/core - Layout and Middleware Resolver
 *
 * Walks up the directory tree to collect layouts and middleware
 * that apply to a given route.
 */

import * as path from 'node:path'
import type { ScannedFile } from './types.js'
import { isRouteGroup } from './compiler.js'

// ============================================================================
// Path Utilities
// ============================================================================

/**
 * Get all ancestor directories for a given path.
 * Returns directories from root to immediate parent.
 *
 * @param relativePath - Relative path to analyze
 * @returns Array of directory paths from root to parent
 *
 * @example
 * getAncestorDirs('users/[id]/profile/page.tsx')
 * // ['', 'users', 'users/[id]', 'users/[id]/profile']
 */
export function getAncestorDirs(relativePath: string): string[] {
  const dir = path.posix.dirname(relativePath)

  if (dir === '.' || dir === '') {
    return ['']
  }

  const segments = dir.split(path.posix.sep)
  const ancestors: string[] = [''] // Root directory

  let current = ''
  for (const segment of segments) {
    if (current === '') {
      current = segment
    } else {
      current = path.posix.join(current, segment)
    }
    ancestors.push(current)
  }

  return ancestors
}

/**
 * Normalize a directory path for comparison.
 * Handles edge cases like '.' and empty strings.
 *
 * @param dir - Directory path to normalize
 * @returns Normalized directory path
 */
function normalizeDir(dir: string): string {
  if (dir === '.' || dir === '') {
    return ''
  }
  return dir.split(path.sep).join(path.posix.sep)
}

// ============================================================================
// Layout Resolution
// ============================================================================

/**
 * Resolve all layouts that apply to a given route path.
 * Walks up the directory tree from root to the route's directory,
 * collecting layouts in order (root layout first, closest layout last).
 *
 * @param relativePath - Relative path of the route file
 * @param allLayouts - All discovered layout files
 * @returns Array of layout absolute paths, ordered root to closest
 *
 * @example
 * // Given layouts at:
 * //   app/layout.tsx (root)
 * //   app/dashboard/layout.tsx
 * //   app/dashboard/settings/layout.tsx
 * //
 * // For route at app/dashboard/settings/page.tsx:
 * resolveLayouts('dashboard/settings/page.tsx', layouts)
 * // Returns: ['/abs/app/layout.tsx', '/abs/app/dashboard/layout.tsx', '/abs/app/dashboard/settings/layout.tsx']
 */
export function resolveLayouts(
  relativePath: string,
  allLayouts: ScannedFile[]
): string[] {
  const ancestors = getAncestorDirs(relativePath)
  const layouts: string[] = []

  // Build a map of directory -> layout for quick lookup
  const layoutMap = new Map<string, ScannedFile>()
  for (const layout of allLayouts) {
    const dir = normalizeDir(path.posix.dirname(layout.relativePath))
    layoutMap.set(dir, layout)
  }

  // Walk from root to current directory, collecting layouts
  for (const ancestor of ancestors) {
    const normalizedAncestor = normalizeDir(ancestor)
    const layout = layoutMap.get(normalizedAncestor)
    if (layout) {
      layouts.push(layout.absolutePath)
    }
  }

  return layouts
}

/**
 * Resolve layouts considering route groups.
 * Route groups can have their own layouts that only apply
 * to routes within that group.
 *
 * @param relativePath - Relative path of the route file
 * @param allLayouts - All discovered layout files
 * @returns Array of layout absolute paths
 */
export function resolveLayoutsWithGroups(
  relativePath: string,
  allLayouts: ScannedFile[]
): string[] {
  const ancestors = getAncestorDirs(relativePath)
  const layouts: string[] = []

  // Build a map of directory -> layout
  const layoutMap = new Map<string, ScannedFile>()
  for (const layout of allLayouts) {
    const dir = normalizeDir(path.posix.dirname(layout.relativePath))
    layoutMap.set(dir, layout)
  }

  // Track which groups we're in
  const activeGroups = new Set<string>()

  // Walk from root to current directory
  for (const ancestor of ancestors) {
    const normalizedAncestor = normalizeDir(ancestor)
    const segments = normalizedAncestor.split(path.posix.sep).filter(Boolean)

    // Check if this ancestor is a route group
    const lastSegment = segments[segments.length - 1]
    if (lastSegment && isRouteGroup(lastSegment)) {
      activeGroups.add(lastSegment)
    }

    // Check for layout at this level
    const layout = layoutMap.get(normalizedAncestor)
    if (layout) {
      layouts.push(layout.absolutePath)
    }
  }

  return layouts
}

// ============================================================================
// Middleware Resolution
// ============================================================================

/**
 * Resolve all middleware that applies to a given route path.
 * Walks up the directory tree from root to the route's directory,
 * collecting middleware in order (root middleware first, closest last).
 *
 * @param relativePath - Relative path of the route file
 * @param allMiddleware - All discovered middleware files
 * @returns Array of middleware absolute paths, ordered root to closest
 *
 * @example
 * // Given middleware at:
 * //   app/middleware.ts (root - applies to all routes)
 * //   app/dashboard/middleware.ts (applies to dashboard routes)
 * //
 * // For route at app/dashboard/settings/page.tsx:
 * resolveMiddleware('dashboard/settings/page.tsx', middleware)
 * // Returns: ['/abs/app/middleware.ts', '/abs/app/dashboard/middleware.ts']
 */
export function resolveMiddleware(
  relativePath: string,
  allMiddleware: ScannedFile[]
): string[] {
  const ancestors = getAncestorDirs(relativePath)
  const middleware: string[] = []

  // Build a map of directory -> middleware for quick lookup
  const middlewareMap = new Map<string, ScannedFile>()
  for (const mw of allMiddleware) {
    const dir = normalizeDir(path.posix.dirname(mw.relativePath))
    middlewareMap.set(dir, mw)
  }

  // Walk from root to current directory, collecting middleware
  for (const ancestor of ancestors) {
    const normalizedAncestor = normalizeDir(ancestor)
    const mw = middlewareMap.get(normalizedAncestor)
    if (mw) {
      middleware.push(mw.absolutePath)
    }
  }

  return middleware
}

/**
 * Resolve middleware considering route groups.
 * Middleware in a route group only applies to routes within that group.
 *
 * @param relativePath - Relative path of the route file
 * @param allMiddleware - All discovered middleware files
 * @returns Array of middleware absolute paths
 */
export function resolveMiddlewareWithGroups(
  relativePath: string,
  allMiddleware: ScannedFile[]
): string[] {
  const ancestors = getAncestorDirs(relativePath)
  const middleware: string[] = []

  // Build a map of directory -> middleware
  const middlewareMap = new Map<string, ScannedFile>()
  for (const mw of allMiddleware) {
    const dir = normalizeDir(path.posix.dirname(mw.relativePath))
    middlewareMap.set(dir, mw)
  }

  // Walk from root to current directory
  for (const ancestor of ancestors) {
    const normalizedAncestor = normalizeDir(ancestor)
    const mw = middlewareMap.get(normalizedAncestor)
    if (mw) {
      middleware.push(mw.absolutePath)
    }
  }

  return middleware
}

// ============================================================================
// Combined Resolution
// ============================================================================

/**
 * Resolve both layouts and middleware for a route.
 *
 * @param relativePath - Relative path of the route file
 * @param allLayouts - All discovered layout files
 * @param allMiddleware - All discovered middleware files
 * @returns Object with resolved layouts and middleware
 */
export function resolveRouteContext(
  relativePath: string,
  allLayouts: ScannedFile[],
  allMiddleware: ScannedFile[]
): { layouts: string[]; middleware: string[] } {
  return {
    layouts: resolveLayouts(relativePath, allLayouts),
    middleware: resolveMiddleware(relativePath, allMiddleware),
  }
}

// ============================================================================
// Error Boundary Resolution
// ============================================================================

/**
 * Resolve the nearest error boundary for a given route path.
 * Walks from closest directory to root, returning first match.
 *
 * Unlike layouts and middleware which accumulate from root to closest,
 * error boundaries return only the nearest one (closest wins).
 *
 * @param relativePath - Relative path of the route file
 * @param allErrors - All discovered error boundary files
 * @returns Absolute path to error boundary, or null if none found
 *
 * @example
 * // Given error boundaries at:
 * //   app/error.tsx (root)
 * //   app/dashboard/error.tsx
 * //
 * // For route at app/dashboard/settings/page.tsx:
 * resolveErrorBoundary('dashboard/settings/page.tsx', errors)
 * // Returns: '/abs/app/dashboard/error.tsx' (closest boundary)
 */
export function resolveErrorBoundary(
  relativePath: string,
  allErrors: ScannedFile[]
): string | null {
  const ancestors = getAncestorDirs(relativePath)

  // Build map of directory -> error boundary for quick lookup
  const errorMap = new Map<string, ScannedFile>()
  for (const err of allErrors) {
    const dir = normalizeDir(path.posix.dirname(err.relativePath))
    errorMap.set(dir, err)
  }

  // Walk from closest to root (reverse order)
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const dir = normalizeDir(ancestors[i])
    const boundary = errorMap.get(dir)
    if (boundary) {
      return boundary.absolutePath
    }
  }

  return null
}

/**
 * Resolve the nearest not-found boundary for a given route path.
 * Walks from closest directory to root, returning first match.
 *
 * Unlike layouts and middleware which accumulate from root to closest,
 * not-found boundaries return only the nearest one (closest wins).
 *
 * @param relativePath - Relative path of the route file
 * @param allNotFound - All discovered not-found boundary files
 * @returns Absolute path to not-found boundary, or null if none found
 *
 * @example
 * // Given not-found boundaries at:
 * //   app/not-found.tsx (root)
 * //   app/dashboard/not-found.tsx
 * //
 * // For route at app/dashboard/settings/page.tsx:
 * resolveNotFoundBoundary('dashboard/settings/page.tsx', notFound)
 * // Returns: '/abs/app/dashboard/not-found.tsx' (closest boundary)
 */
export function resolveNotFoundBoundary(
  relativePath: string,
  allNotFound: ScannedFile[]
): string | null {
  const ancestors = getAncestorDirs(relativePath)

  // Build map of directory -> not-found boundary for quick lookup
  const notFoundMap = new Map<string, ScannedFile>()
  for (const nf of allNotFound) {
    const dir = normalizeDir(path.posix.dirname(nf.relativePath))
    notFoundMap.set(dir, nf)
  }

  // Walk from closest to root (reverse order)
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const dir = normalizeDir(ancestors[i])
    const boundary = notFoundMap.get(dir)
    if (boundary) {
      return boundary.absolutePath
    }
  }

  return null
}

// ============================================================================
// Loading Boundary Resolution
// ============================================================================

/**
 * Resolve the nearest loading boundary for a given route path.
 * Walks from closest directory to root, returning first match.
 *
 * Unlike layouts and middleware which accumulate from root to closest,
 * loading boundaries return only the nearest one (closest wins).
 *
 * @param relativePath - Relative path of the route file
 * @param allLoading - All discovered loading boundary files
 * @returns Absolute path to loading boundary, or null if none found
 *
 * @example
 * // Given loading boundaries at:
 * //   app/loading.tsx (root)
 * //   app/dashboard/loading.tsx
 * //
 * // For route at app/dashboard/settings/page.tsx:
 * resolveLoadingBoundary('dashboard/settings/page.tsx', loading)
 * // Returns: '/abs/app/dashboard/loading.tsx' (closest boundary)
 */
export function resolveLoadingBoundary(
  relativePath: string,
  allLoading: ScannedFile[]
): string | null {
  const ancestors = getAncestorDirs(relativePath)

  // Build map of directory -> loading boundary for quick lookup
  const loadingMap = new Map<string, ScannedFile>()
  for (const loading of allLoading) {
    const dir = normalizeDir(path.posix.dirname(loading.relativePath))
    loadingMap.set(dir, loading)
  }

  // Walk from closest to root (reverse order)
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const dir = normalizeDir(ancestors[i])
    const boundary = loadingMap.get(dir)
    if (boundary) {
      return boundary.absolutePath
    }
  }

  return null
}
