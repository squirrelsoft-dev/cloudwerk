/**
 * @cloudwerk/security - Client Entry Point
 *
 * Client-side helpers for secure fetch requests.
 *
 * @example
 * ```typescript
 * import { secureFetch, getCsrfToken } from '@cloudwerk/security/client'
 *
 * // Automatically includes CSRF token and X-Requested-With header
 * const response = await secureFetch('/api/users', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ name: 'Alice' }),
 * })
 * ```
 */

export {
  getCsrfToken,
  withCsrfToken,
  csrfInput,
  secureFetch,
  configureSecureFetch,
  resetSecureFetch,
  secureGet,
  securePost,
  securePut,
  securePatch,
  secureDelete,
} from './client/index.js'

export type { SecureFetchOptions } from './types.js'
