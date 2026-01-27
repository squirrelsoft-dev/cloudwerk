/**
 * @cloudwerk/core - Error Boundary Resolver Tests
 *
 * Tests for error and not-found boundary resolution.
 */

import { describe, it, expect } from 'vitest'
import {
  resolveErrorBoundary,
  resolveNotFoundBoundary,
} from '../resolver.js'
import type { ScannedFile } from '../types.js'

// ============================================================================
// Helper Functions
// ============================================================================

function createErrorBoundary(relativePath: string): ScannedFile {
  return {
    relativePath,
    absolutePath: `/app/${relativePath}`,
    name: 'error',
    extension: '.tsx',
    fileType: 'error',
    isInGroup: relativePath.includes('('),
    groups: [],
  }
}

function createNotFoundBoundary(relativePath: string): ScannedFile {
  return {
    relativePath,
    absolutePath: `/app/${relativePath}`,
    name: 'not-found',
    extension: '.tsx',
    fileType: 'not-found',
    isInGroup: relativePath.includes('('),
    groups: [],
  }
}

// ============================================================================
// resolveErrorBoundary Tests
// ============================================================================

describe('resolveErrorBoundary', () => {
  it('should return null when no error boundaries exist', () => {
    const result = resolveErrorBoundary('dashboard/settings/page.tsx', [])
    expect(result).toBeNull()
  })

  it('should resolve root error boundary for any route', () => {
    const errors = [createErrorBoundary('error.tsx')]

    const result = resolveErrorBoundary('dashboard/settings/page.tsx', errors)

    expect(result).toBe('/app/error.tsx')
  })

  it('should resolve closest error boundary (closest wins)', () => {
    const errors = [
      createErrorBoundary('error.tsx'),
      createErrorBoundary('dashboard/error.tsx'),
      createErrorBoundary('dashboard/settings/error.tsx'),
    ]

    const result = resolveErrorBoundary('dashboard/settings/page.tsx', errors)

    // Closest boundary wins
    expect(result).toBe('/app/dashboard/settings/error.tsx')
  })

  it('should resolve middle boundary when no closer one exists', () => {
    const errors = [
      createErrorBoundary('error.tsx'),
      createErrorBoundary('dashboard/error.tsx'),
    ]

    const result = resolveErrorBoundary('dashboard/settings/page.tsx', errors)

    // Dashboard boundary is closest available
    expect(result).toBe('/app/dashboard/error.tsx')
  })

  it('should resolve root boundary for root level page', () => {
    const errors = [createErrorBoundary('error.tsx')]

    const result = resolveErrorBoundary('page.tsx', errors)

    expect(result).toBe('/app/error.tsx')
  })

  it('should handle dynamic segments in paths', () => {
    const errors = [
      createErrorBoundary('error.tsx'),
      createErrorBoundary('users/[id]/error.tsx'),
    ]

    const result = resolveErrorBoundary('users/[id]/profile/page.tsx', errors)

    expect(result).toBe('/app/users/[id]/error.tsx')
  })

  it('should handle catch-all segments in paths', () => {
    const errors = [
      createErrorBoundary('error.tsx'),
      createErrorBoundary('docs/error.tsx'),
    ]

    const result = resolveErrorBoundary('docs/[...slug]/page.tsx', errors)

    expect(result).toBe('/app/docs/error.tsx')
  })

  it('should handle route groups', () => {
    const errors = [
      createErrorBoundary('error.tsx'),
      createErrorBoundary('(marketing)/error.tsx'),
    ]

    const result = resolveErrorBoundary('(marketing)/about/page.tsx', errors)

    expect(result).toBe('/app/(marketing)/error.tsx')
  })

  it('should not leak boundaries across route groups', () => {
    const errors = [
      createErrorBoundary('error.tsx'),
      createErrorBoundary('(auth)/error.tsx'),
    ]

    // Marketing route should not pick up auth error boundary
    const result = resolveErrorBoundary('(marketing)/about/page.tsx', errors)

    expect(result).toBe('/app/error.tsx')
    expect(result).not.toBe('/app/(auth)/error.tsx')
  })

  it('should handle deeply nested routes with sparse boundaries', () => {
    const errors = [
      createErrorBoundary('error.tsx'),
      createErrorBoundary('a/b/error.tsx'),
    ]

    // Route is deeper than any boundary
    const result = resolveErrorBoundary('a/b/c/d/e/page.tsx', errors)

    expect(result).toBe('/app/a/b/error.tsx')
  })
})

// ============================================================================
// resolveNotFoundBoundary Tests
// ============================================================================

describe('resolveNotFoundBoundary', () => {
  it('should return null when no not-found boundaries exist', () => {
    const result = resolveNotFoundBoundary('dashboard/settings/page.tsx', [])
    expect(result).toBeNull()
  })

  it('should resolve root not-found boundary for any route', () => {
    const notFound = [createNotFoundBoundary('not-found.tsx')]

    const result = resolveNotFoundBoundary('dashboard/settings/page.tsx', notFound)

    expect(result).toBe('/app/not-found.tsx')
  })

  it('should resolve closest not-found boundary (closest wins)', () => {
    const notFound = [
      createNotFoundBoundary('not-found.tsx'),
      createNotFoundBoundary('dashboard/not-found.tsx'),
      createNotFoundBoundary('dashboard/settings/not-found.tsx'),
    ]

    const result = resolveNotFoundBoundary('dashboard/settings/page.tsx', notFound)

    // Closest boundary wins
    expect(result).toBe('/app/dashboard/settings/not-found.tsx')
  })

  it('should resolve middle boundary when no closer one exists', () => {
    const notFound = [
      createNotFoundBoundary('not-found.tsx'),
      createNotFoundBoundary('dashboard/not-found.tsx'),
    ]

    const result = resolveNotFoundBoundary('dashboard/settings/page.tsx', notFound)

    // Dashboard boundary is closest available
    expect(result).toBe('/app/dashboard/not-found.tsx')
  })

  it('should resolve root boundary for root level page', () => {
    const notFound = [createNotFoundBoundary('not-found.tsx')]

    const result = resolveNotFoundBoundary('page.tsx', notFound)

    expect(result).toBe('/app/not-found.tsx')
  })

  it('should handle dynamic segments in paths', () => {
    const notFound = [
      createNotFoundBoundary('not-found.tsx'),
      createNotFoundBoundary('users/[id]/not-found.tsx'),
    ]

    const result = resolveNotFoundBoundary('users/[id]/profile/page.tsx', notFound)

    expect(result).toBe('/app/users/[id]/not-found.tsx')
  })

  it('should handle route groups', () => {
    const notFound = [
      createNotFoundBoundary('not-found.tsx'),
      createNotFoundBoundary('(admin)/not-found.tsx'),
    ]

    const result = resolveNotFoundBoundary('(admin)/users/page.tsx', notFound)

    expect(result).toBe('/app/(admin)/not-found.tsx')
  })

  it('should not leak boundaries across route groups', () => {
    const notFound = [
      createNotFoundBoundary('not-found.tsx'),
      createNotFoundBoundary('(auth)/not-found.tsx'),
    ]

    // Marketing route should not pick up auth not-found boundary
    const result = resolveNotFoundBoundary('(marketing)/about/page.tsx', notFound)

    expect(result).toBe('/app/not-found.tsx')
    expect(result).not.toBe('/app/(auth)/not-found.tsx')
  })
})

// ============================================================================
// Edge Case Tests
// ============================================================================

describe('error boundary edge cases', () => {
  it('should handle optional catch-all segments', () => {
    const errors = [
      createErrorBoundary('error.tsx'),
      createErrorBoundary('shop/error.tsx'),
    ]

    const result = resolveErrorBoundary('shop/[[...categories]]/page.tsx', errors)

    expect(result).toBe('/app/shop/error.tsx')
  })

  it('should handle multiple route groups at same level', () => {
    const errors = [
      createErrorBoundary('error.tsx'),
      createErrorBoundary('(marketing)/error.tsx'),
      createErrorBoundary('(auth)/error.tsx'),
    ]

    // Marketing route should only pick up marketing error boundary
    const marketingResult = resolveErrorBoundary('(marketing)/about/page.tsx', errors)
    expect(marketingResult).toBe('/app/(marketing)/error.tsx')

    // Auth route should only pick up auth error boundary
    const authResult = resolveErrorBoundary('(auth)/login/page.tsx', errors)
    expect(authResult).toBe('/app/(auth)/error.tsx')
  })

  it('should handle nested route groups', () => {
    const errors = [
      createErrorBoundary('error.tsx'),
      createErrorBoundary('(admin)/error.tsx'),
      createErrorBoundary('(admin)/(dashboard)/error.tsx'),
    ]

    const result = resolveErrorBoundary('(admin)/(dashboard)/settings/page.tsx', errors)

    expect(result).toBe('/app/(admin)/(dashboard)/error.tsx')
  })

  it('should handle API route files', () => {
    const errors = [
      createErrorBoundary('error.tsx'),
      createErrorBoundary('api/error.tsx'),
    ]

    const result = resolveErrorBoundary('api/users/route.ts', errors)

    expect(result).toBe('/app/api/error.tsx')
  })
})
