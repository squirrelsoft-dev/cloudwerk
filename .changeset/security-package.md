---
"@cloudwerk/security": minor
"@cloudwerk/auth": patch
---

feat(security): Add new @cloudwerk/security package

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
