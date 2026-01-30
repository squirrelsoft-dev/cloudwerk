---
"@cloudwerk/auth": minor
---

feat(auth): implement v1 milestone features

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
