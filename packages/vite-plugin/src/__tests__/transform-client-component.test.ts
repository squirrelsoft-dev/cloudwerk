/**
 * @cloudwerk/vite-plugin - Client Component Transform Tests
 *
 * Tests for the SWC-based client component transformation.
 */

import { describe, it, expect } from 'vitest'
import { transformClientComponent } from '../transform-client-component.js'

const DEFAULT_OPTIONS = {
  componentId: 'test_Component',
  bundlePath: '/__cloudwerk/test_Component.js',
}

describe('transformClientComponent', () => {
  describe('named function export', () => {
    it('should transform export default function Name()', () => {
      const code = `'use client'

export default function Counter() {
  return <button>Count</button>
}`
      const result = transformClientComponent(code, DEFAULT_OPTIONS)

      expect(result.success).toBe(true)
      expect(result.code).toContain('import { createClientComponentWrapper as __createWrapper }')
      expect(result.code).toContain('function Counter()')
      expect(result.code).not.toContain('export default function')
      expect(result.code).toContain('__createWrapper(Counter,')
      expect(result.code).toContain('export default __WrappedComponent')
      expect(result.code).not.toContain("'use client'")
    })

    it('should transform export default async function Name()', () => {
      const code = `'use client'

export default async function AsyncCounter() {
  return <button>Count</button>
}`
      const result = transformClientComponent(code, DEFAULT_OPTIONS)

      expect(result.success).toBe(true)
      expect(result.code).toContain('async function AsyncCounter()')
      expect(result.code).toContain('__createWrapper(AsyncCounter,')
    })
  })

  describe('anonymous function export', () => {
    it('should transform export default function()', () => {
      const code = `'use client'

export default function() {
  return <button>Count</button>
}`
      const result = transformClientComponent(code, DEFAULT_OPTIONS)

      expect(result.success).toBe(true)
      expect(result.code).toContain('const __OriginalComponent = function(')
      expect(result.code).toContain('__createWrapper(__OriginalComponent,')
    })
  })

  describe('arrow function export', () => {
    it('should transform export default () => {}', () => {
      const code = `'use client'

export default () => {
  return <button>Count</button>
}`
      const result = transformClientComponent(code, DEFAULT_OPTIONS)

      expect(result.success).toBe(true)
      expect(result.code).toContain('const __OriginalComponent = () =>')
      expect(result.code).toContain('__createWrapper(__OriginalComponent,')
    })

    it('should transform export default (props) => {}', () => {
      const code = `'use client'

export default (props) => {
  return <button>{props.label}</button>
}`
      const result = transformClientComponent(code, DEFAULT_OPTIONS)

      expect(result.success).toBe(true)
      expect(result.code).toContain('const __OriginalComponent = (props) =>')
    })

    it('should transform export default async () => {}', () => {
      const code = `'use client'

export default async () => {
  return <button>Count</button>
}`
      const result = transformClientComponent(code, DEFAULT_OPTIONS)

      expect(result.success).toBe(true)
      expect(result.code).toContain('const __OriginalComponent = async () =>')
    })
  })

  describe('class export', () => {
    it('should transform export default class Name {}', () => {
      const code = `'use client'

export default class Counter {
  render() {
    return <button>Count</button>
  }
}`
      const result = transformClientComponent(code, DEFAULT_OPTIONS)

      expect(result.success).toBe(true)
      expect(result.code).toContain('class Counter {')
      expect(result.code).not.toContain('export default class')
      expect(result.code).toContain('__createWrapper(Counter,')
    })
  })

  describe('identifier reference export', () => {
    it('should transform export default Name (defined elsewhere)', () => {
      const code = `'use client'

function Counter() {
  return <button>Count</button>
}

export default Counter`
      const result = transformClientComponent(code, DEFAULT_OPTIONS)

      expect(result.success).toBe(true)
      expect(result.code).toContain('function Counter()')
      expect(result.code).not.toContain('export default Counter')
      expect(result.code).toContain('__createWrapper(Counter,')
    })

    it('should transform export default with const component', () => {
      const code = `'use client'

const Counter = () => <button>Count</button>

export default Counter`
      const result = transformClientComponent(code, DEFAULT_OPTIONS)

      expect(result.success).toBe(true)
      expect(result.code).toContain('const Counter = () =>')
      expect(result.code).toContain('__createWrapper(Counter,')
    })
  })

  describe('named export as default', () => {
    it('should transform export { Name as default }', () => {
      const code = `'use client'

function Counter() {
  return <button>Count</button>
}

export { Counter as default }`
      const result = transformClientComponent(code, DEFAULT_OPTIONS)

      expect(result.success).toBe(true)
      expect(result.code).toContain('function Counter()')
      expect(result.code).not.toContain('export { Counter as default }')
      expect(result.code).toContain('__createWrapper(Counter,')
    })
  })

  describe('edge cases', () => {
    it('should handle code with imports', () => {
      const code = `'use client'

import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}`
      const result = transformClientComponent(code, DEFAULT_OPTIONS)

      expect(result.success).toBe(true)
      expect(result.code).toContain("import { useState } from 'react'")
      expect(result.code).toContain('__createWrapper(Counter,')
    })

    it('should handle code with comments', () => {
      const code = `'use client'

// This is a counter component
/**
 * Counter with state
 */
export default function Counter() {
  return <button>Count</button>
}`
      const result = transformClientComponent(code, DEFAULT_OPTIONS)

      expect(result.success).toBe(true)
      expect(result.code).toContain('// This is a counter component')
    })

    it('should handle "use client" with semicolon', () => {
      const code = `"use client";

export default function Counter() {
  return <button>Count</button>
}`
      const result = transformClientComponent(code, DEFAULT_OPTIONS)

      expect(result.success).toBe(true)
      expect(result.code).not.toContain('"use client"')
    })

    it('should handle TypeScript types', () => {
      const code = `'use client'

interface CounterProps {
  initial: number
}

export default function Counter({ initial }: CounterProps) {
  return <button>Count: {initial}</button>
}`
      const result = transformClientComponent(code, DEFAULT_OPTIONS)

      expect(result.success).toBe(true)
      expect(result.code).toContain('interface CounterProps')
      expect(result.code).toContain('__createWrapper(Counter,')
    })

    it('should include componentId and bundlePath in meta', () => {
      const code = `'use client'

export default function Counter() {
  return <button>Count</button>
}`
      const result = transformClientComponent(code, {
        componentId: 'my_component',
        bundlePath: '/path/to/bundle.js',
      })

      expect(result.success).toBe(true)
      expect(result.code).toContain('"componentId":"my_component"')
      expect(result.code).toContain('"bundlePath":"/path/to/bundle.js"')
    })
  })

  describe('named exports', () => {
    it('should wrap a single named export function', () => {
      const code = `'use client'

export function Counter() {
  return <button>Count</button>
}`
      const result = transformClientComponent(code, DEFAULT_OPTIONS)

      expect(result.success).toBe(true)
      expect(result.wrappedExports).toEqual(['Counter'])
      expect(result.code).toContain('function __Counter_original(')
      expect(result.code).toContain('export const Counter = __createWrapper(__Counter_original,')
      expect(result.code).toContain('"componentId":"test_Component__Counter"')
      expect(result.code).not.toContain("'use client'")
    })

    it('should wrap multiple named exports', () => {
      const code = `'use client'

export function Counter() {
  return <button>Count</button>
}

export function Toggle() {
  return <button>Toggle</button>
}`
      const result = transformClientComponent(code, DEFAULT_OPTIONS)

      expect(result.success).toBe(true)
      expect(result.wrappedExports).toContain('Counter')
      expect(result.wrappedExports).toContain('Toggle')
      expect(result.code).toContain('function __Counter_original(')
      expect(result.code).toContain('export const Counter = __createWrapper(__Counter_original,')
      expect(result.code).toContain('function __Toggle_original(')
      expect(result.code).toContain('export const Toggle = __createWrapper(__Toggle_original,')
    })

    it('should wrap const arrow function exports', () => {
      const code = `'use client'

export const Counter = () => {
  return <button>Count</button>
}`
      const result = transformClientComponent(code, DEFAULT_OPTIONS)

      expect(result.success).toBe(true)
      expect(result.wrappedExports).toEqual(['Counter'])
      expect(result.code).toContain('const __Counter_original =')
      expect(result.code).toContain('export const Counter = __createWrapper(__Counter_original,')
    })

    it('should wrap exported class components', () => {
      const code = `'use client'

export class Counter {
  render() { return <button>Count</button> }
}`
      const result = transformClientComponent(code, DEFAULT_OPTIONS)

      expect(result.success).toBe(true)
      expect(result.wrappedExports).toEqual(['Counter'])
      expect(result.code).toContain('class __Counter_original')
      expect(result.code).toContain('export const Counter = __createWrapper(__Counter_original,')
    })

    it('should skip lowercase named exports (not components)', () => {
      const code = `'use client'

export function helper() {
  return 'not a component'
}

export function Counter() {
  return <button>Count</button>
}`
      const result = transformClientComponent(code, DEFAULT_OPTIONS)

      expect(result.success).toBe(true)
      expect(result.wrappedExports).toEqual(['Counter'])
      // helper should NOT be wrapped
      expect(result.code).toContain('export function helper(')
      expect(result.code).not.toContain('__helper_original')
    })

    it('should handle mixed default + named exports', () => {
      const code = `'use client'

export function Counter() {
  return <button>Count</button>
}

export default function App() {
  return <div><Counter /></div>
}`
      const result = transformClientComponent(code, DEFAULT_OPTIONS)

      expect(result.success).toBe(true)
      expect(result.wrappedExports).toEqual(['Counter'])
      // Default export should also be wrapped
      expect(result.code).toContain('__createWrapper(App,')
      expect(result.code).toContain('export default __WrappedComponent')
      // Named export should be wrapped
      expect(result.code).toContain('export const Counter = __createWrapper(__Counter_original,')
    })
  })

  describe('error handling', () => {
    it('should return error for code without any component exports', () => {
      const code = `'use client'

export function helper() {
  return 'not a component'
}

export const value = 42`
      const result = transformClientComponent(code, DEFAULT_OPTIONS)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Could not find default export')
    })

    it('should return error for empty module', () => {
      const code = `'use client'

const x = 1`
      const result = transformClientComponent(code, DEFAULT_OPTIONS)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Could not find default export')
    })

    it('should return error for invalid syntax', () => {
      const code = `'use client'

export default function Counter() {
  return <button>Count</button
}`
      const result = transformClientComponent(code, DEFAULT_OPTIONS)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to parse')
    })
  })
})
