---
"@cloudwerk/auth": patch
"@cloudwerk/vite-plugin": patch
---

fix(auth,vite-plugin): Address PR review comments for CSRF refactoring

**@cloudwerk/vite-plugin:**
- Fix `/auth/signin/:provider` route to call `handleSignInProvider` instead of incorrectly redirecting to login page for all providers
- Use auth config session strategy instead of hardcoding `'database'` in `buildAuthContext` and `buildPasskeyAuthContext`

**@cloudwerk/auth:**
- Refactor `handleSignOutPost` to deduplicate CSRF token rotation logic for JSON and redirect responses
