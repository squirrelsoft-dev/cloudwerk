# @cloudwerk/auth

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
