/**
 * @cloudwerk/core - Compiler Tests
 *
 * Tests for path compilation and route segment parsing.
 */

import { describe, it, expect } from 'vitest'
import {
  parseSegment,
  isRouteGroup,
  filePathToRoutePath,
  calculateRoutePriority,
  sortRoutes,
  compileRoute,
} from '../compiler.js'
import type { RouteEntry, ScannedFile } from '../types.js'

// ============================================================================
// parseSegment Tests
// ============================================================================

describe('parseSegment', () => {
  describe('static segments', () => {
    it('should parse simple static segment', () => {
      expect(parseSegment('users')).toEqual({
        type: 'static',
        value: 'users',
      })
    })

    it('should parse static segment with numbers', () => {
      expect(parseSegment('api2')).toEqual({
        type: 'static',
        value: 'api2',
      })
    })

    it('should parse static segment with hyphen', () => {
      expect(parseSegment('my-page')).toEqual({
        type: 'static',
        value: 'my-page',
      })
    })

    it('should parse static segment with underscore', () => {
      expect(parseSegment('my_page')).toEqual({
        type: 'static',
        value: 'my_page',
      })
    })
  })

  describe('dynamic segments', () => {
    it('should parse simple dynamic segment', () => {
      expect(parseSegment('[id]')).toEqual({
        type: 'dynamic',
        name: 'id',
      })
    })

    it('should parse dynamic segment with underscore', () => {
      expect(parseSegment('[user_id]')).toEqual({
        type: 'dynamic',
        name: 'user_id',
      })
    })

    it('should parse dynamic segment with numbers', () => {
      expect(parseSegment('[id123]')).toEqual({
        type: 'dynamic',
        name: 'id123',
      })
    })
  })

  describe('catch-all segments', () => {
    it('should parse catch-all segment', () => {
      expect(parseSegment('[...path]')).toEqual({
        type: 'catchAll',
        name: 'path',
      })
    })

    it('should parse catch-all with longer name', () => {
      expect(parseSegment('[...slugs]')).toEqual({
        type: 'catchAll',
        name: 'slugs',
      })
    })
  })

  describe('optional catch-all segments', () => {
    it('should parse optional catch-all segment', () => {
      expect(parseSegment('[[...cat]]')).toEqual({
        type: 'optionalCatchAll',
        name: 'cat',
      })
    })

    it('should parse optional catch-all with longer name', () => {
      expect(parseSegment('[[...categories]]')).toEqual({
        type: 'optionalCatchAll',
        name: 'categories',
      })
    })
  })

  describe('route groups', () => {
    it('should return null for route groups', () => {
      expect(parseSegment('(marketing)')).toBeNull()
    })

    it('should return null for complex route group names', () => {
      expect(parseSegment('(auth-group)')).toBeNull()
    })
  })

  describe('invalid segments', () => {
    it('should return null for empty string', () => {
      expect(parseSegment('')).toBeNull()
    })

    it('should return null for whitespace', () => {
      expect(parseSegment('   ')).toBeNull()
    })

    it('should return null for invalid characters', () => {
      expect(parseSegment('page@name')).toBeNull()
    })

    it('should return null for special characters', () => {
      expect(parseSegment('page#1')).toBeNull()
    })
  })
})

// ============================================================================
// isRouteGroup Tests
// ============================================================================

describe('isRouteGroup', () => {
  it('should return true for valid route groups', () => {
    expect(isRouteGroup('(marketing)')).toBe(true)
    expect(isRouteGroup('(auth)')).toBe(true)
    expect(isRouteGroup('(admin_group)')).toBe(true)
    expect(isRouteGroup('(group-name)')).toBe(true)
  })

  it('should return false for non-route groups', () => {
    expect(isRouteGroup('marketing')).toBe(false)
    expect(isRouteGroup('[id]')).toBe(false)
    expect(isRouteGroup('page.tsx')).toBe(false)
    expect(isRouteGroup('()')).toBe(false)
  })
})

// ============================================================================
// filePathToRoutePath Tests
// ============================================================================

describe('filePathToRoutePath', () => {
  describe('basic routes', () => {
    it('should convert index.ts to /', () => {
      const result = filePathToRoutePath('index.ts')
      expect(result).toEqual({
        urlPattern: '/',
        segments: [],
      })
    })

    it('should convert about/page.tsx to /about', () => {
      const result = filePathToRoutePath('about/page.tsx')
      expect(result).toEqual({
        urlPattern: '/about',
        segments: [{ type: 'static', value: 'about' }],
      })
    })

    it('should convert nested static path', () => {
      const result = filePathToRoutePath('blog/posts/page.tsx')
      expect(result).toEqual({
        urlPattern: '/blog/posts',
        segments: [
          { type: 'static', value: 'blog' },
          { type: 'static', value: 'posts' },
        ],
      })
    })
  })

  describe('dynamic routes', () => {
    it('should convert [id] to :id', () => {
      const result = filePathToRoutePath('users/[id]/page.tsx')
      expect(result).toEqual({
        urlPattern: '/users/:id',
        segments: [
          { type: 'static', value: 'users' },
          { type: 'dynamic', name: 'id' },
        ],
      })
    })

    it('should handle multiple dynamic segments', () => {
      const result = filePathToRoutePath('users/[userId]/posts/[postId]/page.tsx')
      expect(result).toEqual({
        urlPattern: '/users/:userId/posts/:postId',
        segments: [
          { type: 'static', value: 'users' },
          { type: 'dynamic', name: 'userId' },
          { type: 'static', value: 'posts' },
          { type: 'dynamic', name: 'postId' },
        ],
      })
    })
  })

  describe('catch-all routes', () => {
    it('should convert [...path] to *path', () => {
      const result = filePathToRoutePath('docs/[...path]/page.tsx')
      expect(result).toEqual({
        urlPattern: '/docs/*path',
        segments: [
          { type: 'static', value: 'docs' },
          { type: 'catchAll', name: 'path' },
        ],
      })
    })
  })

  describe('optional catch-all routes', () => {
    it('should convert [[...cat]] to :cat*', () => {
      const result = filePathToRoutePath('shop/[[...cat]]/page.tsx')
      expect(result).toEqual({
        urlPattern: '/shop/:cat*',
        segments: [
          { type: 'static', value: 'shop' },
          { type: 'optionalCatchAll', name: 'cat' },
        ],
      })
    })
  })

  describe('route groups', () => {
    it('should remove route groups from URL path', () => {
      const result = filePathToRoutePath('(marketing)/about/page.tsx')
      expect(result).toEqual({
        urlPattern: '/about',
        segments: [{ type: 'static', value: 'about' }],
      })
    })

    it('should handle nested route groups', () => {
      const result = filePathToRoutePath('(marketing)/(landing)/home/page.tsx')
      expect(result).toEqual({
        urlPattern: '/home',
        segments: [{ type: 'static', value: 'home' }],
      })
    })

    it('should handle route group at leaf level', () => {
      const result = filePathToRoutePath('dashboard/(overview)/page.tsx')
      expect(result).toEqual({
        urlPattern: '/dashboard',
        segments: [{ type: 'static', value: 'dashboard' }],
      })
    })
  })

  describe('complex routes', () => {
    it('should handle route with groups and dynamic segments', () => {
      const result = filePathToRoutePath('(auth)/users/[id]/profile/page.tsx')
      expect(result).toEqual({
        urlPattern: '/users/:id/profile',
        segments: [
          { type: 'static', value: 'users' },
          { type: 'dynamic', name: 'id' },
          { type: 'static', value: 'profile' },
        ],
      })
    })
  })
})

// ============================================================================
// calculateRoutePriority Tests
// ============================================================================

describe('calculateRoutePriority', () => {
  it('should give static routes lowest priority (highest precedence)', () => {
    const staticPriority = calculateRoutePriority([
      { type: 'static', value: 'users' },
      { type: 'static', value: 'profile' },
    ])

    const dynamicPriority = calculateRoutePriority([
      { type: 'static', value: 'users' },
      { type: 'dynamic', name: 'id' },
    ])

    expect(staticPriority).toBeLessThan(dynamicPriority)
  })

  it('should give catch-all routes high priority (low precedence)', () => {
    const dynamicPriority = calculateRoutePriority([
      { type: 'static', value: 'docs' },
      { type: 'dynamic', name: 'slug' },
    ])

    const catchAllPriority = calculateRoutePriority([
      { type: 'static', value: 'docs' },
      { type: 'catchAll', name: 'path' },
    ])

    expect(dynamicPriority).toBeLessThan(catchAllPriority)
  })

  it('should give optional catch-all routes highest priority (lowest precedence)', () => {
    const catchAllPriority = calculateRoutePriority([
      { type: 'static', value: 'shop' },
      { type: 'catchAll', name: 'path' },
    ])

    const optionalCatchAllPriority = calculateRoutePriority([
      { type: 'static', value: 'shop' },
      { type: 'optionalCatchAll', name: 'cat' },
    ])

    expect(catchAllPriority).toBeLessThan(optionalCatchAllPriority)
  })
})

// ============================================================================
// sortRoutes Tests
// ============================================================================

describe('sortRoutes', () => {
  it('should sort static routes before dynamic routes', () => {
    const routes: RouteEntry[] = [
      {
        urlPattern: '/users/:id',
        filePath: 'users/[id]/page.tsx',
        absolutePath: '/app/users/[id]/page.tsx',
        fileType: 'page',
        segments: [
          { type: 'static', value: 'users' },
          { type: 'dynamic', name: 'id' },
        ],
        layouts: [],
        middleware: [],
        priority: 11,
      },
      {
        urlPattern: '/users/profile',
        filePath: 'users/profile/page.tsx',
        absolutePath: '/app/users/profile/page.tsx',
        fileType: 'page',
        segments: [
          { type: 'static', value: 'users' },
          { type: 'static', value: 'profile' },
        ],
        layouts: [],
        middleware: [],
        priority: 2,
      },
    ]

    const sorted = sortRoutes([...routes])

    expect(sorted[0].urlPattern).toBe('/users/profile')
    expect(sorted[1].urlPattern).toBe('/users/:id')
  })

  it('should sort by segment count when priorities equal', () => {
    const routes: RouteEntry[] = [
      {
        urlPattern: '/a',
        filePath: 'a/page.tsx',
        absolutePath: '/app/a/page.tsx',
        fileType: 'page',
        segments: [{ type: 'static', value: 'a' }],
        layouts: [],
        middleware: [],
        priority: 1,
      },
      {
        urlPattern: '/a/b',
        filePath: 'a/b/page.tsx',
        absolutePath: '/app/a/b/page.tsx',
        fileType: 'page',
        segments: [
          { type: 'static', value: 'a' },
          { type: 'static', value: 'b' },
        ],
        layouts: [],
        middleware: [],
        priority: 1.8,
      },
    ]

    const sorted = sortRoutes([...routes])

    // More specific (more segments) should come first when priorities are close
    expect(sorted[0].urlPattern).toBe('/a')
    expect(sorted[1].urlPattern).toBe('/a/b')
  })
})

// ============================================================================
// compileRoute Tests
// ============================================================================

describe('compileRoute', () => {
  it('should compile a basic route file', () => {
    const file: ScannedFile = {
      relativePath: 'users/page.tsx',
      absolutePath: '/app/users/page.tsx',
      name: 'page',
      extension: '.tsx',
      fileType: 'page',
      isInGroup: false,
      groups: [],
    }

    const result = compileRoute(file, ['/app/layout.tsx'], [])

    expect(result).toEqual({
      urlPattern: '/users',
      filePath: 'users/page.tsx',
      absolutePath: '/app/users/page.tsx',
      fileType: 'page',
      segments: [{ type: 'static', value: 'users' }],
      layouts: ['/app/layout.tsx'],
      middleware: [],
      priority: expect.any(Number),
    })
  })

  it('should compile a dynamic route file', () => {
    const file: ScannedFile = {
      relativePath: 'users/[id]/page.tsx',
      absolutePath: '/app/users/[id]/page.tsx',
      name: 'page',
      extension: '.tsx',
      fileType: 'page',
      isInGroup: false,
      groups: [],
    }

    const result = compileRoute(file, [], ['/app/middleware.ts'])

    expect(result?.urlPattern).toBe('/users/:id')
    expect(result?.middleware).toEqual(['/app/middleware.ts'])
  })

  it('should return null for invalid paths', () => {
    const file: ScannedFile = {
      relativePath: 'invalid@path/page.tsx',
      absolutePath: '/app/invalid@path/page.tsx',
      name: 'page',
      extension: '.tsx',
      fileType: 'page',
      isInGroup: false,
      groups: [],
    }

    const result = compileRoute(file, [], [])

    expect(result).toBeNull()
  })
})
