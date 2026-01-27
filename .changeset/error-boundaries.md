---
"@cloudwerk/core": patch
"@cloudwerk/cli": patch
---

Add error boundary support with error.tsx and not-found.tsx components

- Add `ErrorBoundaryProps` and `NotFoundProps` type definitions
- Add `notFound()` helper function for triggering 404 responses
- Add `resolveErrorBoundary()` and `resolveNotFoundBoundary()` resolver functions
- Add module loaders for error.tsx and not-found.tsx files
- Integrate error boundary rendering in route handlers with proper status codes
- Boundaries resolve from nearest file up the directory tree (closest wins)
- Boundaries render within their parent layouts
