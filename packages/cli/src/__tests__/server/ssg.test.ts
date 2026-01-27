/**
 * Tests for SSG helper functions.
 */

import { describe, it, expect } from 'vitest'
import type { RouteManifest, RouteEntry, RouteSegment } from '@cloudwerk/core'

import {
  getStaticRoutes,
  hasDynamicSegments,
  interpolatePath,
  urlPathToOutputFile,
} from '../../server/ssg.js'

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockRoute(overrides: Partial<RouteEntry> = {}): RouteEntry {
  return {
    urlPattern: '/',
    filePath: 'page.tsx',
    absolutePath: '/app/page.tsx',
    fileType: 'page',
    segments: [{ type: 'static', value: '' }],
    layouts: [],
    middleware: [],
    priority: 100,
    ...overrides,
  }
}

function createMockManifest(routes: RouteEntry[]): RouteManifest {
  return {
    routes,
    layouts: new Map(),
    middleware: new Map(),
    errors: [],
    warnings: [],
    generatedAt: new Date(),
    rootDir: '/app',
  }
}

// ============================================================================
// getStaticRoutes Tests
// ============================================================================

describe('getStaticRoutes', () => {
  it('should return empty array when no static routes exist', () => {
    const manifest = createMockManifest([
      createMockRoute({ urlPattern: '/' }),
      createMockRoute({ urlPattern: '/about' }),
    ])

    const result = getStaticRoutes(manifest)

    expect(result).toEqual([])
  })

  it('should return routes with rendering: static config', () => {
    const staticRoute = createMockRoute({
      urlPattern: '/about',
      config: { rendering: 'static' },
    })
    const ssrRoute = createMockRoute({
      urlPattern: '/dashboard',
      config: { rendering: 'ssr' },
    })
    const noConfigRoute = createMockRoute({ urlPattern: '/' })

    const manifest = createMockManifest([staticRoute, ssrRoute, noConfigRoute])

    const result = getStaticRoutes(manifest)

    expect(result).toHaveLength(1)
    expect(result[0]).toBe(staticRoute)
  })

  it('should exclude API routes (route.ts) even with static config', () => {
    const apiRoute = createMockRoute({
      urlPattern: '/api/health',
      fileType: 'route',
      config: { rendering: 'static' },
    })
    const pageRoute = createMockRoute({
      urlPattern: '/about',
      fileType: 'page',
      config: { rendering: 'static' },
    })

    const manifest = createMockManifest([apiRoute, pageRoute])

    const result = getStaticRoutes(manifest)

    expect(result).toHaveLength(1)
    expect(result[0].fileType).toBe('page')
  })

  it('should return multiple static routes', () => {
    const routes = [
      createMockRoute({ urlPattern: '/about', config: { rendering: 'static' } }),
      createMockRoute({ urlPattern: '/contact', config: { rendering: 'static' } }),
      createMockRoute({ urlPattern: '/faq', config: { rendering: 'static' } }),
    ]

    const manifest = createMockManifest(routes)

    const result = getStaticRoutes(manifest)

    expect(result).toHaveLength(3)
  })
})

// ============================================================================
// hasDynamicSegments Tests
// ============================================================================

describe('hasDynamicSegments', () => {
  it('should return false for static-only segments', () => {
    const segments: RouteSegment[] = [
      { type: 'static', value: 'about' },
      { type: 'static', value: 'team' },
    ]

    expect(hasDynamicSegments(segments)).toBe(false)
  })

  it('should return true for dynamic segments', () => {
    const segments: RouteSegment[] = [
      { type: 'static', value: 'users' },
      { type: 'dynamic', name: 'id' },
    ]

    expect(hasDynamicSegments(segments)).toBe(true)
  })

  it('should return true for catch-all segments', () => {
    const segments: RouteSegment[] = [
      { type: 'static', value: 'docs' },
      { type: 'catchAll', name: 'path' },
    ]

    expect(hasDynamicSegments(segments)).toBe(true)
  })

  it('should return true for optional catch-all segments', () => {
    const segments: RouteSegment[] = [
      { type: 'static', value: 'shop' },
      { type: 'optionalCatchAll', name: 'category' },
    ]

    expect(hasDynamicSegments(segments)).toBe(true)
  })

  it('should return false for empty segments array', () => {
    expect(hasDynamicSegments([])).toBe(false)
  })
})

// ============================================================================
// interpolatePath Tests
// ============================================================================

describe('interpolatePath', () => {
  it('should return pattern unchanged when no params', () => {
    const result = interpolatePath('/about', {})

    expect(result).toBe('/about')
  })

  it('should replace single dynamic segment', () => {
    const result = interpolatePath('/users/:id', { id: '123' })

    expect(result).toBe('/users/123')
  })

  it('should replace multiple dynamic segments', () => {
    const result = interpolatePath('/users/:userId/posts/:postId', {
      userId: '123',
      postId: 'abc',
    })

    expect(result).toBe('/users/123/posts/abc')
  })

  it('should encode special characters in param values', () => {
    const result = interpolatePath('/posts/:slug', { slug: 'hello world' })

    expect(result).toBe('/posts/hello%20world')
  })

  it('should handle catch-all segments with * prefix', () => {
    const result = interpolatePath('/docs/*path', { path: 'getting-started' })

    expect(result).toBe('/docs/getting-started')
  })

  it('should not modify unreplaced segments', () => {
    const result = interpolatePath('/users/:id/settings', { id: '123' })

    expect(result).toBe('/users/123/settings')
  })
})

// ============================================================================
// urlPathToOutputFile Tests
// ============================================================================

describe('urlPathToOutputFile', () => {
  it('should convert root path to index.html', () => {
    expect(urlPathToOutputFile('/')).toBe('index.html')
    expect(urlPathToOutputFile('')).toBe('index.html')
  })

  it('should add index.html for directory paths', () => {
    expect(urlPathToOutputFile('/about')).toBe('about/index.html')
  })

  it('should handle nested paths', () => {
    expect(urlPathToOutputFile('/posts/hello-world')).toBe(
      'posts/hello-world/index.html'
    )
  })

  it('should handle deeply nested paths', () => {
    expect(urlPathToOutputFile('/docs/api/reference/types')).toBe(
      'docs/api/reference/types/index.html'
    )
  })

  it('should handle paths without leading slash', () => {
    expect(urlPathToOutputFile('about')).toBe('about/index.html')
  })
})
