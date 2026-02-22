# @cloudwerk/security

## 0.2.1

### Patch Changes

- Updated dependencies [[`00cc9c5`](https://github.com/squirrelsoft-dev/cloudwerk/commit/00cc9c509f0f19ab42a1cb7f8fcaec33fd4ff354)]:
  - @cloudwerk/core@0.15.3

## 0.2.0

### Minor Changes

- [#233](https://github.com/squirrelsoft-dev/cloudwerk/pull/233) [`57261a7`](https://github.com/squirrelsoft-dev/cloudwerk/commit/57261a7bc30d6299cc7107f29a4e8f848655be16) Thanks [@sbeardsley](https://github.com/sbeardsley)! - feat(security): Add new @cloudwerk/security package

  Introduces a comprehensive security middleware package for Cloudwerk applications:

  **New Features:**
  - CSRF protection with double-submit cookie pattern
  - Security headers middleware (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, etc.)
  - Content Security Policy (CSP) header generation with nonce support
  - Origin validation middleware for CSRF prevention
  - X-Requested-With validation to force CORS preflight
  - Combined `securityMiddleware()` that composes all protections
  - Client-side helpers: `secureFetch()`, `getCsrfToken()`, `withCsrfToken()`

  **Migration:**
  - CSRF imports from `@cloudwerk/auth` are now deprecated
  - Use `import { csrfMiddleware } from '@cloudwerk/security'` instead
  - Existing imports continue to work with a deprecation warning

  **GitHub Issue #232:**
  - Auth handlers now rotate CSRF tokens after successful authentication
  - Passkey routes are now protected by the security middleware infrastructure
