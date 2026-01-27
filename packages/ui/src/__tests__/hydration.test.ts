/**
 * @cloudwerk/ui - Hydration Utilities Tests
 *
 * Tests for server-side hydration helpers including wrapping components
 * with hydration metadata and generating client-side bootstrap scripts.
 */

import { describe, it, expect } from 'vitest'
import {
  wrapForHydration,
  generateHydrationScript,
  generatePreloadHints,
  generateHydrationRuntime,
  generateReactHydrationRuntime,
  generateReactHydrationScript,
} from '../hydration.js'
import { createHydrationManifest, addToHydrationManifest } from '@cloudwerk/core'

// ============================================================================
// wrapForHydration Tests
// ============================================================================

describe('wrapForHydration', () => {
  it('should wrap HTML with hydration attributes', () => {
    const html = '<button>Count: 0</button>'
    const result = wrapForHydration(html, {
      componentId: 'components_Counter',
      props: { initialCount: 0 },
    })

    expect(result).toContain('data-hydrate-id="components_Counter"')
    expect(result).toContain('<button>Count: 0</button>')
    expect(result).toMatch(/^<div.*>.*<\/div>$/)
  })

  it('should serialize props correctly', () => {
    const html = '<div>Test</div>'
    const result = wrapForHydration(html, {
      componentId: 'test_Component',
      props: { name: 'John', age: 30 },
    })

    // Props should be serialized and escaped for HTML attribute
    expect(result).toContain('data-hydrate-props=')
    // The props should contain the serialized values (escaped)
    expect(result).toMatch(/data-hydrate-props="[^"]*name[^"]*"/)
    expect(result).toMatch(/data-hydrate-props="[^"]*John[^"]*"/)
  })

  it('should escape HTML special characters in props', () => {
    const html = '<span>Hello</span>'
    const result = wrapForHydration(html, {
      componentId: 'test_XSS',
      props: { text: '<script>alert("xss")</script>' },
    })

    // Should NOT contain unescaped script tags
    expect(result).not.toContain('<script>')
    expect(result).not.toContain('</script>')
    // Should contain escaped versions
    expect(result).toContain('&lt;script&gt;')
    expect(result).toContain('&lt;/script&gt;')
  })

  it('should escape double quotes in props', () => {
    const html = '<div>Content</div>'
    const result = wrapForHydration(html, {
      componentId: 'test_Quotes',
      props: { text: 'Say "Hello"' },
    })

    // Double quotes should be escaped as &quot;
    expect(result).toContain('&quot;')
    // The result should be a valid HTML attribute (no unescaped quotes breaking out)
    expect(result).toMatch(/data-hydrate-props="[^"]*"/)
    // The content should include Hello
    expect(result).toContain('Hello')
  })

  it('should escape single quotes in props', () => {
    const html = '<div>Content</div>'
    const result = wrapForHydration(html, {
      componentId: 'test_SingleQuotes',
      props: { text: "It's working" },
    })

    // Single quotes should be escaped as &#39;
    expect(result).toContain('&#39;')
  })

  it('should escape ampersands in props', () => {
    const html = '<div>Content</div>'
    const result = wrapForHydration(html, {
      componentId: 'test_Ampersand',
      props: { text: 'Tom & Jerry' },
    })

    // Ampersands should be escaped as &amp;
    expect(result).toContain('&amp;')
  })

  it('should use custom wrapper tag', () => {
    const html = '<span>Inline content</span>'
    const result = wrapForHydration(html, {
      componentId: 'test_Span',
      props: {},
      wrapperTag: 'span',
    })

    expect(result).toMatch(/^<span.*>.*<\/span>$/)
    expect(result).not.toContain('<div')
  })

  it('should handle empty props', () => {
    const html = '<div>No props</div>'
    const result = wrapForHydration(html, {
      componentId: 'test_Empty',
      props: {},
    })

    expect(result).toContain('data-hydrate-props="{}"')
  })

  it('should filter out functions from props', () => {
    const html = '<button>Click</button>'
    const result = wrapForHydration(html, {
      componentId: 'test_Functions',
      props: {
        label: 'Click me',
        onClick: () => console.log('clicked'),
      },
    })

    // Should contain label but not onClick
    expect(result).toContain('label')
    expect(result).not.toContain('onClick')
  })

  it('should filter out children from props', () => {
    const html = '<div>Wrapped content</div>'
    const result = wrapForHydration(html, {
      componentId: 'test_Children',
      props: {
        title: 'Title',
        children: '<span>Child content</span>',
      },
    })

    // Should contain title in the props
    expect(result).toContain('title')
    // The serialized props should not contain "children" key - check the data-hydrate-props attribute
    // Extract the props attribute value to verify children is filtered
    const propsMatch = result.match(/data-hydrate-props="([^"]*)"/)
    expect(propsMatch).not.toBeNull()
    const propsJson = propsMatch![1]
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
    const props = JSON.parse(propsJson)
    expect(props).toHaveProperty('title')
    expect(props).not.toHaveProperty('children')
  })

  it('should handle nested objects in props', () => {
    const html = '<div>User card</div>'
    const result = wrapForHydration(html, {
      componentId: 'test_Nested',
      props: {
        user: { name: 'John', address: { city: 'NYC' } },
      },
    })

    expect(result).toContain('user')
    expect(result).toContain('John')
    expect(result).toContain('NYC')
  })

  it('should handle arrays in props', () => {
    const html = '<ul>List</ul>'
    const result = wrapForHydration(html, {
      componentId: 'test_Array',
      props: {
        items: [1, 2, 3],
      },
    })

    expect(result).toContain('items')
    expect(result).toContain('[1,2,3]')
  })
})

// ============================================================================
// escapeHtmlAttribute Edge Cases (via wrapForHydration)
// ============================================================================

describe('escapeHtmlAttribute (XSS prevention)', () => {
  it('should prevent attribute injection attacks', () => {
    const html = '<div>Safe</div>'
    const result = wrapForHydration(html, {
      componentId: 'test_Injection',
      props: { evil: '" onclick="alert(1)"' },
    })

    // Should not have unescaped quotes that would break out of attribute
    expect(result).not.toMatch(/onclick="alert/)
    expect(result).toContain('&quot;')
  })

  it('should escape all dangerous characters together', () => {
    const html = '<div>Test</div>'
    const result = wrapForHydration(html, {
      componentId: 'test_AllChars',
      props: { dangerous: '<script>&"\'</script>' },
    })

    // All dangerous characters should be escaped
    expect(result).not.toContain('<script>')
    expect(result).toContain('&lt;')
    expect(result).toContain('&gt;')
    expect(result).toContain('&amp;')
    expect(result).toContain('&quot;')
    expect(result).toContain('&#39;')
  })

  it('should handle unicode characters safely', () => {
    const html = '<div>Unicode</div>'
    const result = wrapForHydration(html, {
      componentId: 'test_Unicode',
      props: { text: 'Hello \u0000 World \uD800\uDC00' },
    })

    // Should not break the HTML structure
    expect(result).toMatch(/^<div.*data-hydrate-id.*>/)
    expect(result).toContain('Hello')
    expect(result).toContain('World')
  })

  it('should handle very long strings', () => {
    const html = '<div>Long</div>'
    const longString = 'a'.repeat(10000) + '<script>' + 'b'.repeat(10000)
    const result = wrapForHydration(html, {
      componentId: 'test_Long',
      props: { text: longString },
    })

    // Should escape script tags even in long strings
    expect(result).not.toContain('<script>')
    expect(result).toContain('&lt;script&gt;')
  })
})

// ============================================================================
// generateHydrationScript Tests
// ============================================================================

describe('generateHydrationScript', () => {
  it('should return empty string for empty manifest', () => {
    const manifest = createHydrationManifest()

    const script = generateHydrationScript(manifest)

    expect(script).toBe('')
  })

  it('should generate script for manifest with components', () => {
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

    const script = generateHydrationScript(manifest)

    expect(script).toContain('<script type="module">')
    expect(script).toContain('</script>')
    expect(script).toContain('components_Counter')
    expect(script).toContain('/__cloudwerk/components_Counter.js')
  })

  it('should include bundle map in script', () => {
    const manifest = createHydrationManifest()
    addToHydrationManifest(
      manifest,
      {
        filePath: '/app/Counter.tsx',
        componentId: 'Counter',
        exportName: 'default',
      },
      '/__cloudwerk/Counter.js'
    )
    addToHydrationManifest(
      manifest,
      {
        filePath: '/app/Toggle.tsx',
        componentId: 'Toggle',
        exportName: 'default',
      },
      '/__cloudwerk/Toggle.js'
    )

    const script = generateHydrationScript(manifest)

    expect(script).toContain('Counter')
    expect(script).toContain('Toggle')
    expect(script).toContain('/__cloudwerk/Counter.js')
    expect(script).toContain('/__cloudwerk/Toggle.js')
  })

  it('should use custom hydration endpoint', () => {
    const manifest = createHydrationManifest()
    addToHydrationManifest(
      manifest,
      {
        filePath: '/app/Component.tsx',
        componentId: 'Component',
        exportName: 'default',
      },
      '/custom/Component.js'
    )

    const script = generateHydrationScript(manifest, {
      hydrationEndpoint: '/custom',
    })

    expect(script).toContain('/custom/runtime.js')
  })

  it('should use default hydration endpoint when not specified', () => {
    const manifest = createHydrationManifest()
    addToHydrationManifest(
      manifest,
      {
        filePath: '/app/Component.tsx',
        componentId: 'Component',
        exportName: 'default',
      },
      '/__cloudwerk/Component.js'
    )

    const script = generateHydrationScript(manifest)

    expect(script).toContain('/__cloudwerk/runtime.js')
  })

  it('should include module caching logic', () => {
    const manifest = createHydrationManifest()
    addToHydrationManifest(
      manifest,
      {
        filePath: '/app/Component.tsx',
        componentId: 'Component',
        exportName: 'default',
      },
      '/__cloudwerk/Component.js'
    )

    const script = generateHydrationScript(manifest)

    expect(script).toContain('moduleCache')
    expect(script).toContain('loadComponent')
  })

  it('should query for hydration elements', () => {
    const manifest = createHydrationManifest()
    addToHydrationManifest(
      manifest,
      {
        filePath: '/app/Component.tsx',
        componentId: 'Component',
        exportName: 'default',
      },
      '/__cloudwerk/Component.js'
    )

    const script = generateHydrationScript(manifest)

    expect(script).toContain("querySelectorAll('[data-hydrate-id]')")
    expect(script).toContain("getAttribute('data-hydrate-id')")
    expect(script).toContain("getAttribute('data-hydrate-props')")
  })

  it('should remove hydration attributes after hydration', () => {
    const manifest = createHydrationManifest()
    addToHydrationManifest(
      manifest,
      {
        filePath: '/app/Component.tsx',
        componentId: 'Component',
        exportName: 'default',
      },
      '/__cloudwerk/Component.js'
    )

    const script = generateHydrationScript(manifest)

    expect(script).toContain("removeAttribute('data-hydrate-id')")
    expect(script).toContain("removeAttribute('data-hydrate-props')")
  })

  it('should handle errors gracefully in generated script', () => {
    const manifest = createHydrationManifest()
    addToHydrationManifest(
      manifest,
      {
        filePath: '/app/Component.tsx',
        componentId: 'Component',
        exportName: 'default',
      },
      '/__cloudwerk/Component.js'
    )

    const script = generateHydrationScript(manifest)

    expect(script).toContain('try')
    expect(script).toContain('catch')
    expect(script).toContain('console.error')
  })
})

// ============================================================================
// generatePreloadHints Tests
// ============================================================================

describe('generatePreloadHints', () => {
  it('should return empty string for empty manifest', () => {
    const manifest = createHydrationManifest()

    const hints = generatePreloadHints(manifest)

    expect(hints).toBe('')
  })

  it('should generate modulepreload link for single component', () => {
    const manifest = createHydrationManifest()
    addToHydrationManifest(
      manifest,
      {
        filePath: '/app/Counter.tsx',
        componentId: 'Counter',
        exportName: 'default',
      },
      '/__cloudwerk/Counter.js'
    )

    const hints = generatePreloadHints(manifest)

    expect(hints).toBe('<link rel="modulepreload" href="/__cloudwerk/Counter.js">')
  })

  it('should generate modulepreload links for multiple components', () => {
    const manifest = createHydrationManifest()
    addToHydrationManifest(
      manifest,
      {
        filePath: '/app/Counter.tsx',
        componentId: 'Counter',
        exportName: 'default',
      },
      '/__cloudwerk/Counter.js'
    )
    addToHydrationManifest(
      manifest,
      {
        filePath: '/app/Toggle.tsx',
        componentId: 'Toggle',
        exportName: 'default',
      },
      '/__cloudwerk/Toggle.js'
    )
    addToHydrationManifest(
      manifest,
      {
        filePath: '/app/Modal.tsx',
        componentId: 'Modal',
        exportName: 'default',
      },
      '/__cloudwerk/Modal.js'
    )

    const hints = generatePreloadHints(manifest)

    // Should have 3 preload links separated by newlines
    const lines = hints.split('\n')
    expect(lines).toHaveLength(3)
    expect(hints).toContain('/__cloudwerk/Counter.js')
    expect(hints).toContain('/__cloudwerk/Toggle.js')
    expect(hints).toContain('/__cloudwerk/Modal.js')
  })

  it('should use correct rel attribute', () => {
    const manifest = createHydrationManifest()
    addToHydrationManifest(
      manifest,
      {
        filePath: '/app/Component.tsx',
        componentId: 'Component',
        exportName: 'default',
      },
      '/__cloudwerk/Component.js'
    )

    const hints = generatePreloadHints(manifest)

    expect(hints).toContain('rel="modulepreload"')
  })
})

// ============================================================================
// generateHydrationRuntime Tests
// ============================================================================

describe('generateHydrationRuntime', () => {
  it('should generate valid JavaScript module', () => {
    const runtime = generateHydrationRuntime()

    // Should be a valid ES module with imports
    expect(runtime).toContain("import { render as honoRender } from 'hono/jsx/dom'")
    expect(runtime).toContain('export function render')
  })

  it('should export render function', () => {
    const runtime = generateHydrationRuntime()

    expect(runtime).toContain('export function render(element, container)')
    expect(runtime).toContain('honoRender(element, container)')
  })

  it('should re-export hooks from hono/jsx/dom', () => {
    const runtime = generateHydrationRuntime()

    expect(runtime).toContain('useState')
    expect(runtime).toContain('useEffect')
    expect(runtime).toContain('useRef')
    expect(runtime).toContain('useCallback')
    expect(runtime).toContain('useMemo')
    expect(runtime).toContain('useReducer')
    expect(runtime).toContain('useSyncExternalStore')
    expect(runtime).toContain('useTransition')
    expect(runtime).toContain('useDeferredValue')
    expect(runtime).toContain('useId')
  })

  it('should export hooks for client components to use', () => {
    const runtime = generateHydrationRuntime()

    // Should have export statement for hooks
    expect(runtime).toContain("} from 'hono/jsx/dom'")
  })

  it('should include comment explaining the runtime', () => {
    const runtime = generateHydrationRuntime()

    expect(runtime).toContain('Cloudwerk Hydration Runtime')
    expect(runtime).toContain('hono/jsx/dom')
  })

  it('should not have trailing whitespace issues', () => {
    const runtime = generateHydrationRuntime()

    // Should be trimmed
    expect(runtime).toBe(runtime.trim())
    // Should start with comment, not whitespace
    expect(runtime.charAt(0)).toBe('/')
  })

  it('should be syntactically valid ES module (basic check)', () => {
    const runtime = generateHydrationRuntime()

    // Should have balanced braces (simple check)
    const openBraces = (runtime.match(/{/g) || []).length
    const closeBraces = (runtime.match(/}/g) || []).length
    expect(openBraces).toBe(closeBraces)

    // Should have balanced parentheses
    const openParens = (runtime.match(/\(/g) || []).length
    const closeParens = (runtime.match(/\)/g) || []).length
    expect(openParens).toBe(closeParens)
  })
})

// ============================================================================
// generateReactHydrationRuntime Tests
// ============================================================================

describe('generateReactHydrationRuntime', () => {
  it('should generate valid JavaScript module', () => {
    const runtime = generateReactHydrationRuntime()

    // Should be a valid ES module with imports
    expect(runtime).toContain("import React from 'react'")
    expect(runtime).toContain("import { hydrateRoot } from 'react-dom/client'")
    expect(runtime).toContain('export function hydrate')
  })

  it('should export React for component rendering', () => {
    const runtime = generateReactHydrationRuntime()

    expect(runtime).toContain('export { React }')
  })

  it('should export hydrateRoot from react-dom/client', () => {
    const runtime = generateReactHydrationRuntime()

    expect(runtime).toContain('export { hydrateRoot }')
  })

  it('should export hydrate wrapper function', () => {
    const runtime = generateReactHydrationRuntime()

    expect(runtime).toContain('export function hydrate(Component, props, container)')
    expect(runtime).toContain('hydrateRoot(container, React.createElement(Component, props))')
  })

  it('should re-export all React hooks', () => {
    const runtime = generateReactHydrationRuntime()

    // Core hooks
    expect(runtime).toContain('useState')
    expect(runtime).toContain('useEffect')
    expect(runtime).toContain('useRef')
    expect(runtime).toContain('useCallback')
    expect(runtime).toContain('useMemo')
    expect(runtime).toContain('useReducer')
    expect(runtime).toContain('useContext')
    expect(runtime).toContain('useLayoutEffect')
    expect(runtime).toContain('useImperativeHandle')
    expect(runtime).toContain('useDebugValue')
  })

  it('should re-export React 18+ hooks', () => {
    const runtime = generateReactHydrationRuntime()

    expect(runtime).toContain('useSyncExternalStore')
    expect(runtime).toContain('useTransition')
    expect(runtime).toContain('useDeferredValue')
    expect(runtime).toContain('useId')
    expect(runtime).toContain('useInsertionEffect')
  })

  it('should re-export React 19 hooks', () => {
    const runtime = generateReactHydrationRuntime()

    expect(runtime).toContain('useOptimistic')
    expect(runtime).toContain('useActionState')
    expect(runtime).toContain('use')
  })

  it('should include comment explaining the runtime', () => {
    const runtime = generateReactHydrationRuntime()

    expect(runtime).toContain('Cloudwerk React Hydration Runtime')
    expect(runtime).toContain('react-dom/client')
  })

  it('should not have trailing whitespace issues', () => {
    const runtime = generateReactHydrationRuntime()

    // Should be trimmed
    expect(runtime).toBe(runtime.trim())
    // Should start with comment, not whitespace
    expect(runtime.charAt(0)).toBe('/')
  })

  it('should be syntactically valid ES module (basic check)', () => {
    const runtime = generateReactHydrationRuntime()

    // Should have balanced braces (simple check)
    const openBraces = (runtime.match(/{/g) || []).length
    const closeBraces = (runtime.match(/}/g) || []).length
    expect(openBraces).toBe(closeBraces)

    // Should have balanced parentheses
    const openParens = (runtime.match(/\(/g) || []).length
    const closeParens = (runtime.match(/\)/g) || []).length
    expect(openParens).toBe(closeParens)
  })
})

// ============================================================================
// generateReactHydrationScript Tests
// ============================================================================

describe('generateReactHydrationScript', () => {
  it('should return empty string for empty manifest', () => {
    const manifest = createHydrationManifest()

    const script = generateReactHydrationScript(manifest)

    expect(script).toBe('')
  })

  it('should generate script for manifest with components', () => {
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

    const script = generateReactHydrationScript(manifest)

    expect(script).toContain('<script type="module">')
    expect(script).toContain('</script>')
    expect(script).toContain('components_Counter')
    expect(script).toContain('/__cloudwerk/components_Counter.js')
  })

  it('should use React hydrateRoot instead of Hono render', () => {
    const manifest = createHydrationManifest()
    addToHydrationManifest(
      manifest,
      {
        filePath: '/app/Component.tsx',
        componentId: 'Component',
        exportName: 'default',
      },
      '/__cloudwerk/Component.js'
    )

    const script = generateReactHydrationScript(manifest)

    expect(script).toContain('hydrateRoot')
    expect(script).toContain('React.createElement')
    expect(script).not.toContain('hono')
  })

  it('should import from react-runtime.js', () => {
    const manifest = createHydrationManifest()
    addToHydrationManifest(
      manifest,
      {
        filePath: '/app/Component.tsx',
        componentId: 'Component',
        exportName: 'default',
      },
      '/__cloudwerk/Component.js'
    )

    const script = generateReactHydrationScript(manifest)

    expect(script).toContain('/__cloudwerk/react-runtime.js')
  })

  it('should use custom hydration endpoint for react-runtime', () => {
    const manifest = createHydrationManifest()
    addToHydrationManifest(
      manifest,
      {
        filePath: '/app/Component.tsx',
        componentId: 'Component',
        exportName: 'default',
      },
      '/custom/Component.js'
    )

    const script = generateReactHydrationScript(manifest, {
      hydrationEndpoint: '/custom',
    })

    expect(script).toContain('/custom/react-runtime.js')
  })

  it('should include bundle map in script', () => {
    const manifest = createHydrationManifest()
    addToHydrationManifest(
      manifest,
      {
        filePath: '/app/Counter.tsx',
        componentId: 'Counter',
        exportName: 'default',
      },
      '/__cloudwerk/Counter.js'
    )
    addToHydrationManifest(
      manifest,
      {
        filePath: '/app/Toggle.tsx',
        componentId: 'Toggle',
        exportName: 'default',
      },
      '/__cloudwerk/Toggle.js'
    )

    const script = generateReactHydrationScript(manifest)

    expect(script).toContain('Counter')
    expect(script).toContain('Toggle')
    expect(script).toContain('/__cloudwerk/Counter.js')
    expect(script).toContain('/__cloudwerk/Toggle.js')
  })

  it('should include module caching logic', () => {
    const manifest = createHydrationManifest()
    addToHydrationManifest(
      manifest,
      {
        filePath: '/app/Component.tsx',
        componentId: 'Component',
        exportName: 'default',
      },
      '/__cloudwerk/Component.js'
    )

    const script = generateReactHydrationScript(manifest)

    expect(script).toContain('moduleCache')
    expect(script).toContain('loadComponent')
  })

  it('should query for hydration elements', () => {
    const manifest = createHydrationManifest()
    addToHydrationManifest(
      manifest,
      {
        filePath: '/app/Component.tsx',
        componentId: 'Component',
        exportName: 'default',
      },
      '/__cloudwerk/Component.js'
    )

    const script = generateReactHydrationScript(manifest)

    expect(script).toContain("querySelectorAll('[data-hydrate-id]')")
    expect(script).toContain("getAttribute('data-hydrate-id')")
    expect(script).toContain("getAttribute('data-hydrate-props')")
  })

  it('should remove hydration attributes after hydration', () => {
    const manifest = createHydrationManifest()
    addToHydrationManifest(
      manifest,
      {
        filePath: '/app/Component.tsx',
        componentId: 'Component',
        exportName: 'default',
      },
      '/__cloudwerk/Component.js'
    )

    const script = generateReactHydrationScript(manifest)

    expect(script).toContain("removeAttribute('data-hydrate-id')")
    expect(script).toContain("removeAttribute('data-hydrate-props')")
  })

  it('should handle errors gracefully in generated script', () => {
    const manifest = createHydrationManifest()
    addToHydrationManifest(
      manifest,
      {
        filePath: '/app/Component.tsx',
        componentId: 'Component',
        exportName: 'default',
      },
      '/__cloudwerk/Component.js'
    )

    const script = generateReactHydrationScript(manifest)

    expect(script).toContain('try')
    expect(script).toContain('catch')
    expect(script).toContain('console.error')
  })

  it('should import React and hydrateRoot from runtime', () => {
    const manifest = createHydrationManifest()
    addToHydrationManifest(
      manifest,
      {
        filePath: '/app/Component.tsx',
        componentId: 'Component',
        exportName: 'default',
      },
      '/__cloudwerk/Component.js'
    )

    const script = generateReactHydrationScript(manifest)

    expect(script).toContain('const { React, hydrateRoot }')
    expect(script).toContain("await import('/__cloudwerk/react-runtime.js')")
  })
})
