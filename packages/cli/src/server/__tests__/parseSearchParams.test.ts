/**
 * Tests for parseSearchParams utility.
 */

import { describe, it, expect } from 'vitest'
import { parseSearchParams } from '../parseSearchParams.js'

/**
 * Create a mock Hono Context with a given URL.
 */
function createMockContext(url: string) {
  return {
    req: {
      url,
    },
  } as Parameters<typeof parseSearchParams>[0]
}

describe('parseSearchParams', () => {
  describe('single values', () => {
    it('should parse single value params', () => {
      const c = createMockContext('http://localhost/page?search=hello')
      const result = parseSearchParams(c)

      expect(result).toEqual({ search: 'hello' })
    })

    it('should parse multiple different params', () => {
      const c = createMockContext('http://localhost/page?search=hello&page=1&limit=10')
      const result = parseSearchParams(c)

      expect(result).toEqual({
        search: 'hello',
        page: '1',
        limit: '10',
      })
    })
  })

  describe('multiple values for same key', () => {
    it('should parse multiple values as array', () => {
      const c = createMockContext('http://localhost/page?tags=a&tags=b&tags=c')
      const result = parseSearchParams(c)

      expect(result).toEqual({ tags: ['a', 'b', 'c'] })
    })

    it('should handle mix of single and multiple values', () => {
      const c = createMockContext('http://localhost/page?search=hello&tags=a&tags=b')
      const result = parseSearchParams(c)

      expect(result).toEqual({
        search: 'hello',
        tags: ['a', 'b'],
      })
    })
  })

  describe('edge cases', () => {
    it('should handle empty query string', () => {
      const c = createMockContext('http://localhost/page')
      const result = parseSearchParams(c)

      expect(result).toEqual({})
    })

    it('should handle empty value', () => {
      const c = createMockContext('http://localhost/page?empty=')
      const result = parseSearchParams(c)

      expect(result).toEqual({ empty: '' })
    })

    it('should handle params with special characters', () => {
      const c = createMockContext('http://localhost/page?q=hello%20world&url=https%3A%2F%2Fexample.com')
      const result = parseSearchParams(c)

      expect(result).toEqual({
        q: 'hello world',
        url: 'https://example.com',
      })
    })

    it('should preserve order of unique keys', () => {
      const c = createMockContext('http://localhost/page?a=1&b=2&c=3')
      const result = parseSearchParams(c)
      const keys = Object.keys(result)

      expect(keys).toEqual(['a', 'b', 'c'])
    })
  })

  describe('boolean-like and numeric values', () => {
    it('should keep values as strings', () => {
      const c = createMockContext('http://localhost/page?active=true&count=42&enabled=false')
      const result = parseSearchParams(c)

      expect(result).toEqual({
        active: 'true',
        count: '42',
        enabled: 'false',
      })
      expect(typeof result.count).toBe('string')
    })
  })
})
