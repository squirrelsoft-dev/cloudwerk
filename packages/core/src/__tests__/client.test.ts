/**
 * @cloudwerk/core - Client Utilities Tests
 *
 * Tests for 'use client' directive detection and client component utilities.
 */

import { describe, it, expect } from 'vitest'
import {
  hasUseClientDirective,
  generateComponentId,
  serializeProps,
  deserializeProps,
  createHydrationManifest,
  addToHydrationManifest,
  serializeHydrationManifest,
} from '../client.js'

// ============================================================================
// hasUseClientDirective Tests
// ============================================================================

describe('hasUseClientDirective', () => {
  it('should detect "use client" with double quotes', () => {
    const code = `"use client"

export default function Counter() {
  return <button>Count: 0</button>
}`
    expect(hasUseClientDirective(code)).toBe(true)
  })

  it('should detect \'use client\' with single quotes', () => {
    const code = `'use client'

export default function Counter() {
  return <button>Count: 0</button>
}`
    expect(hasUseClientDirective(code)).toBe(true)
  })

  it('should detect directive with semicolon', () => {
    const code = `"use client";

export default function Counter() {
  return <button>Count: 0</button>
}`
    expect(hasUseClientDirective(code)).toBe(true)
  })

  it('should detect directive with leading whitespace', () => {
    const code = `  "use client"

export default function Counter() {
  return <button>Count: 0</button>
}`
    expect(hasUseClientDirective(code)).toBe(true)
  })

  it('should detect directive after single-line comments', () => {
    const code = `// This is a client component
"use client"

export default function Counter() {
  return <button>Count: 0</button>
}`
    expect(hasUseClientDirective(code)).toBe(true)
  })

  it('should detect directive after multi-line comments', () => {
    const code = `/**
 * Counter component
 * @module Counter
 */
"use client"

export default function Counter() {
  return <button>Count: 0</button>
}`
    expect(hasUseClientDirective(code)).toBe(true)
  })

  it('should return false for files without directive', () => {
    const code = `export default function ServerComponent() {
  return <div>Server rendered</div>
}`
    expect(hasUseClientDirective(code)).toBe(false)
  })

  it('should return false for directive in string literal', () => {
    const code = `const directive = "use client"

export default function Component() {
  return <div>{directive}</div>
}`
    expect(hasUseClientDirective(code)).toBe(false)
  })

  it('should return false for directive after code', () => {
    const code = `import React from 'react'

"use client"

export default function Component() {
  return <div>Hello</div>
}`
    expect(hasUseClientDirective(code)).toBe(false)
  })
})

// ============================================================================
// generateComponentId Tests
// ============================================================================

describe('generateComponentId', () => {
  it('should generate ID from file path', () => {
    const id = generateComponentId('/app/components/Counter.tsx', '/app')
    expect(id).toBe('components_Counter')
  })

  it('should handle nested paths', () => {
    const id = generateComponentId('/app/features/auth/LoginButton.tsx', '/app')
    expect(id).toBe('features_auth_LoginButton')
  })

  it('should handle dynamic route segments', () => {
    const id = generateComponentId('/app/[id]/components/ItemCard.tsx', '/app')
    expect(id).toBe('_id__components_ItemCard')
  })

  it('should handle route groups', () => {
    const id = generateComponentId('/app/(auth)/login/LoginForm.tsx', '/app')
    expect(id).toBe('_auth__login_LoginForm')
  })

  it('should handle different extensions', () => {
    const tsx = generateComponentId('/app/components/Button.tsx', '/app')
    const jsx = generateComponentId('/app/components/Button.jsx', '/app')
    const ts = generateComponentId('/app/components/Button.ts', '/app')
    const js = generateComponentId('/app/components/Button.js', '/app')

    expect(tsx).toBe('components_Button')
    expect(jsx).toBe('components_Button')
    expect(ts).toBe('components_Button')
    expect(js).toBe('components_Button')
  })

  it('should handle Windows-style paths', () => {
    const id = generateComponentId('C:\\app\\components\\Counter.tsx', 'C:\\app')
    expect(id).toBe('components_Counter')
  })
})

// ============================================================================
// Props Serialization Tests
// ============================================================================

describe('serializeProps', () => {
  it('should serialize simple props', () => {
    const props = { count: 0, label: 'Click me' }
    const json = serializeProps(props)
    expect(json).toBe('{"count":0,"label":"Click me"}')
  })

  it('should filter out children', () => {
    const props = { count: 0, children: '<div>Child</div>' }
    const json = serializeProps(props)
    expect(json).toBe('{"count":0}')
    expect(json).not.toContain('children')
  })

  it('should filter out functions', () => {
    const props = { count: 0, onClick: () => {} }
    const json = serializeProps(props)
    expect(json).toBe('{"count":0}')
    expect(json).not.toContain('onClick')
  })

  it('should filter out symbols', () => {
    const props = { count: 0, [Symbol('test')]: 'value' }
    const json = serializeProps(props)
    expect(json).toBe('{"count":0}')
  })

  it('should filter out undefined values', () => {
    const props = { count: 0, optional: undefined }
    const json = serializeProps(props)
    expect(json).toBe('{"count":0}')
  })

  it('should keep null values', () => {
    const props = { count: 0, nullable: null }
    const json = serializeProps(props)
    expect(json).toBe('{"count":0,"nullable":null}')
  })

  it('should serialize nested objects', () => {
    const props = { user: { name: 'John', age: 30 } }
    const json = serializeProps(props)
    expect(json).toBe('{"user":{"name":"John","age":30}}')
  })

  it('should serialize arrays', () => {
    const props = { items: [1, 2, 3] }
    const json = serializeProps(props)
    expect(json).toBe('{"items":[1,2,3]}')
  })
})

describe('deserializeProps', () => {
  it('should deserialize props', () => {
    const json = '{"count":0,"label":"Click me"}'
    const props = deserializeProps(json)
    expect(props).toEqual({ count: 0, label: 'Click me' })
  })

  it('should throw on invalid JSON', () => {
    expect(() => deserializeProps('invalid')).toThrow('Failed to deserialize props')
  })
})

// ============================================================================
// Hydration Manifest Tests
// ============================================================================

describe('createHydrationManifest', () => {
  it('should create empty manifest with default base path', () => {
    const manifest = createHydrationManifest()
    expect(manifest.components.size).toBe(0)
    expect(manifest.basePath).toBe('/__cloudwerk')
    expect(manifest.generatedAt).toBeInstanceOf(Date)
  })

  it('should create manifest with custom base path', () => {
    const manifest = createHydrationManifest('/client')
    expect(manifest.basePath).toBe('/client')
  })
})

describe('addToHydrationManifest', () => {
  it('should add component to manifest', () => {
    const manifest = createHydrationManifest()
    addToHydrationManifest(
      manifest,
      {
        filePath: '/app/components/Counter.tsx',
        componentId: 'components_Counter',
        exportName: 'default',
      },
      '/__cloudwerk/components_Counter.js'
    )

    expect(manifest.components.size).toBe(1)
    expect(manifest.components.has('components_Counter')).toBe(true)

    const meta = manifest.components.get('components_Counter')
    expect(meta?.bundlePath).toBe('/__cloudwerk/components_Counter.js')
    expect(meta?.sourceFile).toBe('/app/components/Counter.tsx')
  })

  it('should add multiple components', () => {
    const manifest = createHydrationManifest()

    addToHydrationManifest(
      manifest,
      { filePath: '/app/components/Counter.tsx', componentId: 'Counter', exportName: 'default' },
      '/__cloudwerk/Counter.js'
    )
    addToHydrationManifest(
      manifest,
      { filePath: '/app/components/Toggle.tsx', componentId: 'Toggle', exportName: 'default' },
      '/__cloudwerk/Toggle.js'
    )

    expect(manifest.components.size).toBe(2)
  })
})

describe('serializeHydrationManifest', () => {
  it('should serialize manifest to JSON', () => {
    const manifest = createHydrationManifest()
    addToHydrationManifest(
      manifest,
      { filePath: '/app/components/Counter.tsx', componentId: 'Counter', exportName: 'default' },
      '/__cloudwerk/Counter.js'
    )

    const json = serializeHydrationManifest(manifest)
    const parsed = JSON.parse(json)

    expect(parsed.basePath).toBe('/__cloudwerk')
    expect(parsed.components.Counter).toBeDefined()
    expect(parsed.components.Counter.bundlePath).toBe('/__cloudwerk/Counter.js')
  })
})
