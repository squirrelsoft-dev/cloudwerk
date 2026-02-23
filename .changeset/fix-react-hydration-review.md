---
"@cloudwerk/cli": patch
"@cloudwerk/vite-plugin": patch
---

Fix XSS vulnerability in React hydration data script injection, scope MISSING_EXPORT warning suppression to known-optional exports, and use JSON.stringify for route pattern keys in client entry.
