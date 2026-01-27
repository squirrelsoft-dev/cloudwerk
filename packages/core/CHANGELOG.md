# @cloudwerk/core

## 0.1.1

### Patch Changes

- [#112](https://github.com/squirrelsoft-dev/cloudwerk/pull/112) [`ff7946d`](https://github.com/squirrelsoft-dev/cloudwerk/commit/ff7946d265035b114e149fb3b24d012c6d08704f) Thanks [@sbeardsley](https://github.com/sbeardsley)! - feat(core): Implement loader() functions for server-side data loading
  - Added `NotFoundError` and `RedirectError` classes for loader control flow
  - Added `LoaderArgs`, `LoaderFunction`, and `InferLoaderData` types
  - Pages and layouts can export `loader()` functions that receive `{ params, request, context }`
  - Loader data is spread into component props
  - Layout loaders execute in parent to child order
  - Throwing `NotFoundError` returns 404 response
  - Throwing `RedirectError` returns redirect response

## 0.1.0

### Minor Changes

- [#109](https://github.com/squirrelsoft-dev/cloudwerk/pull/109) [`2ca18e6`](https://github.com/squirrelsoft-dev/cloudwerk/commit/2ca18e62c84e50dbf0e92394c6c50963befdf70c) Thanks [@sbeardsley](https://github.com/sbeardsley)! - feat(ui): Add core renderer abstraction layer
  - New `@cloudwerk/ui` package with facade pattern for swappable UI renderers
  - Export `render()`, `html()`, `hydrate()` functions from `@cloudwerk/ui`
  - Add `UIConfig` type with `renderer` option to `@cloudwerk/core`
  - Initialize renderer from config at CLI app startup
  - Default renderer is Hono JSX, with support for custom renderer registration

## 0.0.6

### Patch Changes

- [`9b1016d`](https://github.com/squirrelsoft-dev/cloudwerk/commit/9b1016d3742b5b279437637a85bd3bf771ba7505) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Upgrade esbuild to 0.25.0 to address security vulnerability (GHSA-67mh-4wv8-2f99)

## 0.0.5

### Patch Changes

- [`92ca5fd`](https://github.com/squirrelsoft-dev/cloudwerk/commit/92ca5fd19d1c02be8d2ff7986970d397ce5fa8ce) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Fix CI/CD publishing with npm trusted publishing (OIDC)

## 0.0.4

### Patch Changes

- [`b32ba88`](https://github.com/squirrelsoft-dev/cloudwerk/commit/b32ba88801cee8a5c0e64c478b22ff578b9addd1) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Add repository field to package.json for npm trusted publishing

## 0.0.3

### Patch Changes

- [`23b3847`](https://github.com/squirrelsoft-dev/cloudwerk/commit/23b384733387e03b7b86fa6e743a843c4d316246) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Test CI/CD publishing with Node 22
