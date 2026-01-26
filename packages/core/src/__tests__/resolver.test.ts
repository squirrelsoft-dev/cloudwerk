/**
 * @cloudwerk/core - Resolver Tests
 *
 * Tests for layout and middleware resolution.
 */

import { describe, it, expect } from 'vitest'
import {
  getAncestorDirs,
  resolveLayouts,
  resolveLayoutsWithGroups,
  resolveMiddleware,
  resolveMiddlewareWithGroups,
  resolveRouteContext,
} from '../resolver.js'
import type { ScannedFile } from '../types.js'

// ============================================================================
// Helper Functions
// ============================================================================

function createLayout(relativePath: string): ScannedFile {
  return {
    relativePath,
    absolutePath: `/app/${relativePath}`,
    name: 'layout',
    extension: '.tsx',
    fileType: 'layout',
    isInGroup: relativePath.includes('('),
    groups: [],
  }
}

function createMiddleware(relativePath: string): ScannedFile {
  return {
    relativePath,
    absolutePath: `/app/${relativePath}`,
    name: 'middleware',
    extension: '.ts',
    fileType: 'middleware',
    isInGroup: relativePath.includes('('),
    groups: [],
  }
}

// ============================================================================
// getAncestorDirs Tests
// ============================================================================

describe('getAncestorDirs', () => {
  it('should return root for root level file', () => {
    const result = getAncestorDirs('page.tsx')
    expect(result).toEqual([''])
  })

  it('should return all ancestor directories', () => {
    const result = getAncestorDirs('users/[id]/profile/page.tsx')
    expect(result).toEqual([
      '',
      'users',
      'users/[id]',
      'users/[id]/profile',
    ])
  })

  it('should handle single level nesting', () => {
    const result = getAncestorDirs('about/page.tsx')
    expect(result).toEqual(['', 'about'])
  })

  it('should handle route groups in path', () => {
    const result = getAncestorDirs('(marketing)/about/page.tsx')
    expect(result).toEqual([
      '',
      '(marketing)',
      '(marketing)/about',
    ])
  })
})

// ============================================================================
// resolveLayouts Tests
// ============================================================================

describe('resolveLayouts', () => {
  it('should resolve root layout for root page', () => {
    const layouts = [createLayout('layout.tsx')]

    const result = resolveLayouts('page.tsx', layouts)

    expect(result).toEqual(['/app/layout.tsx'])
  })

  it('should resolve layouts in order from root to closest', () => {
    const layouts = [
      createLayout('layout.tsx'),
      createLayout('dashboard/layout.tsx'),
      createLayout('dashboard/settings/layout.tsx'),
    ]

    const result = resolveLayouts('dashboard/settings/page.tsx', layouts)

    expect(result).toEqual([
      '/app/layout.tsx',
      '/app/dashboard/layout.tsx',
      '/app/dashboard/settings/layout.tsx',
    ])
  })

  it('should skip directories without layouts', () => {
    const layouts = [
      createLayout('layout.tsx'),
      createLayout('dashboard/settings/layout.tsx'),
    ]

    const result = resolveLayouts('dashboard/settings/page.tsx', layouts)

    expect(result).toEqual([
      '/app/layout.tsx',
      '/app/dashboard/settings/layout.tsx',
    ])
  })

  it('should return empty array when no layouts exist', () => {
    const result = resolveLayouts('page.tsx', [])

    expect(result).toEqual([])
  })

  it('should handle deeply nested routes', () => {
    const layouts = [
      createLayout('layout.tsx'),
      createLayout('a/b/c/layout.tsx'),
    ]

    const result = resolveLayouts('a/b/c/d/e/page.tsx', layouts)

    expect(result).toEqual([
      '/app/layout.tsx',
      '/app/a/b/c/layout.tsx',
    ])
  })
})

// ============================================================================
// resolveLayoutsWithGroups Tests
// ============================================================================

describe('resolveLayoutsWithGroups', () => {
  it('should include route group layouts', () => {
    const layouts = [
      createLayout('layout.tsx'),
      createLayout('(marketing)/layout.tsx'),
      createLayout('(marketing)/about/layout.tsx'),
    ]

    const result = resolveLayoutsWithGroups('(marketing)/about/page.tsx', layouts)

    expect(result).toEqual([
      '/app/layout.tsx',
      '/app/(marketing)/layout.tsx',
      '/app/(marketing)/about/layout.tsx',
    ])
  })

  it('should handle nested route groups', () => {
    const layouts = [
      createLayout('layout.tsx'),
      createLayout('(auth)/layout.tsx'),
      createLayout('(auth)/(admin)/layout.tsx'),
    ]

    const result = resolveLayoutsWithGroups('(auth)/(admin)/users/page.tsx', layouts)

    expect(result).toEqual([
      '/app/layout.tsx',
      '/app/(auth)/layout.tsx',
      '/app/(auth)/(admin)/layout.tsx',
    ])
  })
})

// ============================================================================
// resolveMiddleware Tests
// ============================================================================

describe('resolveMiddleware', () => {
  it('should resolve root middleware for any route', () => {
    const middleware = [createMiddleware('middleware.ts')]

    const result = resolveMiddleware('about/page.tsx', middleware)

    expect(result).toEqual(['/app/middleware.ts'])
  })

  it('should resolve middleware in order from root to closest', () => {
    const middleware = [
      createMiddleware('middleware.ts'),
      createMiddleware('dashboard/middleware.ts'),
      createMiddleware('dashboard/settings/middleware.ts'),
    ]

    const result = resolveMiddleware('dashboard/settings/page.tsx', middleware)

    expect(result).toEqual([
      '/app/middleware.ts',
      '/app/dashboard/middleware.ts',
      '/app/dashboard/settings/middleware.ts',
    ])
  })

  it('should skip directories without middleware', () => {
    const middleware = [
      createMiddleware('middleware.ts'),
      createMiddleware('api/middleware.ts'),
    ]

    const result = resolveMiddleware('api/users/[id]/page.tsx', middleware)

    expect(result).toEqual([
      '/app/middleware.ts',
      '/app/api/middleware.ts',
    ])
  })

  it('should return empty array when no middleware exists', () => {
    const result = resolveMiddleware('page.tsx', [])

    expect(result).toEqual([])
  })
})

// ============================================================================
// resolveMiddlewareWithGroups Tests
// ============================================================================

describe('resolveMiddlewareWithGroups', () => {
  it('should include route group middleware', () => {
    const middleware = [
      createMiddleware('middleware.ts'),
      createMiddleware('(auth)/middleware.ts'),
    ]

    const result = resolveMiddlewareWithGroups('(auth)/login/page.tsx', middleware)

    expect(result).toEqual([
      '/app/middleware.ts',
      '/app/(auth)/middleware.ts',
    ])
  })

  it('should handle mixed groups and regular paths', () => {
    const middleware = [
      createMiddleware('middleware.ts'),
      createMiddleware('(admin)/middleware.ts'),
      createMiddleware('(admin)/settings/middleware.ts'),
    ]

    const result = resolveMiddlewareWithGroups('(admin)/settings/page.tsx', middleware)

    expect(result).toEqual([
      '/app/middleware.ts',
      '/app/(admin)/middleware.ts',
      '/app/(admin)/settings/middleware.ts',
    ])
  })
})

// ============================================================================
// resolveRouteContext Tests
// ============================================================================

describe('resolveRouteContext', () => {
  it('should resolve both layouts and middleware', () => {
    const layouts = [
      createLayout('layout.tsx'),
      createLayout('dashboard/layout.tsx'),
    ]
    const middleware = [
      createMiddleware('middleware.ts'),
      createMiddleware('dashboard/middleware.ts'),
    ]

    const result = resolveRouteContext(
      'dashboard/settings/page.tsx',
      layouts,
      middleware
    )

    expect(result).toEqual({
      layouts: [
        '/app/layout.tsx',
        '/app/dashboard/layout.tsx',
      ],
      middleware: [
        '/app/middleware.ts',
        '/app/dashboard/middleware.ts',
      ],
    })
  })

  it('should handle routes with only layouts', () => {
    const layouts = [createLayout('layout.tsx')]
    const middleware: ScannedFile[] = []

    const result = resolveRouteContext('about/page.tsx', layouts, middleware)

    expect(result).toEqual({
      layouts: ['/app/layout.tsx'],
      middleware: [],
    })
  })

  it('should handle routes with only middleware', () => {
    const layouts: ScannedFile[] = []
    const middleware = [createMiddleware('middleware.ts')]

    const result = resolveRouteContext('api/users/route.ts', layouts, middleware)

    expect(result).toEqual({
      layouts: [],
      middleware: ['/app/middleware.ts'],
    })
  })
})

// ============================================================================
// Edge Case Tests
// ============================================================================

describe('resolver edge cases', () => {
  it('should handle root page with no ancestors', () => {
    const layouts = [createLayout('layout.tsx')]

    const result = resolveLayouts('page.tsx', layouts)

    expect(result).toEqual(['/app/layout.tsx'])
  })

  it('should handle dynamic segments in paths', () => {
    const layouts = [
      createLayout('layout.tsx'),
      createLayout('users/[id]/layout.tsx'),
    ]

    const result = resolveLayouts('users/[id]/profile/page.tsx', layouts)

    expect(result).toEqual([
      '/app/layout.tsx',
      '/app/users/[id]/layout.tsx',
    ])
  })

  it('should handle catch-all segments in paths', () => {
    const layouts = [
      createLayout('layout.tsx'),
      createLayout('docs/layout.tsx'),
    ]

    const result = resolveLayouts('docs/[...slug]/page.tsx', layouts)

    expect(result).toEqual([
      '/app/layout.tsx',
      '/app/docs/layout.tsx',
    ])
  })

  it('should handle optional catch-all segments in paths', () => {
    const middleware = [
      createMiddleware('middleware.ts'),
      createMiddleware('shop/middleware.ts'),
    ]

    const result = resolveMiddleware('shop/[[...categories]]/page.tsx', middleware)

    expect(result).toEqual([
      '/app/middleware.ts',
      '/app/shop/middleware.ts',
    ])
  })

  it('should handle multiple route groups at same level', () => {
    const layouts = [
      createLayout('layout.tsx'),
      createLayout('(marketing)/layout.tsx'),
      createLayout('(auth)/layout.tsx'),
    ]

    // Only marketing layout should be included for marketing route
    const marketingResult = resolveLayoutsWithGroups('(marketing)/about/page.tsx', layouts)
    expect(marketingResult).toContain('/app/(marketing)/layout.tsx')
    expect(marketingResult).not.toContain('/app/(auth)/layout.tsx')

    // Only auth layout should be included for auth route
    const authResult = resolveLayoutsWithGroups('(auth)/login/page.tsx', layouts)
    expect(authResult).toContain('/app/(auth)/layout.tsx')
    expect(authResult).not.toContain('/app/(marketing)/layout.tsx')
  })
})
