/**
 * @cloudwerk/core - Validator Tests
 *
 * Tests for route validation and conflict detection.
 */

import { describe, it, expect } from 'vitest'
import {
  validateRoute,
  detectPageRouteConflicts,
  detectShadowedRoutes,
  validateManifest,
  validateScanResult,
  hasErrors,
  hasWarnings,
  formatErrors,
  formatWarnings,
} from '../validator.js'
import type { RouteEntry, RouteManifest, ScannedFile, ScanResult } from '../types.js'

// ============================================================================
// Helper Functions
// ============================================================================

function createRouteEntry(
  urlPattern: string,
  fileType: 'page' | 'route',
  filePath: string
): RouteEntry {
  return {
    urlPattern,
    filePath,
    absolutePath: `/app/${filePath}`,
    fileType,
    segments: [],
    layouts: [],
    middleware: [],
    priority: 0,
  }
}

function createEmptyManifest(): RouteManifest {
  return {
    routes: [],
    layouts: new Map(),
    middleware: new Map(),
    errors: [],
    warnings: [],
    generatedAt: new Date(),
    rootDir: '/app',
  }
}

function createScannedFile(relativePath: string, fileType: 'page' | 'route'): ScannedFile {
  return {
    relativePath,
    absolutePath: `/app/${relativePath}`,
    name: fileType,
    extension: '.tsx',
    fileType,
    isInGroup: false,
    groups: [],
  }
}

// ============================================================================
// validateRoute Tests
// ============================================================================

describe('validateRoute', () => {
  it('should return empty array for valid route', () => {
    const route: RouteEntry = {
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
      priority: 0,
    }

    const errors = validateRoute(route)
    expect(errors).toHaveLength(0)
  })

  it('should error for empty URL pattern', () => {
    const route: RouteEntry = {
      urlPattern: '',
      filePath: 'page.tsx',
      absolutePath: '/app/page.tsx',
      fileType: 'page',
      segments: [],
      layouts: [],
      middleware: [],
      priority: 0,
    }

    const errors = validateRoute(route)
    expect(errors.some(e => e.type === 'invalid-pattern')).toBe(true)
  })

  it('should error for URL pattern not starting with /', () => {
    const route: RouteEntry = {
      urlPattern: 'users',
      filePath: 'users/page.tsx',
      absolutePath: '/app/users/page.tsx',
      fileType: 'page',
      segments: [{ type: 'static', value: 'users' }],
      layouts: [],
      middleware: [],
      priority: 0,
    }

    const errors = validateRoute(route)
    expect(errors.some(e => e.message.includes('must start with /'))).toBe(true)
  })

  it('should error for multiple catch-all segments', () => {
    const route: RouteEntry = {
      urlPattern: '/docs/*path/*more',
      filePath: 'docs/[...path]/[...more]/page.tsx',
      absolutePath: '/app/docs/[...path]/[...more]/page.tsx',
      fileType: 'page',
      segments: [
        { type: 'static', value: 'docs' },
        { type: 'catchAll', name: 'path' },
        { type: 'catchAll', name: 'more' },
      ],
      layouts: [],
      middleware: [],
      priority: 0,
    }

    const errors = validateRoute(route)
    expect(errors.some(e => e.message.includes('multiple catch-all'))).toBe(true)
  })

  it('should error for catch-all not at end', () => {
    const route: RouteEntry = {
      urlPattern: '/docs/*path/edit',
      filePath: 'docs/[...path]/edit/page.tsx',
      absolutePath: '/app/docs/[...path]/edit/page.tsx',
      fileType: 'page',
      segments: [
        { type: 'static', value: 'docs' },
        { type: 'catchAll', name: 'path' },
        { type: 'static', value: 'edit' },
      ],
      layouts: [],
      middleware: [],
      priority: 0,
    }

    const errors = validateRoute(route)
    expect(errors.some(e => e.message.includes('must be the last segment'))).toBe(true)
  })

  it('should error for duplicate dynamic segment names', () => {
    const route: RouteEntry = {
      urlPattern: '/users/:id/posts/:id',
      filePath: 'users/[id]/posts/[id]/page.tsx',
      absolutePath: '/app/users/[id]/posts/[id]/page.tsx',
      fileType: 'page',
      segments: [
        { type: 'static', value: 'users' },
        { type: 'dynamic', name: 'id' },
        { type: 'static', value: 'posts' },
        { type: 'dynamic', name: 'id' },
      ],
      layouts: [],
      middleware: [],
      priority: 0,
    }

    const errors = validateRoute(route)
    expect(errors.some(e => e.message.includes('duplicate dynamic segment'))).toBe(true)
  })
})

// ============================================================================
// detectPageRouteConflicts Tests
// ============================================================================

describe('detectPageRouteConflicts', () => {
  it('should detect page + route conflict at same path', () => {
    const routes = [
      createRouteEntry('/users', 'page', 'users/page.tsx'),
      createRouteEntry('/users', 'route', 'users/route.ts'),
    ]

    const errors = detectPageRouteConflicts(routes)

    expect(errors).toHaveLength(1)
    expect(errors[0].type).toBe('conflict')
    expect(errors[0].message).toContain('page.tsx and route.ts')
  })

  it('should not error for different paths', () => {
    const routes = [
      createRouteEntry('/users', 'page', 'users/page.tsx'),
      createRouteEntry('/api/users', 'route', 'api/users/route.ts'),
    ]

    const errors = detectPageRouteConflicts(routes)

    expect(errors).toHaveLength(0)
  })

  it('should not error for same type at different paths', () => {
    const routes = [
      createRouteEntry('/about', 'page', 'about/page.tsx'),
      createRouteEntry('/contact', 'page', 'contact/page.tsx'),
    ]

    const errors = detectPageRouteConflicts(routes)

    expect(errors).toHaveLength(0)
  })
})

// ============================================================================
// detectShadowedRoutes Tests
// ============================================================================

describe('detectShadowedRoutes', () => {
  it('should warn about routes that shadow each other', () => {
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
        priority: 0,
      },
      {
        urlPattern: '/users/:id',
        filePath: 'users/[userId]/page.tsx',
        absolutePath: '/app/users/[userId]/page.tsx',
        fileType: 'page',
        segments: [
          { type: 'static', value: 'users' },
          { type: 'dynamic', name: 'userId' },
        ],
        layouts: [],
        middleware: [],
        priority: 0,
      },
    ]

    const warnings = detectShadowedRoutes(routes)

    expect(warnings.length).toBeGreaterThan(0)
    expect(warnings[0].type).toBe('naming-convention')
  })

  it('should not warn about clearly different routes', () => {
    const routes: RouteEntry[] = [
      {
        urlPattern: '/users',
        filePath: 'users/page.tsx',
        absolutePath: '/app/users/page.tsx',
        fileType: 'page',
        segments: [{ type: 'static', value: 'users' }],
        layouts: [],
        middleware: [],
        priority: 0,
      },
      {
        urlPattern: '/posts',
        filePath: 'posts/page.tsx',
        absolutePath: '/app/posts/page.tsx',
        fileType: 'page',
        segments: [{ type: 'static', value: 'posts' }],
        layouts: [],
        middleware: [],
        priority: 0,
      },
    ]

    const warnings = detectShadowedRoutes(routes)

    expect(warnings).toHaveLength(0)
  })
})

// ============================================================================
// validateManifest Tests
// ============================================================================

describe('validateManifest', () => {
  it('should return manifest with no errors for valid routes', () => {
    const manifest: RouteManifest = {
      ...createEmptyManifest(),
      routes: [
        {
          urlPattern: '/users',
          filePath: 'users/page.tsx',
          absolutePath: '/app/users/page.tsx',
          fileType: 'page',
          segments: [{ type: 'static', value: 'users' }],
          layouts: [],
          middleware: [],
          priority: 0,
        },
      ],
    }

    const result = validateManifest(manifest)

    expect(result.errors).toHaveLength(0)
  })

  it('should aggregate all validation errors', () => {
    const manifest: RouteManifest = {
      ...createEmptyManifest(),
      routes: [
        {
          urlPattern: '', // Invalid
          filePath: 'page.tsx',
          absolutePath: '/app/page.tsx',
          fileType: 'page',
          segments: [],
          layouts: [],
          middleware: [],
          priority: 0,
        },
        createRouteEntry('/users', 'page', 'users/page.tsx'),
        createRouteEntry('/users', 'route', 'users/route.ts'), // Conflict
      ],
    }

    const result = validateManifest(manifest)

    expect(result.errors.length).toBeGreaterThan(0)
  })
})

// ============================================================================
// validateScanResult Tests
// ============================================================================

describe('validateScanResult', () => {
  it('should detect page + route in same directory', () => {
    const scanResult: ScanResult = {
      routes: [
        createScannedFile('users/page.tsx', 'page'),
        createScannedFile('users/route.ts', 'route'),
      ],
      layouts: [],
      middleware: [],
      loading: [],
      errors: [],
      notFound: [],
    }

    const errors = validateScanResult(scanResult)

    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].type).toBe('conflict')
  })

  it('should allow page + route in different directories', () => {
    const scanResult: ScanResult = {
      routes: [
        createScannedFile('users/page.tsx', 'page'),
        createScannedFile('api/users/route.ts', 'route'),
      ],
      layouts: [],
      middleware: [],
      loading: [],
      errors: [],
      notFound: [],
    }

    const errors = validateScanResult(scanResult)

    expect(errors).toHaveLength(0)
  })
})

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('hasErrors', () => {
  it('should return true when manifest has errors', () => {
    const manifest: RouteManifest = {
      ...createEmptyManifest(),
      errors: [
        {
          type: 'conflict',
          message: 'Test error',
          files: ['test.ts'],
        },
      ],
    }

    expect(hasErrors(manifest)).toBe(true)
  })

  it('should return false when manifest has no errors', () => {
    const manifest = createEmptyManifest()
    expect(hasErrors(manifest)).toBe(false)
  })
})

describe('hasWarnings', () => {
  it('should return true when manifest has warnings', () => {
    const manifest: RouteManifest = {
      ...createEmptyManifest(),
      warnings: [
        {
          type: 'deep-nesting',
          message: 'Test warning',
          files: ['test.ts'],
        },
      ],
    }

    expect(hasWarnings(manifest)).toBe(true)
  })

  it('should return false when manifest has no warnings', () => {
    const manifest = createEmptyManifest()
    expect(hasWarnings(manifest)).toBe(false)
  })
})

describe('formatErrors', () => {
  it('should format errors for display', () => {
    const errors = [
      {
        type: 'conflict' as const,
        message: 'Conflict between page and route',
        files: ['page.tsx', 'route.ts'],
      },
    ]

    const formatted = formatErrors(errors)

    expect(formatted).toContain('conflict')
    expect(formatted).toContain('Conflict between page and route')
    expect(formatted).toContain('page.tsx')
    expect(formatted).toContain('route.ts')
  })

  it('should return "No errors" for empty array', () => {
    expect(formatErrors([])).toBe('No errors')
  })
})

describe('formatWarnings', () => {
  it('should format warnings for display', () => {
    const warnings = [
      {
        type: 'deep-nesting' as const,
        message: 'Route has deep nesting',
        files: ['deep/path/page.tsx'],
      },
    ]

    const formatted = formatWarnings(warnings)

    expect(formatted).toContain('deep-nesting')
    expect(formatted).toContain('Route has deep nesting')
  })

  it('should return "No warnings" for empty array', () => {
    expect(formatWarnings([])).toBe('No warnings')
  })
})
