/**
 * @cloudwerk/core - Helpers Tests
 *
 * Tests for response helper functions.
 */

import { describe, it, expect } from 'vitest'
import {
  json,
  created,
  noContent,
  redirect,
  permanentRedirect,
  html,
  notFoundResponse,
  badRequest,
  unauthorized,
  forbidden,
  serverError,
  validationError,
  text,
  withCache,
  noCache,
} from '../helpers.js'

// ============================================================================
// JSON Response Tests
// ============================================================================

describe('json', () => {
  it('should create JSON response with default status 200', async () => {
    const response = json({ message: 'Hello' })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/json')

    const body = await response.json()
    expect(body).toEqual({ message: 'Hello' })
  })

  it('should create JSON response with custom status', async () => {
    const response = json({ error: 'Not found' }, 404)

    expect(response.status).toBe(404)

    const body = await response.json()
    expect(body).toEqual({ error: 'Not found' })
  })

  it('should include custom headers', () => {
    const response = json({ data: 'test' }, 200, { 'X-Custom': 'value' })

    expect(response.headers.get('X-Custom')).toBe('value')
  })

  it('should handle complex objects', async () => {
    const data = {
      users: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ],
      meta: { total: 2, page: 1 },
    }

    const response = json(data)
    const body = await response.json()

    expect(body).toEqual(data)
  })
})

describe('created', () => {
  it('should create 201 response', async () => {
    const response = created({ id: 1, name: 'New Item' })

    expect(response.status).toBe(201)

    const body = await response.json()
    expect(body).toEqual({ id: 1, name: 'New Item' })
  })
})

describe('noContent', () => {
  it('should create 204 response with no body', () => {
    const response = noContent()

    expect(response.status).toBe(204)
    expect(response.body).toBeNull()
  })
})

// ============================================================================
// Redirect Response Tests
// ============================================================================

describe('redirect', () => {
  it('should create 302 redirect by default', () => {
    const response = redirect('/login')

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe('/login')
  })

  it('should create redirect with custom status', () => {
    const response = redirect('/new-page', 301)

    expect(response.status).toBe(301)
    expect(response.headers.get('Location')).toBe('/new-page')
  })

  it('should handle absolute URLs', () => {
    const response = redirect('https://example.com/path')

    expect(response.headers.get('Location')).toBe('https://example.com/path')
  })
})

describe('permanentRedirect', () => {
  it('should create 301 redirect', () => {
    const response = permanentRedirect('/new-url')

    expect(response.status).toBe(301)
    expect(response.headers.get('Location')).toBe('/new-url')
  })
})

// ============================================================================
// HTML Response Tests
// ============================================================================

describe('html', () => {
  it('should create HTML response with default status 200', async () => {
    const content = '<h1>Hello World</h1>'
    const response = html(content)

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8')

    const body = await response.text()
    expect(body).toBe(content)
  })

  it('should create HTML response with custom status', () => {
    const response = html('<h1>Not Found</h1>', 404)

    expect(response.status).toBe(404)
  })

  it('should include custom headers', () => {
    const response = html('<html></html>', 200, { 'X-Frame-Options': 'DENY' })

    expect(response.headers.get('X-Frame-Options')).toBe('DENY')
  })
})

// ============================================================================
// Error Response Tests
// ============================================================================

describe('notFoundResponse', () => {
  it('should create 404 response with default message', async () => {
    const response = notFoundResponse()

    expect(response.status).toBe(404)

    const body = await response.json()
    expect(body).toEqual({ error: 'Not Found' })
  })

  it('should create 404 response with custom message', async () => {
    const response = notFoundResponse('User not found')

    const body = await response.json()
    expect(body).toEqual({ error: 'User not found' })
  })
})

describe('badRequest', () => {
  it('should create 400 response', async () => {
    const response = badRequest('Invalid input')

    expect(response.status).toBe(400)

    const body = await response.json()
    expect(body).toEqual({ error: 'Invalid input' })
  })

  it('should include additional details', async () => {
    const response = badRequest('Validation failed', { fields: ['email', 'name'] })

    const body = await response.json()
    expect(body).toEqual({
      error: 'Validation failed',
      fields: ['email', 'name'],
    })
  })
})

describe('unauthorized', () => {
  it('should create 401 response', async () => {
    const response = unauthorized()

    expect(response.status).toBe(401)

    const body = await response.json()
    expect(body).toEqual({ error: 'Unauthorized' })
  })
})

describe('forbidden', () => {
  it('should create 403 response', async () => {
    const response = forbidden()

    expect(response.status).toBe(403)

    const body = await response.json()
    expect(body).toEqual({ error: 'Forbidden' })
  })
})

describe('serverError', () => {
  it('should create 500 response', async () => {
    const response = serverError()

    expect(response.status).toBe(500)

    const body = await response.json()
    expect(body).toEqual({ error: 'Internal Server Error' })
  })

  it('should create 500 response with custom message', async () => {
    const response = serverError('Database connection failed')

    const body = await response.json()
    expect(body).toEqual({ error: 'Database connection failed' })
  })
})

describe('validationError', () => {
  it('should create 422 response with validation errors', async () => {
    const errors = {
      email: 'Invalid email format',
      password: ['Too short', 'Must contain number'],
    }

    const response = validationError(errors)

    expect(response.status).toBe(422)

    const body = await response.json()
    expect(body).toEqual({
      error: 'Validation Error',
      errors,
    })
  })
})

// ============================================================================
// Text Response Tests
// ============================================================================

describe('text', () => {
  it('should create plain text response', async () => {
    const response = text('Hello, World!')

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')

    const body = await response.text()
    expect(body).toBe('Hello, World!')
  })

  it('should create text response with custom status', () => {
    const response = text('Error occurred', 500)

    expect(response.status).toBe(500)
  })
})

// ============================================================================
// Cache Control Tests
// ============================================================================

describe('withCache', () => {
  it('should add cache-control header', () => {
    const original = json({ data: 'test' })
    const cached = withCache(original, 3600)

    expect(cached.headers.get('Cache-Control')).toContain('max-age=3600')
  })

  it('should add public directive', () => {
    const original = json({ data: 'test' })
    const cached = withCache(original, 3600, { public: true })

    expect(cached.headers.get('Cache-Control')).toContain('public')
  })

  it('should add private directive', () => {
    const original = json({ data: 'test' })
    const cached = withCache(original, 300, { private: true })

    expect(cached.headers.get('Cache-Control')).toContain('private')
  })

  it('should add stale-while-revalidate', () => {
    const original = json({ data: 'test' })
    const cached = withCache(original, 60, { staleWhileRevalidate: 30 })

    expect(cached.headers.get('Cache-Control')).toContain('stale-while-revalidate=30')
  })

  it('should add stale-if-error', () => {
    const original = json({ data: 'test' })
    const cached = withCache(original, 60, { staleIfError: 600 })

    expect(cached.headers.get('Cache-Control')).toContain('stale-if-error=600')
  })

  it('should preserve original response status', () => {
    const original = json({ error: 'Not found' }, 404)
    const cached = withCache(original, 60)

    expect(cached.status).toBe(404)
  })
})

describe('noCache', () => {
  it('should add no-cache headers', () => {
    const original = json({ data: 'sensitive' })
    const noCached = noCache(original)

    expect(noCached.headers.get('Cache-Control')).toContain('no-store')
    expect(noCached.headers.get('Cache-Control')).toContain('no-cache')
    expect(noCached.headers.get('Pragma')).toBe('no-cache')
    expect(noCached.headers.get('Expires')).toBe('0')
  })

  it('should preserve original response status', () => {
    const original = json({ data: 'test' }, 201)
    const noCached = noCache(original)

    expect(noCached.status).toBe(201)
  })
})
