---
"@cloudwerk/core": patch
"@cloudwerk/cli": patch
"@cloudwerk/ui": patch
---

feat(core): Implement loader() functions for server-side data loading

- Added `NotFoundError` and `RedirectError` classes for loader control flow
- Added `LoaderArgs`, `LoaderFunction`, and `InferLoaderData` types
- Pages and layouts can export `loader()` functions that receive `{ params, request, context }`
- Loader data is spread into component props
- Layout loaders execute in parent to child order
- Throwing `NotFoundError` returns 404 response
- Throwing `RedirectError` returns redirect response
