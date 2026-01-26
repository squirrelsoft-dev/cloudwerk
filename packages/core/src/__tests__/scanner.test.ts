/**
 * @cloudwerk/core - Scanner Tests
 *
 * Tests for file scanning and type detection.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import {
  getFileType,
  isRouteFile,
  isLayoutFile,
  isMiddlewareFile,
  extractRouteGroups,
  hasRouteGroups,
  scanRoutesSync,
} from '../scanner.js'

// ============================================================================
// getFileType Tests
// ============================================================================

describe('getFileType', () => {
  describe('route files', () => {
    it('should identify page.tsx as page', () => {
      expect(getFileType('page.tsx')).toBe('page')
    })

    it('should identify page.ts as page', () => {
      expect(getFileType('page.ts')).toBe('page')
    })

    it('should identify route.ts as route', () => {
      expect(getFileType('route.ts')).toBe('route')
    })

    it('should identify route.tsx as route', () => {
      expect(getFileType('route.tsx')).toBe('route')
    })

    it('should identify index.ts as page', () => {
      expect(getFileType('index.ts')).toBe('page')
    })

    it('should identify index.tsx as page', () => {
      expect(getFileType('index.tsx')).toBe('page')
    })
  })

  describe('layout files', () => {
    it('should identify layout.tsx as layout', () => {
      expect(getFileType('layout.tsx')).toBe('layout')
    })

    it('should identify layout.ts as layout', () => {
      expect(getFileType('layout.ts')).toBe('layout')
    })
  })

  describe('middleware files', () => {
    it('should identify middleware.ts as middleware', () => {
      expect(getFileType('middleware.ts')).toBe('middleware')
    })

    it('should identify middleware.tsx as middleware', () => {
      expect(getFileType('middleware.tsx')).toBe('middleware')
    })
  })

  describe('other special files', () => {
    it('should identify loading.tsx as loading', () => {
      expect(getFileType('loading.tsx')).toBe('loading')
    })

    it('should identify error.tsx as error', () => {
      expect(getFileType('error.tsx')).toBe('error')
    })

    it('should identify not-found.tsx as not-found', () => {
      expect(getFileType('not-found.tsx')).toBe('not-found')
    })
  })

  describe('unsupported files', () => {
    it('should return null for random files', () => {
      expect(getFileType('utils.ts')).toBeNull()
    })

    it('should return null for non-ts/tsx files', () => {
      expect(getFileType('page.css')).toBeNull()
    })

    it('should return null for test files', () => {
      expect(getFileType('page.test.ts')).toBeNull()
    })
  })
})

// ============================================================================
// isRouteFile Tests
// ============================================================================

describe('isRouteFile', () => {
  it('should return true for page files', () => {
    expect(isRouteFile('page.tsx')).toBe(true)
    expect(isRouteFile('page.ts')).toBe(true)
  })

  it('should return true for route files', () => {
    expect(isRouteFile('route.tsx')).toBe(true)
    expect(isRouteFile('route.ts')).toBe(true)
  })

  it('should return false for layout files', () => {
    expect(isRouteFile('layout.tsx')).toBe(false)
  })

  it('should return false for middleware files', () => {
    expect(isRouteFile('middleware.ts')).toBe(false)
  })

  it('should return false for non-route files', () => {
    expect(isRouteFile('utils.ts')).toBe(false)
  })
})

// ============================================================================
// isLayoutFile Tests
// ============================================================================

describe('isLayoutFile', () => {
  it('should return true for layout files', () => {
    expect(isLayoutFile('layout.tsx')).toBe(true)
    expect(isLayoutFile('layout.ts')).toBe(true)
  })

  it('should return false for non-layout files', () => {
    expect(isLayoutFile('page.tsx')).toBe(false)
    expect(isLayoutFile('route.ts')).toBe(false)
  })
})

// ============================================================================
// isMiddlewareFile Tests
// ============================================================================

describe('isMiddlewareFile', () => {
  it('should return true for middleware files', () => {
    expect(isMiddlewareFile('middleware.ts')).toBe(true)
    expect(isMiddlewareFile('middleware.tsx')).toBe(true)
  })

  it('should return false for non-middleware files', () => {
    expect(isMiddlewareFile('page.tsx')).toBe(false)
    expect(isMiddlewareFile('layout.tsx')).toBe(false)
  })
})

// ============================================================================
// extractRouteGroups Tests
// ============================================================================

describe('extractRouteGroups', () => {
  it('should extract single route group', () => {
    expect(extractRouteGroups('(marketing)/about/page.tsx')).toEqual(['marketing'])
  })

  it('should extract multiple route groups', () => {
    expect(extractRouteGroups('(auth)/(admin)/users/page.tsx')).toEqual(['auth', 'admin'])
  })

  it('should return empty array for paths without groups', () => {
    expect(extractRouteGroups('users/profile/page.tsx')).toEqual([])
  })

  it('should handle groups at different nesting levels', () => {
    expect(extractRouteGroups('dashboard/(overview)/settings/page.tsx')).toEqual(['overview'])
  })
})

// ============================================================================
// hasRouteGroups Tests
// ============================================================================

describe('hasRouteGroups', () => {
  it('should return true for paths with route groups', () => {
    expect(hasRouteGroups('(marketing)/page.tsx')).toBe(true)
  })

  it('should return false for paths without route groups', () => {
    expect(hasRouteGroups('users/page.tsx')).toBe(false)
  })
})

// ============================================================================
// scanRoutesSync Tests (with temp directory)
// ============================================================================

describe('scanRoutesSync', () => {
  let tempDir: string

  beforeAll(() => {
    // Create temporary directory structure
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudwerk-test-'))

    // Create test route files
    const files = [
      'page.tsx',
      'layout.tsx',
      'middleware.ts',
      'about/page.tsx',
      'about/layout.tsx',
      'users/[id]/page.tsx',
      'users/[id]/route.ts',
      '(marketing)/landing/page.tsx',
      '(auth)/login/page.tsx',
      'docs/[...path]/page.tsx',
      'shop/[[...cat]]/page.tsx',
    ]

    for (const file of files) {
      const filePath = path.join(tempDir, file)
      fs.mkdirSync(path.dirname(filePath), { recursive: true })
      fs.writeFileSync(filePath, '// test file')
    }
  })

  afterAll(() => {
    // Cleanup temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('should find all route files', () => {
    const result = scanRoutesSync(tempDir, {
      extensions: ['.ts', '.tsx'],
    })

    // Should find page and route files
    expect(result.routes.length).toBeGreaterThanOrEqual(6)
  })

  it('should find layout files', () => {
    const result = scanRoutesSync(tempDir, {
      extensions: ['.ts', '.tsx'],
    })

    expect(result.layouts.length).toBe(2) // root and about
  })

  it('should find middleware files', () => {
    const result = scanRoutesSync(tempDir, {
      extensions: ['.ts', '.tsx'],
    })

    expect(result.middleware.length).toBe(1) // root only
  })

  it('should identify files in route groups', () => {
    const result = scanRoutesSync(tempDir, {
      extensions: ['.ts', '.tsx'],
    })

    const marketingPage = result.routes.find(r =>
      r.relativePath.includes('(marketing)')
    )
    expect(marketingPage).toBeDefined()
    expect(marketingPage?.isInGroup).toBe(true)
    expect(marketingPage?.groups).toContain('marketing')
  })

  it('should handle dynamic segments', () => {
    const result = scanRoutesSync(tempDir, {
      extensions: ['.ts', '.tsx'],
    })

    const dynamicRoute = result.routes.find(r =>
      r.relativePath.includes('[id]')
    )
    expect(dynamicRoute).toBeDefined()
  })

  it('should handle catch-all segments', () => {
    const result = scanRoutesSync(tempDir, {
      extensions: ['.ts', '.tsx'],
    })

    const catchAllRoute = result.routes.find(r =>
      r.relativePath.includes('[...path]')
    )
    expect(catchAllRoute).toBeDefined()
  })

  it('should handle optional catch-all segments', () => {
    const result = scanRoutesSync(tempDir, {
      extensions: ['.ts', '.tsx'],
    })

    const optionalCatchAllRoute = result.routes.find(r =>
      r.relativePath.includes('[[...cat]]')
    )
    expect(optionalCatchAllRoute).toBeDefined()
  })

  it('should ignore node_modules and other excluded paths', () => {
    // Create a node_modules file
    const nmDir = path.join(tempDir, 'node_modules', 'some-package')
    fs.mkdirSync(nmDir, { recursive: true })
    fs.writeFileSync(path.join(nmDir, 'page.tsx'), '// should be ignored')

    const result = scanRoutesSync(tempDir, {
      extensions: ['.ts', '.tsx'],
    })

    const nodeModulesRoute = result.routes.find(r =>
      r.relativePath.includes('node_modules')
    )
    expect(nodeModulesRoute).toBeUndefined()
  })

  it('should ignore test files', () => {
    // Create a test file
    fs.writeFileSync(path.join(tempDir, 'page.test.tsx'), '// test file')

    const result = scanRoutesSync(tempDir, {
      extensions: ['.ts', '.tsx'],
    })

    const testFile = result.routes.find(r =>
      r.relativePath.includes('.test.')
    )
    expect(testFile).toBeUndefined()
  })
})

// ============================================================================
// Edge Case Tests
// ============================================================================

describe('scanner edge cases', () => {
  let tempDir: string

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudwerk-edge-'))
  })

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('should handle empty directory', () => {
    const emptyDir = path.join(tempDir, 'empty')
    fs.mkdirSync(emptyDir, { recursive: true })

    const result = scanRoutesSync(emptyDir, {
      extensions: ['.ts', '.tsx'],
    })

    expect(result.routes).toHaveLength(0)
    expect(result.layouts).toHaveLength(0)
    expect(result.middleware).toHaveLength(0)
  })

  it('should handle deeply nested routes', () => {
    const deepPath = path.join(tempDir, 'a/b/c/d/e/f/page.tsx')
    fs.mkdirSync(path.dirname(deepPath), { recursive: true })
    fs.writeFileSync(deepPath, '// deep file')

    const result = scanRoutesSync(tempDir, {
      extensions: ['.ts', '.tsx'],
    })

    const deepRoute = result.routes.find(r =>
      r.relativePath === 'a/b/c/d/e/f/page.tsx'
    )
    expect(deepRoute).toBeDefined()
  })
})
