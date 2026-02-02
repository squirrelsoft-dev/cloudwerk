/**
 * @cloudwerk/security - Secure Fetch Wrapper
 *
 * A fetch wrapper that automatically includes CSRF tokens and
 * X-Requested-With headers for secure AJAX requests.
 */

import type { SecureFetchOptions } from '../types.js'
import { getCsrfToken } from './csrf.js'

/** Global configuration for secure fetch */
let globalConfig: SecureFetchOptions = {}

/**
 * Configure secure fetch defaults.
 *
 * Set global configuration options that apply to all secureFetch calls.
 *
 * @param options - Configuration options
 *
 * @example
 * ```typescript
 * import { configureSecureFetch } from '@cloudwerk/security/client'
 *
 * // Set up once at app initialization
 * configureSecureFetch({
 *   baseUrl: '/api',
 *   credentials: 'include',
 * })
 * ```
 */
export function configureSecureFetch(options: SecureFetchOptions): void {
  globalConfig = { ...globalConfig, ...options }
}

/**
 * Reset secure fetch configuration to defaults.
 */
export function resetSecureFetch(): void {
  globalConfig = {}
}

/**
 * HTTP methods that require CSRF protection.
 */
const MUTATION_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']

/**
 * A secure fetch wrapper that automatically adds CSRF tokens and
 * X-Requested-With headers.
 *
 * This wrapper:
 * - Adds X-CSRF-Token header from the CSRF cookie
 * - Adds X-Requested-With: XMLHttpRequest header (forces CORS preflight)
 * - Sets credentials to 'same-origin' by default
 *
 * @param input - URL or Request object
 * @param init - Fetch options
 * @returns Promise resolving to Response
 *
 * @example
 * ```typescript
 * import { secureFetch } from '@cloudwerk/security/client'
 *
 * // POST request with automatic security headers
 * const response = await secureFetch('/api/users', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ name: 'Alice' }),
 * })
 * ```
 *
 * @example
 * ```typescript
 * // Works with FormData too
 * const formData = new FormData()
 * formData.append('file', fileInput.files[0])
 *
 * const response = await secureFetch('/api/upload', {
 *   method: 'POST',
 *   body: formData,
 * })
 * ```
 *
 * @example
 * ```typescript
 * // DELETE request
 * const response = await secureFetch(`/api/users/${userId}`, {
 *   method: 'DELETE',
 * })
 * ```
 */
export async function secureFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const config = globalConfig

  // Resolve URL
  let url: string
  if (input instanceof URL) {
    url = input.toString()
  } else if (typeof input === 'string') {
    // Prepend base URL if configured and URL is relative
    if (config.baseUrl && !input.startsWith('http://') && !input.startsWith('https://')) {
      url = `${config.baseUrl.replace(/\/$/, '')}/${input.replace(/^\//, '')}`
    } else {
      url = input
    }
  } else {
    url = input.url
  }

  // Determine method
  const method = (init?.method ?? 'GET').toUpperCase()

  // Build headers
  const headers = new Headers(init?.headers)

  // Add CSRF token for mutation methods
  if (MUTATION_METHODS.includes(method)) {
    const csrfCookieName = config.csrfCookieName ?? 'cloudwerk.csrf-token'
    const csrfHeaderName = config.csrfHeaderName ?? 'X-CSRF-Token'

    const csrfToken = getCsrfToken(csrfCookieName)
    if (csrfToken && !headers.has(csrfHeaderName)) {
      headers.set(csrfHeaderName, csrfToken)
    }

    // Add X-Requested-With header
    const requestedWithValue = config.requestedWithValue ?? 'XMLHttpRequest'
    if (!headers.has('X-Requested-With')) {
      headers.set('X-Requested-With', requestedWithValue)
    }
  }

  // Build fetch options
  const fetchOptions: RequestInit = {
    ...init,
    headers,
    credentials: init?.credentials ?? config.credentials ?? 'same-origin',
  }

  return fetch(url, fetchOptions)
}

/**
 * Convenience method for GET requests.
 *
 * @param url - URL to fetch
 * @param init - Additional fetch options
 * @returns Promise resolving to Response
 */
export function secureGet(
  url: string,
  init?: Omit<RequestInit, 'method'>
): Promise<Response> {
  return secureFetch(url, { ...init, method: 'GET' })
}

/**
 * Convenience method for POST requests.
 *
 * @param url - URL to fetch
 * @param body - Request body
 * @param init - Additional fetch options
 * @returns Promise resolving to Response
 */
export function securePost(
  url: string,
  body?: BodyInit | Record<string, unknown> | null,
  init?: Omit<RequestInit, 'method' | 'body'>
): Promise<Response> {
  let finalBody: BodyInit | null | undefined
  const headers = new Headers(init?.headers)

  // Auto-stringify objects and set Content-Type
  if (body && typeof body === 'object' && !(body instanceof FormData) &&
      !(body instanceof URLSearchParams) && !(body instanceof Blob) &&
      !(body instanceof ArrayBuffer) && !(body instanceof ReadableStream)) {
    finalBody = JSON.stringify(body)
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
  } else {
    finalBody = body as BodyInit | null | undefined
  }

  return secureFetch(url, { ...init, method: 'POST', body: finalBody, headers })
}

/**
 * Convenience method for PUT requests.
 *
 * @param url - URL to fetch
 * @param body - Request body
 * @param init - Additional fetch options
 * @returns Promise resolving to Response
 */
export function securePut(
  url: string,
  body?: BodyInit | Record<string, unknown> | null,
  init?: Omit<RequestInit, 'method' | 'body'>
): Promise<Response> {
  let finalBody: BodyInit | null | undefined
  const headers = new Headers(init?.headers)

  if (body && typeof body === 'object' && !(body instanceof FormData) &&
      !(body instanceof URLSearchParams) && !(body instanceof Blob) &&
      !(body instanceof ArrayBuffer) && !(body instanceof ReadableStream)) {
    finalBody = JSON.stringify(body)
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
  } else {
    finalBody = body as BodyInit | null | undefined
  }

  return secureFetch(url, { ...init, method: 'PUT', body: finalBody, headers })
}

/**
 * Convenience method for PATCH requests.
 *
 * @param url - URL to fetch
 * @param body - Request body
 * @param init - Additional fetch options
 * @returns Promise resolving to Response
 */
export function securePatch(
  url: string,
  body?: BodyInit | Record<string, unknown> | null,
  init?: Omit<RequestInit, 'method' | 'body'>
): Promise<Response> {
  let finalBody: BodyInit | null | undefined
  const headers = new Headers(init?.headers)

  if (body && typeof body === 'object' && !(body instanceof FormData) &&
      !(body instanceof URLSearchParams) && !(body instanceof Blob) &&
      !(body instanceof ArrayBuffer) && !(body instanceof ReadableStream)) {
    finalBody = JSON.stringify(body)
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
  } else {
    finalBody = body as BodyInit | null | undefined
  }

  return secureFetch(url, { ...init, method: 'PATCH', body: finalBody, headers })
}

/**
 * Convenience method for DELETE requests.
 *
 * @param url - URL to fetch
 * @param init - Additional fetch options
 * @returns Promise resolving to Response
 */
export function secureDelete(
  url: string,
  init?: Omit<RequestInit, 'method'>
): Promise<Response> {
  return secureFetch(url, { ...init, method: 'DELETE' })
}
