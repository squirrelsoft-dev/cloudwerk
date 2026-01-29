# @cloudwerk/ui

## 0.9.0

### Patch Changes

- Updated dependencies [[`3245bb2`](https://github.com/squirrelsoft-dev/cloudwerk/commit/3245bb2d915e39f8fcab04dffb8901f610597c70)]:
  - @cloudwerk/core@0.9.0

## 0.8.0

### Patch Changes

- Updated dependencies [[`4958ac2`](https://github.com/squirrelsoft-dev/cloudwerk/commit/4958ac226bb6350e8f0cf8be32d1938d275df631)]:
  - @cloudwerk/core@0.8.0

## 0.7.2

### Patch Changes

- [#145](https://github.com/squirrelsoft-dev/cloudwerk/pull/145) [`fc2d8c3`](https://github.com/squirrelsoft-dev/cloudwerk/commit/fc2d8c3adb86078cc17b93ba11da29073da4b4ee) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Add README files to all published packages for npm display

- Updated dependencies [[`fc2d8c3`](https://github.com/squirrelsoft-dev/cloudwerk/commit/fc2d8c3adb86078cc17b93ba11da29073da4b4ee)]:
  - @cloudwerk/core@0.7.2
  - @cloudwerk/utils@0.6.1

## 0.7.1

### Patch Changes

- Updated dependencies [[`403005f`](https://github.com/squirrelsoft-dev/cloudwerk/commit/403005f8a15c838bb37f5c619e77510b09a71d63), [`9b9d131`](https://github.com/squirrelsoft-dev/cloudwerk/commit/9b9d131c7b4f6acbfef1b462a5e2b5c689f626a4)]:
  - @cloudwerk/core@0.7.1

## 0.7.0

### Patch Changes

- [#141](https://github.com/squirrelsoft-dev/cloudwerk/pull/141) [`3e0279d`](https://github.com/squirrelsoft-dev/cloudwerk/commit/3e0279d10a65f68880d30e5893b9d7a49e1d137b) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Split @cloudwerk/core into /runtime and /build subpackages for smaller Worker bundles
  - Add `@cloudwerk/core/runtime` entry point (10.8KB) with context, middleware, errors, and response helpers
  - Add `@cloudwerk/core/build` entry point (35.7KB) with compiler, scanner, resolver, and config utilities
  - Main `@cloudwerk/core` entry remains backwards compatible by re-exporting from both
  - Update consumer packages to import from appropriate subpackages

- Updated dependencies [[`3e0279d`](https://github.com/squirrelsoft-dev/cloudwerk/commit/3e0279d10a65f68880d30e5893b9d7a49e1d137b)]:
  - @cloudwerk/core@0.7.0

## 0.6.0

### Minor Changes

- [#136](https://github.com/squirrelsoft-dev/cloudwerk/pull/136) [`bc0f68c`](https://github.com/squirrelsoft-dev/cloudwerk/commit/bc0f68cb0f5054a9db929545f95394092c27c0dc) Thanks [@sbeardsley](https://github.com/sbeardsley)! - feat: release hydration utilities

  Release previously implemented but unpublished hydration utilities:

  **@cloudwerk/core:**
  - `hasUseClientDirective()` - Detect 'use client' directive
  - `generateComponentId()` - Generate unique component IDs
  - `createHydrationManifest()` / `addToHydrationManifest()` - Manifest creation
  - `serializeProps()` / `deserializeProps()` - Props serialization for hydration
  - `ClientComponentInfo`, `ClientComponentMeta`, `HydrationManifest` types

  **@cloudwerk/ui:**
  - `wrapForHydration()` - Wrap components with hydration metadata
  - `generateHydrationScript()` / `generateReactHydrationScript()` - Bootstrap scripts
  - `generatePreloadHints()` - Preload hints generation
  - `generateHydrationRuntime()` / `generateReactHydrationRuntime()` - Runtime code

  These utilities are required by @cloudwerk/cli@0.5.0 for client component hydration.

### Patch Changes

- Updated dependencies [[`bc0f68c`](https://github.com/squirrelsoft-dev/cloudwerk/commit/bc0f68cb0f5054a9db929545f95394092c27c0dc)]:
  - @cloudwerk/core@0.6.0

## 0.4.0

### Minor Changes

- [#120](https://github.com/squirrelsoft-dev/cloudwerk/pull/120) [`7c1cded`](https://github.com/squirrelsoft-dev/cloudwerk/commit/7c1cded422b9d6a52ae89267fa04b97fae279df1) Thanks [@sbeardsley](https://github.com/sbeardsley)! - feat(ui): add renderToStream() for native progressive streaming with Suspense support
  - Add `renderToStream()` function using Hono's `renderToReadableStream`
  - Support Suspense boundaries for async component streaming
  - Automatically prepend DOCTYPE html to streams
  - Configure with status, headers, and doctype options

## 0.3.0

### Minor Changes

- [#118](https://github.com/squirrelsoft-dev/cloudwerk/pull/118) [`f0b1b5a`](https://github.com/squirrelsoft-dev/cloudwerk/commit/f0b1b5a492f1c997540fee69303365d5bc2f649a) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Add loading.tsx for streaming and suspense boundaries
  - `loading.tsx` components display immediately during navigation while loaders fetch data
  - Uses streaming HTML responses for instant visual feedback
  - Loading boundaries render within parent layouts
  - Streaming can be disabled per-route via `config.streaming = false`
  - Closest loading boundary wins (nested takes precedence)

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
