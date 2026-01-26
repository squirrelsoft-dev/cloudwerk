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
