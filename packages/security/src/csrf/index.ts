/**
 * @cloudwerk/security - CSRF Module
 *
 * CSRF protection with double-submit cookie pattern.
 */

export { csrfMiddleware } from './middleware.js'
export {
  generateCsrfToken,
  setCsrfCookie,
  getCsrfTokenFromCookie,
  getCsrfTokenFromHeader,
  getCsrfTokenFromFormBody,
  verifyCsrfToken,
  rotateCsrfToken,
  DEFAULT_CSRF_COOKIE_NAME,
  DEFAULT_CSRF_HEADER_NAME,
  DEFAULT_CSRF_FORM_FIELD_NAME,
} from './token.js'
