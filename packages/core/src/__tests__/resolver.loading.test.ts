/**
 * @cloudwerk/core - Loading Boundary Resolver Tests
 *
 * Tests for loading boundary resolution.
 */

import { describe, it, expect } from 'vitest'
import { resolveLoadingBoundary } from '../resolver.js'
import type { ScannedFile } from '../types.js'

// ============================================================================
// Helper Functions
// ============================================================================

function createLoading(relativePath: string): ScannedFile {
  return {
    relativePath,
    absolutePath: `/app/${relativePath}`,
    name: 'loading',
    extension: '.tsx',
    fileType: 'loading',
    isInGroup: relativePath.includes('('),
    groups: [],
  }
}

// ============================================================================
// resolveLoadingBoundary Tests
// ============================================================================

describe('resolveLoadingBoundary', () => {
  it('should return root loading boundary for root page', () => {
    const loading = [createLoading('loading.tsx')]

    const result = resolveLoadingBoundary('page.tsx', loading)

    expect(result).toBe('/app/loading.tsx')
  })

  it('should return closest loading boundary (nested wins over root)', () => {
    const loading = [
      createLoading('loading.tsx'),
      createLoading('dashboard/loading.tsx'),
    ]

    const result = resolveLoadingBoundary('dashboard/page.tsx', loading)

    expect(result).toBe('/app/dashboard/loading.tsx')
  })

  it('should walk up directories to find nearest boundary', () => {
    const loading = [
      createLoading('loading.tsx'),
      createLoading('dashboard/loading.tsx'),
    ]

    // Page is in dashboard/settings, but loading is in dashboard
    const result = resolveLoadingBoundary('dashboard/settings/page.tsx', loading)

    expect(result).toBe('/app/dashboard/loading.tsx')
  })

  it('should fall back to root when no nested boundary exists', () => {
    const loading = [createLoading('loading.tsx')]

    const result = resolveLoadingBoundary('deeply/nested/path/page.tsx', loading)

    expect(result).toBe('/app/loading.tsx')
  })

  it('should return null when no loading boundaries exist', () => {
    const result = resolveLoadingBoundary('page.tsx', [])

    expect(result).toBeNull()
  })

  it('should return null when no boundary covers the path', () => {
    // Loading only exists in a different branch
    const loading = [createLoading('other/loading.tsx')]

    const result = resolveLoadingBoundary('dashboard/page.tsx', loading)

    expect(result).toBeNull()
  })

  it('should handle deeply nested boundaries', () => {
    const loading = [
      createLoading('loading.tsx'),
      createLoading('a/loading.tsx'),
      createLoading('a/b/loading.tsx'),
      createLoading('a/b/c/loading.tsx'),
    ]

    const result = resolveLoadingBoundary('a/b/c/d/e/page.tsx', loading)

    // Should find a/b/c/loading.tsx (closest)
    expect(result).toBe('/app/a/b/c/loading.tsx')
  })

  it('should handle route groups in paths', () => {
    const loading = [
      createLoading('loading.tsx'),
      createLoading('(marketing)/loading.tsx'),
    ]

    const result = resolveLoadingBoundary('(marketing)/about/page.tsx', loading)

    expect(result).toBe('/app/(marketing)/loading.tsx')
  })

  it('should handle dynamic segments in paths', () => {
    const loading = [
      createLoading('loading.tsx'),
      createLoading('users/[id]/loading.tsx'),
    ]

    const result = resolveLoadingBoundary('users/[id]/profile/page.tsx', loading)

    expect(result).toBe('/app/users/[id]/loading.tsx')
  })

  it('should handle catch-all segments in paths', () => {
    const loading = [
      createLoading('loading.tsx'),
      createLoading('docs/loading.tsx'),
    ]

    const result = resolveLoadingBoundary('docs/[...slug]/page.tsx', loading)

    expect(result).toBe('/app/docs/loading.tsx')
  })

  it('should prefer more specific boundary over general', () => {
    const loading = [
      createLoading('loading.tsx'),
      createLoading('dashboard/loading.tsx'),
      createLoading('dashboard/settings/loading.tsx'),
    ]

    const result = resolveLoadingBoundary('dashboard/settings/page.tsx', loading)

    // settings/ loading should win over dashboard/ loading
    expect(result).toBe('/app/dashboard/settings/loading.tsx')
  })
})
