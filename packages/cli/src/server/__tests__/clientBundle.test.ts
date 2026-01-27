/**
 * @cloudwerk/cli - Client Bundle Tests
 *
 * Tests for client-side bundle generation for 'use client' components.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import {
  generateBundleOnDemand,
  clearBundleCache,
  getBundleCacheSize,
  isBundleCached,
} from '../clientBundle.js'

// ============================================================================
// Test Setup
// ============================================================================

let testDir: string

beforeEach(() => {
  // Create a temporary directory for test files
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudwerk-test-'))
  clearBundleCache()
})

afterEach(() => {
  // Clean up test directory
  if (testDir && fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true })
  }
  clearBundleCache()
})

/**
 * Helper to create a test file.
 */
function createTestFile(relativePath: string, content: string): string {
  const fullPath = path.join(testDir, relativePath)
  const dir = path.dirname(fullPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(fullPath, content)
  return fullPath
}

// ============================================================================
// generateBundleOnDemand Tests
// ============================================================================

describe('generateBundleOnDemand', () => {
  it('should generate bundle for a simple client component', async () => {
    const componentPath = createTestFile(
      'components/Counter.tsx',
      `'use client'

import { useState } from 'hono/jsx/dom'

export default function Counter() {
  const [count, setCount] = useState(0)
  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  )
}`
    )

    const result = await generateBundleOnDemand(componentPath, testDir)

    expect(result.componentId).toBe('components_Counter')
    expect(result.content).toContain('useState')
    expect(result.content).toContain('Count:')
  })

  it('should generate consistent component IDs', async () => {
    const componentPath = createTestFile(
      'features/auth/LoginButton.tsx',
      `'use client'

export default function LoginButton() {
  return <button>Login</button>
}`
    )

    const result = await generateBundleOnDemand(componentPath, testDir)

    expect(result.componentId).toBe('features_auth_LoginButton')
  })

  it('should cache generated bundles', async () => {
    const componentPath = createTestFile(
      'components/Button.tsx',
      `'use client'

export default function Button() {
  return <button>Click me</button>
}`
    )

    // First generation
    await generateBundleOnDemand(componentPath, testDir)
    expect(getBundleCacheSize()).toBe(1)
    expect(isBundleCached(componentPath)).toBe(true)

    // Second generation should use cache
    const result2 = await generateBundleOnDemand(componentPath, testDir)
    expect(getBundleCacheSize()).toBe(1)
    expect(result2.componentId).toBe('components_Button')
  })

  it('should invalidate cache when file changes', async () => {
    const componentPath = createTestFile(
      'components/Dynamic.tsx',
      `'use client'

export default function Dynamic() {
  return <div>Version 1</div>
}`
    )

    // First generation
    const result1 = await generateBundleOnDemand(componentPath, testDir)
    expect(result1.content).toContain('Version 1')

    // Wait a moment and update the file
    await new Promise((resolve) => setTimeout(resolve, 100))
    fs.writeFileSync(
      componentPath,
      `'use client'

export default function Dynamic() {
  return <div>Version 2</div>
}`
    )

    // Touch the file to update mtime
    const now = new Date()
    fs.utimesSync(componentPath, now, now)

    // Second generation should regenerate
    const result2 = await generateBundleOnDemand(componentPath, testDir)
    expect(result2.content).toContain('Version 2')
  })

  it('should handle components with hooks', async () => {
    const componentPath = createTestFile(
      'components/HooksComponent.tsx',
      `'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useId } from 'hono/jsx/dom'

export default function HooksComponent() {
  const [value, setValue] = useState('')
  const id = useId()
  const inputRef = useRef(null)

  const handleChange = useCallback((e) => {
    setValue(e.target.value)
  }, [])

  const doubled = useMemo(() => value + value, [value])

  useEffect(() => {
    console.log('Mounted')
    return () => console.log('Unmounted')
  }, [])

  return (
    <div>
      <input id={id} ref={inputRef} value={value} onChange={handleChange} />
      <span>{doubled}</span>
    </div>
  )
}`
    )

    const result = await generateBundleOnDemand(componentPath, testDir)

    expect(result.content).toContain('useState')
    expect(result.content).toContain('useEffect')
    expect(result.content).toContain('useCallback')
    expect(result.content).toContain('useMemo')
    expect(result.content).toContain('useRef')
    expect(result.content).toContain('useId')
  })

  it('should generate ES modules', async () => {
    const componentPath = createTestFile(
      'components/EsmComponent.tsx',
      `'use client'

export default function EsmComponent() {
  return <div>ESM</div>
}`
    )

    const result = await generateBundleOnDemand(componentPath, testDir)

    // Check for ESM export syntax
    expect(result.content).toContain('export')
  })

  it('should handle errors gracefully', async () => {
    const componentPath = createTestFile(
      'components/Invalid.tsx',
      `'use client'

export default function Invalid() {
  // Syntax error - missing closing tag
  return <div>
}`
    )

    await expect(generateBundleOnDemand(componentPath, testDir)).rejects.toThrow()
  })
})

// ============================================================================
// Cache Management Tests
// ============================================================================

describe('Bundle Cache', () => {
  it('should start with empty cache', () => {
    expect(getBundleCacheSize()).toBe(0)
  })

  it('should clear cache', async () => {
    const componentPath = createTestFile(
      'components/Cached.tsx',
      `'use client'

export default function Cached() {
  return <div>Cached</div>
}`
    )

    await generateBundleOnDemand(componentPath, testDir)
    expect(getBundleCacheSize()).toBe(1)

    clearBundleCache()
    expect(getBundleCacheSize()).toBe(0)
    expect(isBundleCached(componentPath)).toBe(false)
  })

  it('should track multiple cached components', async () => {
    const component1 = createTestFile(
      'components/A.tsx',
      `'use client'
export default function A() { return <div>A</div> }`
    )
    const component2 = createTestFile(
      'components/B.tsx',
      `'use client'
export default function B() { return <div>B</div> }`
    )
    const component3 = createTestFile(
      'components/C.tsx',
      `'use client'
export default function C() { return <div>C</div> }`
    )

    await generateBundleOnDemand(component1, testDir)
    await generateBundleOnDemand(component2, testDir)
    await generateBundleOnDemand(component3, testDir)

    expect(getBundleCacheSize()).toBe(3)
    expect(isBundleCached(component1)).toBe(true)
    expect(isBundleCached(component2)).toBe(true)
    expect(isBundleCached(component3)).toBe(true)
  })
})
