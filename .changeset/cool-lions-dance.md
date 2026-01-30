---
"@cloudwerk/auth": minor
---

feat(auth): implement authentication package for Cloudwerk

Add comprehensive authentication support for Cloudflare Workers:

- **Session Management**: KV-backed and cookie-based session stores with configurable TTL, secure cookie handling, and session rotation
- **Middleware**: Session validation middleware, route protection with role-based access control, and CSRF protection with double-submit cookie pattern
- **Context Helpers**: `getAuth()`, `getSession()`, `requireAuth()` for accessing auth state in handlers
- **Password Utilities**: Secure password hashing using Web Crypto API (PBKDF2) and cryptographically secure token generation
- **Credentials Provider**: Username/password authentication provider with customizable user lookup and password verification
- **Error Types**: Typed authentication errors (`AuthenticationError`, `AuthorizationError`, `SessionError`, `CSRFError`)
