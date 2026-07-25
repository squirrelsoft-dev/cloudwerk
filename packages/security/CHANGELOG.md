# @cloudwerk/security

## 0.3.0

### Minor Changes

- [#298](https://github.com/squirrelsoft-dev/cloudwerk/pull/298) [`53f62e4`](https://github.com/squirrelsoft-dev/cloudwerk/commit/53f62e4cc626f5f57477a921e18eeedcaccc3f55) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Bump `vitest` from ^1.0.0 to ^4.0.0 and `@vitest/coverage-v8` from ^1.0.0 to ^4.0.0 across the root and every workspace package with a test script. This clears the critical advisory GHSA-5xrq-8626-4rwp (arbitrary file read/execute via the Vitest UI server, fixed in ≥3.2.6) and collapses the duplicate `vite@5.4.21` that vitest 1's vite-node pulled in — the lockfile now resolves a single `vite@6.4.3`. Vitest 4 requires Vite ≥6 and Node ≥20, both already satisfied. No `vitest.config.*`/`vite.config.*` migration was needed: no config used the removed `coverage.all`/`coverage.extensions` options (all already use `coverage.include`), no constructor `vi.spyOn` usage, no snapshots to re-baseline. All 1605 tests pass on vitest 4.1.10.

### Patch Changes

- Updated dependencies [[`fea241d`](https://github.com/squirrelsoft-dev/cloudwerk/commit/fea241db0bf53c6c1c586abf66d7064cd7b9d685), [`be8b381`](https://github.com/squirrelsoft-dev/cloudwerk/commit/be8b381726429cb8a1a847364a67abf2adcfc690), [`53f62e4`](https://github.com/squirrelsoft-dev/cloudwerk/commit/53f62e4cc626f5f57477a921e18eeedcaccc3f55), [`bf8ddb2`](https://github.com/squirrelsoft-dev/cloudwerk/commit/bf8ddb2a74f26fd83e269eaa04d318aa68d055de)]:
  - @cloudwerk/core@0.17.0

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
