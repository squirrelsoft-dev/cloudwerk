# @cloudwerk/cli

## 0.12.0

### Minor Changes

- [#159](https://github.com/squirrelsoft-dev/cloudwerk/pull/159) [`afbcd2d`](https://github.com/squirrelsoft-dev/cloudwerk/commit/afbcd2d31f6177fff01601537dbe27eaaa065892) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Add importable binding singletons and context helpers

  **@cloudwerk/core:**
  - Add `@cloudwerk/core/bindings` module with proxy-based binding access (`bindings`, `getBinding`, `hasBinding`, `getBindingNames`)
  - Add `@cloudwerk/core/context` module with context helpers (`params`, `request`, `env`, `executionCtx`, `getRequestId`, `get`, `set`)

  **@cloudwerk/cli:**
  - Update `bindings generate-types` to generate `.cloudwerk/types/` for typed importable bindings
  - Automatically update `tsconfig.json` with paths for `@cloudwerk/core/bindings` and `@cloudwerk/core/context`

  **@cloudwerk/vite-plugin:**
  - Watch `wrangler.toml` for changes and auto-regenerate `.cloudwerk/types/` during development

### Patch Changes

- Updated dependencies [[`afbcd2d`](https://github.com/squirrelsoft-dev/cloudwerk/commit/afbcd2d31f6177fff01601537dbe27eaaa065892)]:
  - @cloudwerk/core@0.12.0
  - @cloudwerk/vite-plugin@0.5.0
  - @cloudwerk/ui@0.12.0

## 0.11.0

### Minor Changes

- [#156](https://github.com/squirrelsoft-dev/cloudwerk/pull/156) [`7e4ff97`](https://github.com/squirrelsoft-dev/cloudwerk/commit/7e4ff9729563861839178475208a42ae7d94e137) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Add `cloudwerk bindings` command for managing Cloudflare bindings
  - `cloudwerk bindings` - View all configured bindings (production or specific environment)
  - `cloudwerk bindings add [type]` - Add a new binding (d1, kv, r2, queue, do, secret)
  - `cloudwerk bindings remove [name]` - Remove a binding
  - `cloudwerk bindings update [name]` - Update an existing binding
  - `cloudwerk bindings generate-types` - Regenerate TypeScript env.d.ts

  Supports environment-specific bindings with `--env` flag. Automatically generates TypeScript type definitions in env.d.ts after modifications.

### Patch Changes

- Updated dependencies [[`7e4ff97`](https://github.com/squirrelsoft-dev/cloudwerk/commit/7e4ff9729563861839178475208a42ae7d94e137)]:
  - @cloudwerk/core@0.11.0
  - @cloudwerk/ui@0.11.0
  - @cloudwerk/vite-plugin@0.4.1

## 0.10.0

### Minor Changes

- [#154](https://github.com/squirrelsoft-dev/cloudwerk/pull/154) [`876b834`](https://github.com/squirrelsoft-dev/cloudwerk/commit/876b834c541d9bb097e099917b73766493280e48) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Add preview deployment support with `cloudwerk deploy` command
  - Add `cloudwerk deploy` CLI command that wraps `wrangler deploy` with environment support
  - Add `--env` flag to deploy to specific Cloudflare Workers environments (e.g., preview)
  - Add `--dry-run` flag to preview deployment without executing
  - Add `--skip-build` flag to skip the build step
  - Update wrangler.toml templates with Workers Static Assets configuration and preview environment
  - Add `preview` and `deploy` npm scripts to all templates
  - Fix production hydration by pre-scanning client components and using static imports
  - Add static asset serving via Workers Static Assets binding in production builds

### Patch Changes

- Updated dependencies [[`876b834`](https://github.com/squirrelsoft-dev/cloudwerk/commit/876b834c541d9bb097e099917b73766493280e48)]:
  - @cloudwerk/vite-plugin@0.4.0

## 0.9.0

### Patch Changes

- [#152](https://github.com/squirrelsoft-dev/cloudwerk/pull/152) [`3245bb2`](https://github.com/squirrelsoft-dev/cloudwerk/commit/3245bb2d915e39f8fcab04dffb8901f610597c70) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Add publicDir configuration for serving static assets from public/ folder
  - Added `publicDir` option to `CloudwerkConfig` (default: "public")
  - Vite plugin now passes `publicDir` to Vite's built-in static file serving
  - Fixed CLI build command to avoid duplicating static assets in dist/ output
  - Added integration tests for static asset serving

- Updated dependencies [[`3245bb2`](https://github.com/squirrelsoft-dev/cloudwerk/commit/3245bb2d915e39f8fcab04dffb8901f610597c70)]:
  - @cloudwerk/core@0.9.0
  - @cloudwerk/vite-plugin@0.3.0
  - @cloudwerk/ui@0.9.0

## 0.8.0

### Patch Changes

- Updated dependencies [[`4958ac2`](https://github.com/squirrelsoft-dev/cloudwerk/commit/4958ac226bb6350e8f0cf8be32d1938d275df631)]:
  - @cloudwerk/core@0.8.0
  - @cloudwerk/vite-plugin@0.2.0
  - @cloudwerk/ui@0.8.0

## 0.7.2

### Patch Changes

- [#145](https://github.com/squirrelsoft-dev/cloudwerk/pull/145) [`fc2d8c3`](https://github.com/squirrelsoft-dev/cloudwerk/commit/fc2d8c3adb86078cc17b93ba11da29073da4b4ee) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Add README files to all published packages for npm display

- Updated dependencies [[`fc2d8c3`](https://github.com/squirrelsoft-dev/cloudwerk/commit/fc2d8c3adb86078cc17b93ba11da29073da4b4ee)]:
  - @cloudwerk/core@0.7.2
  - @cloudwerk/ui@0.7.2
  - @cloudwerk/vite-plugin@0.1.3

## 0.7.0

### Patch Changes

- [#141](https://github.com/squirrelsoft-dev/cloudwerk/pull/141) [`3e0279d`](https://github.com/squirrelsoft-dev/cloudwerk/commit/3e0279d10a65f68880d30e5893b9d7a49e1d137b) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Split @cloudwerk/core into /runtime and /build subpackages for smaller Worker bundles
  - Add `@cloudwerk/core/runtime` entry point (10.8KB) with context, middleware, errors, and response helpers
  - Add `@cloudwerk/core/build` entry point (35.7KB) with compiler, scanner, resolver, and config utilities
  - Main `@cloudwerk/core` entry remains backwards compatible by re-exporting from both
  - Update consumer packages to import from appropriate subpackages

- Updated dependencies [[`3e0279d`](https://github.com/squirrelsoft-dev/cloudwerk/commit/3e0279d10a65f68880d30e5893b9d7a49e1d137b)]:
  - @cloudwerk/core@0.7.0
  - @cloudwerk/ui@0.7.0
  - @cloudwerk/vite-plugin@0.1.1

## 0.6.0

### Patch Changes

- Updated dependencies [[`bc0f68c`](https://github.com/squirrelsoft-dev/cloudwerk/commit/bc0f68cb0f5054a9db929545f95394092c27c0dc)]:
  - @cloudwerk/core@0.6.0
  - @cloudwerk/ui@0.6.0

## 0.5.0

### Minor Changes

- [#134](https://github.com/squirrelsoft-dev/cloudwerk/pull/134) [`1a74a42`](https://github.com/squirrelsoft-dev/cloudwerk/commit/1a74a4250d0ccd135160326c360f9380afd0344b) Thanks [@sbeardsley](https://github.com/sbeardsley)! - feat(cli): wire hydration infrastructure into rendering pipeline

  Client components marked with `'use client'` directive are now hydrated on the client side:
  - Register `/__cloudwerk/*` routes to serve client bundles and hydration runtime
  - Track client components during page and layout loading
  - Inject hydration scripts into HTML responses for pages with client components
  - Support both Hono JSX and React renderers
  - Add request-scoped manifest generation for efficient per-request hydration

  The Counter component in `template-hono-jsx` is now interactive - clicking increments the count.

  Closes #133

## 0.4.0

### Minor Changes

- [#120](https://github.com/squirrelsoft-dev/cloudwerk/pull/120) [`7c1cded`](https://github.com/squirrelsoft-dev/cloudwerk/commit/7c1cded422b9d6a52ae89267fa04b97fae279df1) Thanks [@sbeardsley](https://github.com/sbeardsley)! - feat(ui): add renderToStream() for native progressive streaming with Suspense support
  - Add `renderToStream()` function using Hono's `renderToReadableStream`
  - Support Suspense boundaries for async component streaming
  - Automatically prepend DOCTYPE html to streams
  - Configure with status, headers, and doctype options

### Patch Changes

- Updated dependencies [[`7c1cded`](https://github.com/squirrelsoft-dev/cloudwerk/commit/7c1cded422b9d6a52ae89267fa04b97fae279df1)]:
  - @cloudwerk/ui@0.4.0

## 0.3.0

### Minor Changes

- [#118](https://github.com/squirrelsoft-dev/cloudwerk/pull/118) [`f0b1b5a`](https://github.com/squirrelsoft-dev/cloudwerk/commit/f0b1b5a492f1c997540fee69303365d5bc2f649a) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Add loading.tsx for streaming and suspense boundaries
  - `loading.tsx` components display immediately during navigation while loaders fetch data
  - Uses streaming HTML responses for instant visual feedback
  - Loading boundaries render within parent layouts
  - Streaming can be disabled per-route via `config.streaming = false`
  - Closest loading boundary wins (nested takes precedence)

### Patch Changes

- Updated dependencies [[`f0b1b5a`](https://github.com/squirrelsoft-dev/cloudwerk/commit/f0b1b5a492f1c997540fee69303365d5bc2f649a)]:
  - @cloudwerk/core@0.3.0
  - @cloudwerk/ui@0.3.0

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

- Updated dependencies [[`5d76279`](https://github.com/squirrelsoft-dev/cloudwerk/commit/5d76279cb84f7b05e022f3ec7ec2a33d98409829)]:
  - @cloudwerk/core@0.2.1

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

### Patch Changes

- Updated dependencies [[`7808cf6`](https://github.com/squirrelsoft-dev/cloudwerk/commit/7808cf6059c02192b09a025f0eb221e4c6d944e9)]:
  - @cloudwerk/core@0.2.0

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

- Updated dependencies [[`ff7946d`](https://github.com/squirrelsoft-dev/cloudwerk/commit/ff7946d265035b114e149fb3b24d012c6d08704f)]:
  - @cloudwerk/core@0.1.1
  - @cloudwerk/ui@0.1.1

## 0.1.0

### Minor Changes

- [#109](https://github.com/squirrelsoft-dev/cloudwerk/pull/109) [`2ca18e6`](https://github.com/squirrelsoft-dev/cloudwerk/commit/2ca18e62c84e50dbf0e92394c6c50963befdf70c) Thanks [@sbeardsley](https://github.com/sbeardsley)! - feat(ui): Add core renderer abstraction layer
  - New `@cloudwerk/ui` package with facade pattern for swappable UI renderers
  - Export `render()`, `html()`, `hydrate()` functions from `@cloudwerk/ui`
  - Add `UIConfig` type with `renderer` option to `@cloudwerk/core`
  - Initialize renderer from config at CLI app startup
  - Default renderer is Hono JSX, with support for custom renderer registration

### Patch Changes

- Updated dependencies [[`2ca18e6`](https://github.com/squirrelsoft-dev/cloudwerk/commit/2ca18e62c84e50dbf0e92394c6c50963befdf70c)]:
  - @cloudwerk/core@0.1.0
  - @cloudwerk/ui@0.1.0

## 0.0.6

### Patch Changes

- [`9b1016d`](https://github.com/squirrelsoft-dev/cloudwerk/commit/9b1016d3742b5b279437637a85bd3bf771ba7505) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Upgrade esbuild to 0.25.0 to address security vulnerability (GHSA-67mh-4wv8-2f99)

- Updated dependencies [[`9b1016d`](https://github.com/squirrelsoft-dev/cloudwerk/commit/9b1016d3742b5b279437637a85bd3bf771ba7505)]:
  - @cloudwerk/core@0.0.6

## 0.0.5

### Patch Changes

- [`92ca5fd`](https://github.com/squirrelsoft-dev/cloudwerk/commit/92ca5fd19d1c02be8d2ff7986970d397ce5fa8ce) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Fix CI/CD publishing with npm trusted publishing (OIDC)

- Updated dependencies [[`92ca5fd`](https://github.com/squirrelsoft-dev/cloudwerk/commit/92ca5fd19d1c02be8d2ff7986970d397ce5fa8ce)]:
  - @cloudwerk/core@0.0.5

## 0.0.4

### Patch Changes

- [`b32ba88`](https://github.com/squirrelsoft-dev/cloudwerk/commit/b32ba88801cee8a5c0e64c478b22ff578b9addd1) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Add repository field to package.json for npm trusted publishing

- Updated dependencies [[`b32ba88`](https://github.com/squirrelsoft-dev/cloudwerk/commit/b32ba88801cee8a5c0e64c478b22ff578b9addd1)]:
  - @cloudwerk/core@0.0.4

## 0.0.3

### Patch Changes

- Updated dependencies [[`23b3847`](https://github.com/squirrelsoft-dev/cloudwerk/commit/23b384733387e03b7b86fa6e743a843c4d316246)]:
  - @cloudwerk/core@0.0.3

## 0.0.2

### Patch Changes

- [`5143630`](https://github.com/squirrelsoft-dev/cloudwerk/commit/51436307b1044795595490a525459a4d96934943) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Fix workspace protocol resolution - use workspace:^ instead of workspace:\* so pnpm converts it to proper semver on publish
