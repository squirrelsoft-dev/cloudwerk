/**
 * @cloudwerk/cli - Client Component Loader Tests
 *
 * Tests for loading and compiling client components marked with 'use client' directive.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import {
  loadClientComponentModule,
  isClientComponentFile,
  clearClientComponentCache,
  getClientComponentCacheSize,
} from '../loadClientComponent.js'

// ============================================================================
// Test Setup
// ============================================================================

let testDir: string

beforeEach(() => {
  // Create a temporary directory for test files
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudwerk-client-test-'))
  clearClientComponentCache()
})

afterEach(() => {
  // Clean up test directory
  if (testDir && fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true })
  }
  clearClientComponentCache()
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
// loadClientComponentModule Tests - Client Component Detection
// ============================================================================

describe('loadClientComponentModule', () => {
  describe('client component detection', () => {
    it('should load component with "use client" double quotes', async () => {
      const componentPath = createTestFile(
        'components/Counter.tsx',
        `"use client"

export default function Counter() {
  return <div>Count: 0</div>
}`
      )

      const module = await loadClientComponentModule(componentPath, testDir)

      expect(module).not.toBeNull()
      expect(module?.isClientComponent).toBe(true)
      expect(module?.componentId).toBe('components_Counter')
    })

    it("should load component with 'use client' single quotes", async () => {
      const componentPath = createTestFile(
        'components/Toggle.tsx',
        `'use client'

export default function Toggle() {
  return <button>Toggle</button>
}`
      )

      const module = await loadClientComponentModule(componentPath, testDir)

      expect(module).not.toBeNull()
      expect(module?.isClientComponent).toBe(true)
    })

    it('should load component with directive followed by semicolon', async () => {
      const componentPath = createTestFile(
        'components/Button.tsx',
        `"use client";

export default function Button() {
  return <button>Click</button>
}`
      )

      const module = await loadClientComponentModule(componentPath, testDir)

      expect(module).not.toBeNull()
      expect(module?.isClientComponent).toBe(true)
    })

    it('should return null for non-client components', async () => {
      const componentPath = createTestFile(
        'components/ServerOnly.tsx',
        `export default function ServerOnly() {
  return <div>Server rendered only</div>
}`
      )

      const module = await loadClientComponentModule(componentPath, testDir)

      expect(module).toBeNull()
    })

    it('should return null when directive is in string literal', async () => {
      const componentPath = createTestFile(
        'components/FakeClient.tsx',
        `const directive = "use client"

export default function FakeClient() {
  return <div>{directive}</div>
}`
      )

      const module = await loadClientComponentModule(componentPath, testDir)

      expect(module).toBeNull()
    })

    it('should return null when directive is after imports', async () => {
      const componentPath = createTestFile(
        'components/LateDirective.tsx',
        `import { useState } from 'hono/jsx/dom'

"use client"

export default function LateDirective() {
  return <div>Late</div>
}`
      )

      const module = await loadClientComponentModule(componentPath, testDir)

      expect(module).toBeNull()
    })

    it('should detect directive after comments', async () => {
      const componentPath = createTestFile(
        'components/Commented.tsx',
        `// This is a client component
/**
 * Multi-line comment
 */
'use client'

export default function Commented() {
  return <div>Commented</div>
}`
      )

      const module = await loadClientComponentModule(componentPath, testDir)

      expect(module).not.toBeNull()
      expect(module?.isClientComponent).toBe(true)
    })
  })

  // ============================================================================
  // Module Loading Tests
  // ============================================================================

  describe('module loading', () => {
    it('should return module with default export function', async () => {
      const componentPath = createTestFile(
        'components/Simple.tsx',
        `'use client'

export default function Simple() {
  return <span>Simple</span>
}`
      )

      const module = await loadClientComponentModule(componentPath, testDir)

      expect(module).not.toBeNull()
      expect(typeof module?.default).toBe('function')
    })

    it('should include file path in module', async () => {
      const componentPath = createTestFile(
        'components/WithPath.tsx',
        `'use client'

export default function WithPath() {
  return <div>Path</div>
}`
      )

      const module = await loadClientComponentModule(componentPath, testDir)

      expect(module?.filePath).toBe(componentPath)
    })

    it('should generate correct component ID from path', async () => {
      const componentPath = createTestFile(
        'features/auth/LoginButton.tsx',
        `'use client'

export default function LoginButton() {
  return <button>Login</button>
}`
      )

      const module = await loadClientComponentModule(componentPath, testDir)

      expect(module?.componentId).toBe('features_auth_LoginButton')
    })

    it('should throw for component missing default export', async () => {
      const componentPath = createTestFile(
        'components/NoDefault.tsx',
        `'use client'

export function NoDefault() {
  return <div>No default</div>
}`
      )

      await expect(loadClientComponentModule(componentPath, testDir)).rejects.toThrow(
        'default export'
      )
    })

    it('should throw for component with non-function default export', async () => {
      const componentPath = createTestFile(
        'components/NotFunction.tsx',
        `'use client'

const config = { name: 'test' }
export default config`
      )

      await expect(loadClientComponentModule(componentPath, testDir)).rejects.toThrow(
        'default export'
      )
    })
  })

  // ============================================================================
  // JSX Compilation Tests
  // ============================================================================

  describe('JSX compilation', () => {
    it('should compile JSX with hono/jsx import source', async () => {
      const componentPath = createTestFile(
        'components/JsxComponent.tsx',
        `'use client'

export default function JsxComponent() {
  return (
    <div className="container">
      <h1>Title</h1>
      <p>Content</p>
    </div>
  )
}`
      )

      // Should compile without errors
      const module = await loadClientComponentModule(componentPath, testDir)
      expect(module).not.toBeNull()
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

  const handleChange = useCallback((e: any) => {
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

      const module = await loadClientComponentModule(componentPath, testDir)
      expect(module).not.toBeNull()
    })

    it('should handle TypeScript syntax', async () => {
      const componentPath = createTestFile(
        'components/TypedComponent.tsx',
        `'use client'

interface Props {
  name: string
  count?: number
}

export default function TypedComponent({ name, count = 0 }: Props) {
  const message: string = \`Hello, \${name}!\`
  return (
    <div>
      <span>{message}</span>
      <span>Count: {count}</span>
    </div>
  )
}`
      )

      const module = await loadClientComponentModule(componentPath, testDir)
      expect(module).not.toBeNull()
    })

    it('should handle JSX fragments', async () => {
      const componentPath = createTestFile(
        'components/FragmentComponent.tsx',
        `'use client'

export default function FragmentComponent() {
  return (
    <>
      <h1>First</h1>
      <h2>Second</h2>
    </>
  )
}`
      )

      const module = await loadClientComponentModule(componentPath, testDir)
      expect(module).not.toBeNull()
    })
  })

  // ============================================================================
  // Module Cache Tests
  // ============================================================================

  describe('module cache', () => {
    it('should cache compiled modules', async () => {
      const componentPath = createTestFile(
        'components/Cached.tsx',
        `'use client'

export default function Cached() {
  return <div>Cached</div>
}`
      )

      // First load
      await loadClientComponentModule(componentPath, testDir)
      expect(getClientComponentCacheSize()).toBe(1)

      // Second load should use cache
      await loadClientComponentModule(componentPath, testDir)
      expect(getClientComponentCacheSize()).toBe(1)
    })

    it('should invalidate cache when file changes', async () => {
      const componentPath = createTestFile(
        'components/Dynamic.tsx',
        `'use client'

export default function Dynamic() {
  return <div>Version 1</div>
}`
      )

      // First load
      await loadClientComponentModule(componentPath, testDir)

      // Wait and update file
      await new Promise((resolve) => setTimeout(resolve, 100))
      fs.writeFileSync(
        componentPath,
        `'use client'

export default function Dynamic() {
  return <div>Version 2</div>
}`
      )

      // Touch file to update mtime
      const now = new Date()
      fs.utimesSync(componentPath, now, now)

      // Second load should recompile
      const module = await loadClientComponentModule(componentPath, testDir)
      expect(module).not.toBeNull()
    })

    it('should clear cache', async () => {
      const componentPath = createTestFile(
        'components/ToClear.tsx',
        `'use client'

export default function ToClear() {
  return <div>Clear me</div>
}`
      )

      await loadClientComponentModule(componentPath, testDir)
      expect(getClientComponentCacheSize()).toBe(1)

      clearClientComponentCache()
      expect(getClientComponentCacheSize()).toBe(0)
    })

    it('should cache multiple components independently', async () => {
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

      await loadClientComponentModule(component1, testDir)
      await loadClientComponentModule(component2, testDir)

      expect(getClientComponentCacheSize()).toBe(2)
    })
  })

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('error handling', () => {
    it('should throw for syntax errors', async () => {
      const componentPath = createTestFile(
        'components/SyntaxError.tsx',
        `'use client'

export default function SyntaxError() {
  return <div>
}`
      )

      await expect(loadClientComponentModule(componentPath, testDir)).rejects.toThrow()
    })

    it('should include file path in error message', async () => {
      const componentPath = createTestFile(
        'components/ErrorPath.tsx',
        `'use client'

export default function ErrorPath() {
  return <div>
}`
      )

      await expect(loadClientComponentModule(componentPath, testDir)).rejects.toThrow(
        /ErrorPath\.tsx/
      )
    })

    it('should throw for non-existent file', async () => {
      const fakePath = path.join(testDir, 'components/NonExistent.tsx')

      await expect(loadClientComponentModule(fakePath, testDir)).rejects.toThrow()
    })
  })
})

// ============================================================================
// isClientComponentFile Tests
// ============================================================================

describe('isClientComponentFile', () => {
  it('should return true for client component', () => {
    const componentPath = createTestFile(
      'components/IsClient.tsx',
      `'use client'

export default function IsClient() {
  return <div>Client</div>
}`
    )

    expect(isClientComponentFile(componentPath)).toBe(true)
  })

  it('should return false for server component', () => {
    const componentPath = createTestFile(
      'components/IsServer.tsx',
      `export default function IsServer() {
  return <div>Server</div>
}`
    )

    expect(isClientComponentFile(componentPath)).toBe(false)
  })

  it('should return false for non-existent file', () => {
    const fakePath = path.join(testDir, 'components/DoesNotExist.tsx')

    expect(isClientComponentFile(fakePath)).toBe(false)
  })

  it('should handle .jsx extension', () => {
    const componentPath = createTestFile(
      'components/JsxClient.jsx',
      `'use client'

export default function JsxClient() {
  return <div>JSX Client</div>
}`
    )

    expect(isClientComponentFile(componentPath)).toBe(true)
  })

  it('should handle .ts extension', () => {
    const componentPath = createTestFile(
      'components/TsClient.ts',
      `'use client'

export default function TsClient() {
  return { type: 'div', props: {} }
}`
    )

    expect(isClientComponentFile(componentPath)).toBe(true)
  })
})

// ============================================================================
// Cache Management Tests
// ============================================================================

describe('Cache Management', () => {
  it('should start with empty cache', () => {
    expect(getClientComponentCacheSize()).toBe(0)
  })

  it('should report correct cache size after loading', async () => {
    const component1 = createTestFile(
      'components/Cache1.tsx',
      `'use client'
export default function Cache1() { return <div>1</div> }`
    )
    const component2 = createTestFile(
      'components/Cache2.tsx',
      `'use client'
export default function Cache2() { return <div>2</div> }`
    )
    const component3 = createTestFile(
      'components/Cache3.tsx',
      `'use client'
export default function Cache3() { return <div>3</div> }`
    )

    await loadClientComponentModule(component1, testDir)
    expect(getClientComponentCacheSize()).toBe(1)

    await loadClientComponentModule(component2, testDir)
    expect(getClientComponentCacheSize()).toBe(2)

    await loadClientComponentModule(component3, testDir)
    expect(getClientComponentCacheSize()).toBe(3)
  })

  it('should not increase cache size for non-client components', async () => {
    const serverComponent = createTestFile(
      'components/Server.tsx',
      `export default function Server() { return <div>Server</div> }`
    )

    await loadClientComponentModule(serverComponent, testDir)
    expect(getClientComponentCacheSize()).toBe(0)
  })
})
