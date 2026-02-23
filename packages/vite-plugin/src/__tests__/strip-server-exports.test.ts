/**
 * @cloudwerk/vite-plugin - Strip Server Exports Tests
 *
 * Tests for the SWC-based server export stripping transform.
 */

import { describe, it, expect } from 'vitest'
import { stripServerExports } from '../strip-server-exports.js'

describe('stripServerExports', () => {
  describe('function declarations', () => {
    it('should strip export async function loader()', () => {
      const code = `import { db } from '@cloudwerk/data'

export async function loader({ params }) {
  return { user: await db.query('SELECT * FROM users WHERE id = ?', [params.id]) }
}

export default function UserPage({ user }) {
  return <h1>{user.name}</h1>
}`
      const result = stripServerExports(code)

      expect(result.stripped).toEqual(['loader'])
      expect(result.code).not.toContain('export async function loader')
      expect(result.code).toContain('export default function UserPage')
      expect(result.code).toContain("import { db } from '@cloudwerk/data'")
    })

    it('should strip export function loader()', () => {
      const code = `export function loader() {
  return { data: 'test' }
}

export default function Page() {
  return <div>Page</div>
}`
      const result = stripServerExports(code)

      expect(result.stripped).toEqual(['loader'])
      expect(result.code).not.toContain('export function loader')
      expect(result.code).toContain('export default function Page')
    })

    it('should strip export function generateStaticParams()', () => {
      const code = `export function generateStaticParams() {
  return [{ id: '1' }, { id: '2' }]
}

export default function Page({ id }) {
  return <div>{id}</div>
}`
      const result = stripServerExports(code)

      expect(result.stripped).toEqual(['generateStaticParams'])
      expect(result.code).not.toContain('export function generateStaticParams')
      expect(result.code).toContain('export default function Page')
    })
  })

  describe('variable declarations', () => {
    it('should strip export const config = {}', () => {
      const code = `export const config = {
  auth: { required: true },
  cache: { ttl: 60 },
}

export default function ProtectedPage() {
  return <div>Protected</div>
}`
      const result = stripServerExports(code)

      expect(result.stripped).toEqual(['config'])
      expect(result.code).not.toContain('export const config')
      expect(result.code).toContain('export default function ProtectedPage')
    })
  })

  describe('re-exports', () => {
    it('should strip export { loader } from "./loader"', () => {
      const code = `export { loader } from './loader'

export default function Page() {
  return <div>Page</div>
}`
      const result = stripServerExports(code)

      expect(result.stripped).toEqual(['loader'])
      expect(result.code).not.toContain("export { loader } from './loader'")
      expect(result.code).toContain('export default function Page')
    })

    it('should strip server exports but keep non-server exports in mixed re-export', () => {
      const code = `export { loader, helper } from './utils'

export default function Page() {
  return <div>Page</div>
}`
      const result = stripServerExports(code)

      expect(result.stripped).toEqual(['loader'])
      expect(result.code).toContain("export { helper } from './utils'")
      expect(result.code).not.toContain('loader')
    })

    it('should strip export { config } (local re-export)', () => {
      const code = `const config = { auth: true }

export { config }

export default function Page() {
  return <div>Page</div>
}`
      const result = stripServerExports(code)

      expect(result.stripped).toEqual(['config'])
      expect(result.code).not.toContain('export { config }')
      expect(result.code).toContain('export default function Page')
    })
  })

  describe('multiple server exports', () => {
    it('should strip all server-only exports at once', () => {
      const code = `import { db } from '@cloudwerk/data'

export async function loader({ params }) {
  return { user: await db.get(params.id) }
}

export const config = {
  auth: { required: true },
}

export function generateStaticParams() {
  return [{ id: '1' }]
}

export default function UserPage({ user }) {
  return <h1>{user.name}</h1>
}`
      const result = stripServerExports(code)

      expect(result.stripped).toContain('loader')
      expect(result.stripped).toContain('config')
      expect(result.stripped).toContain('generateStaticParams')
      expect(result.stripped).toHaveLength(3)
      expect(result.code).not.toContain('export async function loader')
      expect(result.code).not.toContain('export const config')
      expect(result.code).not.toContain('export function generateStaticParams')
      expect(result.code).toContain('export default function UserPage')
    })
  })

  describe('no-op cases', () => {
    it('should not modify files with no server exports', () => {
      const code = `import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}`
      const result = stripServerExports(code)

      expect(result.stripped).toEqual([])
      expect(result.code).toBe(code)
    })

    it('should not modify files with only export default', () => {
      const code = `export default function Page() {
  return <div>Hello</div>
}`
      const result = stripServerExports(code)

      expect(result.stripped).toEqual([])
      expect(result.code).toBe(code)
    })

    it('should not strip non-server named exports', () => {
      const code = `export function helper() {
  return 'helper'
}

export const CONSTANT = 42

export default function Page() {
  return <div>Page</div>
}`
      const result = stripServerExports(code)

      expect(result.stripped).toEqual([])
      expect(result.code).toBe(code)
    })
  })

  describe('preserves default export', () => {
    it('should preserve export default function', () => {
      const code = `export async function loader() {
  return { data: 'test' }
}

export default function Page({ data }) {
  return <div>{data}</div>
}`
      const result = stripServerExports(code)

      expect(result.code).toContain('export default function Page')
    })

    it('should preserve export default arrow function', () => {
      const code = `export const config = { auth: true }

const Page = () => <div>Page</div>
export default Page`
      const result = stripServerExports(code)

      expect(result.stripped).toEqual(['config'])
      expect(result.code).toContain('export default Page')
    })
  })
})
