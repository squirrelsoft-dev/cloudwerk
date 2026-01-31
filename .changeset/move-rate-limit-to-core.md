---
"@cloudwerk/core": minor
"@cloudwerk/auth": minor
---

Move rate limiting utilities from @cloudwerk/auth to @cloudwerk/core/middleware.

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
