/**
 * @cloudwerk/security - Client Module
 *
 * Client-side helpers for secure fetch requests.
 */

export { getCsrfToken, withCsrfToken, csrfInput } from './csrf.js'
export {
  secureFetch,
  configureSecureFetch,
  resetSecureFetch,
  secureGet,
  securePost,
  securePut,
  securePatch,
  secureDelete,
} from './fetch.js'
