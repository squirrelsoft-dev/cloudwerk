# @cloudwerk/auth

## 0.4.0

### Minor Changes

- [#298](https://github.com/squirrelsoft-dev/cloudwerk/pull/298) [`53f62e4`](https://github.com/squirrelsoft-dev/cloudwerk/commit/53f62e4cc626f5f57477a921e18eeedcaccc3f55) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Bump `vitest` from ^1.0.0 to ^4.0.0 and `@vitest/coverage-v8` from ^1.0.0 to ^4.0.0 across the root and every workspace package with a test script. This clears the critical advisory GHSA-5xrq-8626-4rwp (arbitrary file read/execute via the Vitest UI server, fixed in ≥3.2.6) and collapses the duplicate `vite@5.4.21` that vitest 1's vite-node pulled in — the lockfile now resolves a single `vite@6.4.3`. Vitest 4 requires Vite ≥6 and Node ≥20, both already satisfied. No `vitest.config.*`/`vite.config.*` migration was needed: no config used the removed `coverage.all`/`coverage.extensions` options (all already use `coverage.include`), no constructor `vi.spyOn` usage, no snapshots to re-baseline. All 1605 tests pass on vitest 4.1.10.

### Patch Changes

- [#297](https://github.com/squirrelsoft-dev/cloudwerk/pull/297) [`ef6af28`](https://github.com/squirrelsoft-dev/cloudwerk/commit/ef6af28c13821bda64908279a4bcd10733a3fee6) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Leaf dependency batch (Groups C/D/G/H/I from the dependency audit):

  - **Group C:** `jose` 5 → 6 (`@cloudwerk/auth`). cloudwerk only uses `SignJWT`,
    `jwtVerify`, and `jose.errors.*` (cookie-store.ts) — none removed in v6.
  - **Group D:** `@hono/node-server` 1 → 2, `@hono/vite-dev-server` 0.18 → 0.26,
    `@hono/vite-build` 1.11 (already in range) in `@cloudwerk/cli`; `@hono/vite-dev-server`
    0.18 → 0.26 (dev + peer) in `@cloudwerk/vite-plugin`. Both 0.26 and 2.0 are ESM-only
    (cli/vite-plugin are ESM); `@hono/node-server` v2 keeps the public API.
  - **Group G:** `@clack/prompts` 0.8 → 1 (`@cloudwerk/create-app`, ESM-only).
    `commander` unchanged (its 15 bump is deferred to the Node 22 floor).
  - **Group H:** `vite-tsconfig-paths` 5 → 6 (`examples/feature-flags`, private — no
    published change, included for completeness).
  - **Group I:** `@changesets/changelog-github` 0.5 → 0.7 (root devDep, additive
    `disableThanks` option).

  Verified: `pnpm install`, `pnpm build` (14/14), `pnpm test` (27/27 tasks, 0 failures —
  auth 331, cli 48, vite-plugin 123, create-app 55), `pnpm lint` (0 errors). The
  `examples/feature-flags` build completes successfully; a pre-existing static-generation
  warning about the `@/services/flags/service` alias is reproducible on `main` with the
  prior `vite-tsconfig-paths` 5.x and is unrelated to this bump.

- Updated dependencies [[`fea241d`](https://github.com/squirrelsoft-dev/cloudwerk/commit/fea241db0bf53c6c1c586abf66d7064cd7b9d685), [`be8b381`](https://github.com/squirrelsoft-dev/cloudwerk/commit/be8b381726429cb8a1a847364a67abf2adcfc690), [`53f62e4`](https://github.com/squirrelsoft-dev/cloudwerk/commit/53f62e4cc626f5f57477a921e18eeedcaccc3f55), [`bf8ddb2`](https://github.com/squirrelsoft-dev/cloudwerk/commit/bf8ddb2a74f26fd83e269eaa04d318aa68d055de)]:
  - @cloudwerk/core@0.17.0
  - @cloudwerk/security@0.3.0

## 0.3.1

### Patch Changes

- Updated dependencies [[`00cc9c5`](https://github.com/squirrelsoft-dev/cloudwerk/commit/00cc9c509f0f19ab42a1cb7f8fcaec33fd4ff354)]:
  - @cloudwerk/core@0.15.3
  - @cloudwerk/security@0.2.1

## 0.3.0

### Minor Changes

- [#242](https://github.com/squirrelsoft-dev/cloudwerk/pull/242) [`adb6698`](https://github.com/squirrelsoft-dev/cloudwerk/commit/adb6698860957a36cb30c48a74012e94cdf67ca3) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Add D1 user adapter with RBAC support for database-backed authentication

## 0.2.3

### Patch Changes

- [#236](https://github.com/squirrelsoft-dev/cloudwerk/pull/236) [`d59696d`](https://github.com/squirrelsoft-dev/cloudwerk/commit/d59696d1d4d64131f025769daeda7986b0e9da30) Thanks [@sbeardsley](https://github.com/sbeardsley)! - fix(auth,vite-plugin): Address PR review comments for CSRF refactoring

  **@cloudwerk/vite-plugin:**
  - Fix `/auth/signin/:provider` route to call `handleSignInProvider` instead of incorrectly redirecting to login page for all providers
  - Use auth config session strategy instead of hardcoding `'database'` in `buildAuthContext` and `buildPasskeyAuthContext`

  **@cloudwerk/auth:**
  - Refactor `handleSignOutPost` to deduplicate CSRF token rotation logic for JSON and redirect responses

## 0.2.2

### Patch Changes

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

- Updated dependencies [[`57261a7`](https://github.com/squirrelsoft-dev/cloudwerk/commit/57261a7bc30d6299cc7107f29a4e8f848655be16)]:
  - @cloudwerk/security@0.2.0

## 0.2.1

### Patch Changes

- Updated dependencies [[`30285a8`](https://github.com/squirrelsoft-dev/cloudwerk/commit/30285a8468f670bb0c57386c3a470f19bba2ee49)]:
  - @cloudwerk/core@0.15.1

## 0.2.0

### Minor Changes

- [#225](https://github.com/squirrelsoft-dev/cloudwerk/pull/225) [`3a54d33`](https://github.com/squirrelsoft-dev/cloudwerk/commit/3a54d330f2eb5e1bbb5c1aef62917e061df61ef6) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Move rate limiting utilities from @cloudwerk/auth to @cloudwerk/core/middleware.

  **@cloudwerk/core/middleware** now exports:
  - `createRateLimiter` - Core rate limiter factory
  - `createFixedWindowStorage` - Fixed window KV storage strategy
  - `createSlidingWindowStorage` - Sliding window KV storage strategy
  - `createRateLimitMiddleware` - Middleware helper
  - `getClientIP` - Extract client IP from request headers
  - `defaultKeyGenerator` - Default key generator using client IP
  - All related types (`RateLimitConfig`, `RateLimitResult`, `RateLimitStorage`, etc.)

  **@cloudwerk/auth/rate-limit** now:
  - Re-exports all utilities from `@cloudwerk/core/middleware` for backwards compatibility
  - Keeps auth-specific rate limiters: `createLoginRateLimiter`, `createPasswordResetRateLimiter`, `createEmailVerificationRateLimiter`

  Existing code importing from `@cloudwerk/auth/rate-limit` will continue to work unchanged.

### Patch Changes

- Updated dependencies [[`3a54d33`](https://github.com/squirrelsoft-dev/cloudwerk/commit/3a54d330f2eb5e1bbb5c1aef62917e061df61ef6)]:
  - @cloudwerk/core@0.15.0

## 0.1.1

### Patch Changes

- Updated dependencies [[`5f38299`](https://github.com/squirrelsoft-dev/cloudwerk/commit/5f3829954b73d119ef57bceddc6c806a5fbaca3c)]:
  - @cloudwerk/core@0.14.0

## 0.1.0

### Minor Changes

- [#217](https://github.com/squirrelsoft-dev/cloudwerk/pull/217) [`3bed667`](https://github.com/squirrelsoft-dev/cloudwerk/commit/3bed667fcf5f6d1cd03394175a502aef130d65aa) Thanks [@sbeardsley](https://github.com/sbeardsley)! - feat(auth): implement v1 milestone features
  - Add Email (magic link) provider with KV token storage
  - Add Passkey/WebAuthn provider with registration and authentication flows
  - Add RBAC module with role inheritance, wildcard permissions, and ownership checks
  - Add rate limiting module with fixed window and sliding window strategies
  - Add multi-tenancy module with subdomain, header, path, cookie, and custom resolution strategies
  - Add client-side utilities (signIn, signOut, getSession, auth state store)

  New exports:
  - `@cloudwerk/auth/rbac` - Role-based access control
  - `@cloudwerk/auth/rate-limit` - Rate limiting for auth endpoints
  - `@cloudwerk/auth/tenant` - Multi-tenant authentication
  - `@cloudwerk/auth/client` - Client-side auth utilities

- [#217](https://github.com/squirrelsoft-dev/cloudwerk/pull/217) [`75d14f2`](https://github.com/squirrelsoft-dev/cloudwerk/commit/75d14f2384057245da819b7de456f90be5251d42) Thanks [@sbeardsley](https://github.com/sbeardsley)! - feat(auth): implement authentication package for Cloudwerk

  Add comprehensive authentication support for Cloudflare Workers:
  - **Session Management**: KV-backed and cookie-based session stores with configurable TTL, secure cookie handling, and session rotation
  - **Middleware**: Session validation middleware, route protection with role-based access control, and CSRF protection with double-submit cookie pattern
  - **Context Helpers**: `getAuth()`, `getSession()`, `requireAuth()` for accessing auth state in handlers
  - **Password Utilities**: Secure password hashing using Web Crypto API (PBKDF2) and cryptographically secure token generation
  - **Credentials Provider**: Username/password authentication provider with customizable user lookup and password verification
  - **Error Types**: Typed authentication errors (`AuthenticationError`, `AuthorizationError`, `SessionError`, `CSRFError`)

### Patch Changes

- Updated dependencies [[`96b77e6`](https://github.com/squirrelsoft-dev/cloudwerk/commit/96b77e6056f5b6c522dfaf07264aafa48f26249f), [`068b10f`](https://github.com/squirrelsoft-dev/cloudwerk/commit/068b10ffbe84dbbe38307c3ebdfe415f53a1904b), [`c179642`](https://github.com/squirrelsoft-dev/cloudwerk/commit/c179642bd67ced2d170bcdb4a723767aacd81eb0), [`39d7a47`](https://github.com/squirrelsoft-dev/cloudwerk/commit/39d7a4783a5aca94073cdd6b142cc74789856e61)]:
  - @cloudwerk/core@0.13.0
