# @cloudwerk/core

## 0.9.0

### Minor Changes

- [#152](https://github.com/squirrelsoft-dev/cloudwerk/pull/152) [`3245bb2`](https://github.com/squirrelsoft-dev/cloudwerk/commit/3245bb2d915e39f8fcab04dffb8901f610597c70) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Add publicDir configuration for serving static assets from public/ folder
  - Added `publicDir` option to `CloudwerkConfig` (default: "public")
  - Vite plugin now passes `publicDir` to Vite's built-in static file serving
  - Fixed CLI build command to avoid duplicating static assets in dist/ output
  - Added integration tests for static asset serving

## 0.8.0

### Minor Changes

- [#149](https://github.com/squirrelsoft-dev/cloudwerk/pull/149) [`4958ac2`](https://github.com/squirrelsoft-dev/cloudwerk/commit/4958ac226bb6350e8f0cf8be32d1938d275df631) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Add support for error.tsx and not-found.tsx boundary pages
  - Error boundaries catch errors in loaders and render custom error UI
  - Not-found boundaries render when NotFoundError is thrown or for 404s
  - Nested boundaries override parent boundaries (closest wins)
  - API routes return JSON errors, page routes render HTML boundaries

## 0.7.2

### Patch Changes

- [#145](https://github.com/squirrelsoft-dev/cloudwerk/pull/145) [`fc2d8c3`](https://github.com/squirrelsoft-dev/cloudwerk/commit/fc2d8c3adb86078cc17b93ba11da29073da4b4ee) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Add README files to all published packages for npm display

- Updated dependencies [[`fc2d8c3`](https://github.com/squirrelsoft-dev/cloudwerk/commit/fc2d8c3adb86078cc17b93ba11da29073da4b4ee)]:
  - @cloudwerk/utils@0.6.1

## 0.7.1

### Patch Changes

- [#143](https://github.com/squirrelsoft-dev/cloudwerk/pull/143) [`403005f`](https://github.com/squirrelsoft-dev/cloudwerk/commit/403005f8a15c838bb37f5c619e77510b09a71d63) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Fix middleware and catch-all route handling
  - Fix middleware import to use named export `{ middleware }`
  - Wrap middleware with `createMiddlewareAdapter` for Hono compatibility
  - Fix catch-all route patterns to use Hono-compatible `:slug{.+}` syntax
  - Fix optional catch-all patterns to use `:slug{.*}` with base path registration

- [#143](https://github.com/squirrelsoft-dev/cloudwerk/pull/143) [`9b9d131`](https://github.com/squirrelsoft-dev/cloudwerk/commit/9b9d131c7b4f6acbfef1b462a5e2b5c689f626a4) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Fix routes directory structure to use `app/` instead of `app/routes/`
  - Fixed `resolveRoutesPath()` in core to handle when `routesDir === appDir`, preventing incorrect resolution to `app/app/`
  - Updated all create-app templates to place routes directly in `app/` directory (matching Next.js convention)
  - Removed `routesDir: 'app/routes'` override from template configs
  - Updated installation docs to reflect actual CLI prompts

## 0.7.0

### Minor Changes

- [#141](https://github.com/squirrelsoft-dev/cloudwerk/pull/141) [`3e0279d`](https://github.com/squirrelsoft-dev/cloudwerk/commit/3e0279d10a65f68880d30e5893b9d7a49e1d137b) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Split @cloudwerk/core into /runtime and /build subpackages for smaller Worker bundles
  - Add `@cloudwerk/core/runtime` entry point (10.8KB) with context, middleware, errors, and response helpers
  - Add `@cloudwerk/core/build` entry point (35.7KB) with compiler, scanner, resolver, and config utilities
  - Main `@cloudwerk/core` entry remains backwards compatible by re-exporting from both
  - Update consumer packages to import from appropriate subpackages

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

## 0.3.0

### Minor Changes

- [#118](https://github.com/squirrelsoft-dev/cloudwerk/pull/118) [`f0b1b5a`](https://github.com/squirrelsoft-dev/cloudwerk/commit/f0b1b5a492f1c997540fee69303365d5bc2f649a) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Add loading.tsx for streaming and suspense boundaries
  - `loading.tsx` components display immediately during navigation while loaders fetch data
  - Uses streaming HTML responses for instant visual feedback
  - Loading boundaries render within parent layouts
  - Streaming can be disabled per-route via `config.streaming = false`
  - Closest loading boundary wins (nested takes precedence)

## 0.2.1

### Patch Changes

- [#116](https://github.com/squirrelsoft-dev/cloudwerk/pull/116) [`5d76279`](https://github.com/squirrelsoft-dev/cloudwerk/commit/5d76279cb84f7b05e022f3ec7ec2a33d98409829) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Add error boundary support with error.tsx and not-found.tsx components
  - Add `ErrorBoundaryProps` and `NotFoundProps` type definitions
  - Add `notFound()` helper function for triggering 404 responses
  - Add `resolveErrorBoundary()` and `resolveNotFoundBoundary()` resolver functions
  - Add module loaders for error.tsx and not-found.tsx files
  - Integrate error boundary rendering in route handlers with proper status codes
  - Boundaries resolve from nearest file up the directory tree (closest wins)
  - Boundaries render within their parent layouts

## 0.2.0

### Minor Changes

- [#114](https://github.com/squirrelsoft-dev/cloudwerk/pull/114) [`7808cf6`](https://github.com/squirrelsoft-dev/cloudwerk/commit/7808cf6059c02192b09a025f0eb221e4c6d944e9) Thanks [@sbeardsley](https://github.com/sbeardsley)! - feat(core): implement action() functions for form submissions and mutations
  - Add `ActionArgs`, `ActionFunction`, and `InferActionData` types mirroring loader pattern
  - Add `actionData` prop to `PageProps` for re-rendering with action results
  - Support both single `action()` export and named method exports (POST, PUT, PATCH, DELETE)
  - Register POST/PUT/PATCH/DELETE handlers for pages with actions
  - Handle Response returns (redirect, json) passed through directly
  - Handle data returns by re-running loader and rendering with actionData
  - Support `NotFoundError` and `RedirectError` in actions

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
