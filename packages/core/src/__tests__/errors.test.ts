/**
 * @cloudwerk/core - Error Classes Tests
 *
 * Tests for NotFoundError and RedirectError classes.
 */

import { describe, it, expect } from 'vitest'
import { NotFoundError, RedirectError } from '../errors.js'

// ============================================================================
// NotFoundError Tests
// ============================================================================

describe('NotFoundError', () => {
  describe('construction', () => {
    it('should create error with default message', () => {
      const error = new NotFoundError()

      expect(error.message).toBe('Not Found')
      expect(error.name).toBe('NotFoundError')
    })

    it('should create error with custom message', () => {
      const error = new NotFoundError('User not found')

      expect(error.message).toBe('User not found')
      expect(error.name).toBe('NotFoundError')
    })
  })

  describe('instanceof checks', () => {
    it('should be instanceof NotFoundError', () => {
      const error = new NotFoundError()

      expect(error).toBeInstanceOf(NotFoundError)
    })

    it('should be instanceof Error', () => {
      const error = new NotFoundError()

      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('stack trace', () => {
    it('should have a stack trace', () => {
      const error = new NotFoundError()

      expect(error.stack).toBeDefined()
      expect(typeof error.stack).toBe('string')
    })

    it('should capture stack trace from throw site', () => {
      function throwNotFound() {
        throw new NotFoundError()
      }

      try {
        throwNotFound()
      } catch (error) {
        expect((error as Error).stack).toContain('throwNotFound')
      }
    })
  })

  describe('throw and catch', () => {
    it('should be throwable and catchable', () => {
      expect(() => {
        throw new NotFoundError('test')
      }).toThrow(NotFoundError)
    })

    it('should be catchable by type', () => {
      try {
        throw new NotFoundError('custom message')
      } catch (error) {
        if (error instanceof NotFoundError) {
          expect(error.message).toBe('custom message')
        } else {
          // Fail the test if not caught as NotFoundError
          expect(error).toBeInstanceOf(NotFoundError)
        }
      }
    })
  })
})

// ============================================================================
// RedirectError Tests
// ============================================================================

describe('RedirectError', () => {
  describe('construction', () => {
    it('should create error with URL and default status', () => {
      const error = new RedirectError('/login')

      expect(error.url).toBe('/login')
      expect(error.status).toBe(302)
      expect(error.name).toBe('RedirectError')
      expect(error.message).toBe('Redirect to /login')
    })

    it('should create error with URL and custom status', () => {
      const error = new RedirectError('/new-page', 301)

      expect(error.url).toBe('/new-page')
      expect(error.status).toBe(301)
      expect(error.message).toBe('Redirect to /new-page')
    })

    it('should accept absolute URLs', () => {
      const error = new RedirectError('https://example.com/path', 307)

      expect(error.url).toBe('https://example.com/path')
      expect(error.status).toBe(307)
    })

    it('should accept various redirect status codes', () => {
      const redirectCodes = [301, 302, 303, 307, 308]

      for (const status of redirectCodes) {
        const error = new RedirectError('/target', status)
        expect(error.status).toBe(status)
      }
    })
  })

  describe('instanceof checks', () => {
    it('should be instanceof RedirectError', () => {
      const error = new RedirectError('/path')

      expect(error).toBeInstanceOf(RedirectError)
    })

    it('should be instanceof Error', () => {
      const error = new RedirectError('/path')

      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('properties', () => {
    it('should have readonly url property', () => {
      const error = new RedirectError('/path')

      expect(error.url).toBe('/path')
      // TypeScript prevents reassignment, but we can verify the property exists
      expect('url' in error).toBe(true)
    })

    it('should have readonly status property', () => {
      const error = new RedirectError('/path', 301)

      expect(error.status).toBe(301)
      expect('status' in error).toBe(true)
    })
  })

  describe('stack trace', () => {
    it('should have a stack trace', () => {
      const error = new RedirectError('/path')

      expect(error.stack).toBeDefined()
      expect(typeof error.stack).toBe('string')
    })

    it('should capture stack trace from throw site', () => {
      function throwRedirect() {
        throw new RedirectError('/login')
      }

      try {
        throwRedirect()
      } catch (error) {
        expect((error as Error).stack).toContain('throwRedirect')
      }
    })
  })

  describe('throw and catch', () => {
    it('should be throwable and catchable', () => {
      expect(() => {
        throw new RedirectError('/path')
      }).toThrow(RedirectError)
    })

    it('should be catchable by type', () => {
      try {
        throw new RedirectError('/dashboard', 303)
      } catch (error) {
        if (error instanceof RedirectError) {
          expect(error.url).toBe('/dashboard')
          expect(error.status).toBe(303)
        } else {
          // Fail the test if not caught as RedirectError
          expect(error).toBeInstanceOf(RedirectError)
        }
      }
    })
  })

  describe('common redirect scenarios', () => {
    it('should support temporary redirect (302)', () => {
      const error = new RedirectError('/maintenance')

      expect(error.status).toBe(302)
    })

    it('should support permanent redirect (301)', () => {
      const error = new RedirectError('/new-url', 301)

      expect(error.status).toBe(301)
    })

    it('should support See Other redirect (303)', () => {
      const error = new RedirectError('/success', 303)

      expect(error.status).toBe(303)
    })

    it('should support Temporary Redirect (307)', () => {
      const error = new RedirectError('/api/new', 307)

      expect(error.status).toBe(307)
    })

    it('should support Permanent Redirect (308)', () => {
      const error = new RedirectError('/api/v2', 308)

      expect(error.status).toBe(308)
    })
  })
})

// ============================================================================
// Error Differentiation Tests
// ============================================================================

describe('Error differentiation', () => {
  it('should differentiate NotFoundError from RedirectError', () => {
    const notFound = new NotFoundError()
    const redirect = new RedirectError('/path')

    expect(notFound).toBeInstanceOf(NotFoundError)
    expect(notFound).not.toBeInstanceOf(RedirectError)
    expect(redirect).toBeInstanceOf(RedirectError)
    expect(redirect).not.toBeInstanceOf(NotFoundError)
  })

  it('should differentiate by name property', () => {
    const notFound = new NotFoundError()
    const redirect = new RedirectError('/path')

    expect(notFound.name).toBe('NotFoundError')
    expect(redirect.name).toBe('RedirectError')
    expect(notFound.name).not.toBe(redirect.name)
  })

  it('should allow pattern matching in catch block', () => {
    function handleError(error: Error): string {
      if (error instanceof NotFoundError) {
        return '404'
      }
      if (error instanceof RedirectError) {
        return `redirect:${error.status}`
      }
      return 'unknown'
    }

    expect(handleError(new NotFoundError())).toBe('404')
    expect(handleError(new RedirectError('/path', 301))).toBe('redirect:301')
    expect(handleError(new Error('generic'))).toBe('unknown')
  })
})
