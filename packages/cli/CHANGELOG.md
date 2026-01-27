# @cloudwerk/cli

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
