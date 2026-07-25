# @cloudwerk/ui

## 0.17.0

### Minor Changes

- [#298](https://github.com/squirrelsoft-dev/cloudwerk/pull/298) [`53f62e4`](https://github.com/squirrelsoft-dev/cloudwerk/commit/53f62e4cc626f5f57477a921e18eeedcaccc3f55) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Bump `vitest` from ^1.0.0 to ^4.0.0 and `@vitest/coverage-v8` from ^1.0.0 to ^4.0.0 across the root and every workspace package with a test script. This clears the critical advisory GHSA-5xrq-8626-4rwp (arbitrary file read/execute via the Vitest UI server, fixed in ≥3.2.6) and collapses the duplicate `vite@5.4.21` that vitest 1's vite-node pulled in — the lockfile now resolves a single `vite@6.4.3`. Vitest 4 requires Vite ≥6 and Node ≥20, both already satisfied. No `vitest.config.*`/`vite.config.*` migration was needed: no config used the removed `coverage.all`/`coverage.extensions` options (all already use `coverage.include`), no constructor `vi.spyOn` usage, no snapshots to re-baseline. All 1605 tests pass on vitest 4.1.10.

### Patch Changes

- [#294](https://github.com/squirrelsoft-dev/cloudwerk/pull/294) [`fea241d`](https://github.com/squirrelsoft-dev/cloudwerk/commit/fea241db0bf53c6c1c586abf66d7064cd7b9d685) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Security/patch in-range dependency batch (Group A from the dependency audit).

  Bumps resolved versions within existing ranges — no major bumps, no engine-floor
  change, no `packageManager` change, no `wrangler` bump, no `esbuild` override change:

  - hono ^4.0.0 → 4.12.32 (clears 31 security advisories)
  - vite → 6.4.3 (clears the direct vite advisories; transitive vite via
    astro/vitest is out of scope for this batch)
  - turbo ^2.0.0 → 2.10.6 (clears 2 advisories, ≥2.9.14)
  - @hono/vite-build → 1.11.1, @inquirer/prompts → 8.5.2, fs-extra → 11.4.0,
    motion → 12.42.2, prettier → 3.9.6, @changesets/cli → 2.31.1,
    @swc/core → 1.15.46, react/react-dom → 19.2.8, @types/react → 19.2.17,
    @tailwindcss/vite → 4.3.3, tailwindcss → 4.3.3

  The `@cloudwerk/cli` `vite` range is unchanged (`^5.0.0 || ^6.0.0 || ^7.0.0`);
  its resolved version is pinned to 6.4.3 to avoid an unintended 6→7 major jump.

- Updated dependencies [[`fea241d`](https://github.com/squirrelsoft-dev/cloudwerk/commit/fea241db0bf53c6c1c586abf66d7064cd7b9d685), [`be8b381`](https://github.com/squirrelsoft-dev/cloudwerk/commit/be8b381726429cb8a1a847364a67abf2adcfc690), [`53f62e4`](https://github.com/squirrelsoft-dev/cloudwerk/commit/53f62e4cc626f5f57477a921e18eeedcaccc3f55), [`bf8ddb2`](https://github.com/squirrelsoft-dev/cloudwerk/commit/bf8ddb2a74f26fd83e269eaa04d318aa68d055de)]:
  - @cloudwerk/core@0.17.0
  - @cloudwerk/utils@0.7.0

## 0.16.1

### Patch Changes

- [#290](https://github.com/squirrelsoft-dev/cloudwerk/pull/290) [`b8a9676`](https://github.com/squirrelsoft-dev/cloudwerk/commit/b8a96761a62fd4cf4eab107a5949901cbeb13c3c) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Fix production build failure in hono-jsx projects caused by Rollup statically analyzing the dynamic import of the React renderer. The import path is now constructed at runtime to prevent Rollup from following it into the React module graph.

## 0.15.18

### Patch Changes

- [#286](https://github.com/squirrelsoft-dev/cloudwerk/pull/286) [`c6c35d6`](https://github.com/squirrelsoft-dev/cloudwerk/commit/c6c35d6804dd6a64736860834385abc6ffa0ecd5) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Fix React renderer initialization failure on Cloudflare Workers by replacing dynamic import in initReactRenderer with static import and registerRenderer. The dynamic import caused a TDZ error when Vite inlined the module into a single chunk.

## 0.15.17

### Patch Changes

- [#283](https://github.com/squirrelsoft-dev/cloudwerk/pull/283) [`e2e9c02`](https://github.com/squirrelsoft-dev/cloudwerk/commit/e2e9c02dc8f3d98252c90ccb3be81e86edd9e426) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Fix react-dom/server causing deployment failure on Cloudflare Workers due to MessageChannel not being available during upload validation. Lazy-load react-dom/server in the React renderer and add a MessageChannel polyfill to the generated server entry for React apps.

## 0.15.6

### Patch Changes

- [#257](https://github.com/squirrelsoft-dev/cloudwerk/pull/257) [`aeaa7ca`](https://github.com/squirrelsoft-dev/cloudwerk/commit/aeaa7ca8d0eb8a40a1cb89405c2d11222a639c5f) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Switch React renderer to full-tree hydration instead of island hydration. This fixes client components that receive children (e.g. `<FadeIn><h1>...</h1></FadeIn>`), context propagation across component boundaries, and hydration mismatches with motion/framer-motion. The server now embeds serialized page data as `__CLOUDWERK_DATA__` and the client reconstructs the full React component tree before calling `hydrateRoot`. Hono JSX renderer continues to use island hydration unchanged. Also fix "use client" directive handling in production builds.

## 0.15.5

### Patch Changes

- [#254](https://github.com/squirrelsoft-dev/cloudwerk/pull/254) [`739bd0c`](https://github.com/squirrelsoft-dev/cloudwerk/commit/739bd0c2007c34a85cfc4d75c7328056fd48ea68) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Fix React renderer producing "Objects are not valid as a React child" error by making the client component wrapper renderer-agnostic. Added `createElement` to the `Renderer` interface so the hydration wrapper div is created using the active renderer's element factory at runtime, instead of compile-time Hono JSX.

## 0.15.3

### Patch Changes

- Updated dependencies [[`00cc9c5`](https://github.com/squirrelsoft-dev/cloudwerk/commit/00cc9c509f0f19ab42a1cb7f8fcaec33fd4ff354)]:
  - @cloudwerk/core@0.15.3

## 0.15.1

### Patch Changes

- Updated dependencies [[`30285a8`](https://github.com/squirrelsoft-dev/cloudwerk/commit/30285a8468f670bb0c57386c3a470f19bba2ee49)]:
  - @cloudwerk/core@0.15.1

## 0.15.0

### Patch Changes

- Updated dependencies [[`3a54d33`](https://github.com/squirrelsoft-dev/cloudwerk/commit/3a54d330f2eb5e1bbb5c1aef62917e061df61ef6)]:
  - @cloudwerk/core@0.15.0

## 0.14.0

### Patch Changes

- Updated dependencies [[`5f38299`](https://github.com/squirrelsoft-dev/cloudwerk/commit/5f3829954b73d119ef57bceddc6c806a5fbaca3c)]:
  - @cloudwerk/core@0.14.0

## 0.13.0

### Patch Changes

- Updated dependencies [[`96b77e6`](https://github.com/squirrelsoft-dev/cloudwerk/commit/96b77e6056f5b6c522dfaf07264aafa48f26249f), [`068b10f`](https://github.com/squirrelsoft-dev/cloudwerk/commit/068b10ffbe84dbbe38307c3ebdfe415f53a1904b), [`c179642`](https://github.com/squirrelsoft-dev/cloudwerk/commit/c179642bd67ced2d170bcdb4a723767aacd81eb0), [`39d7a47`](https://github.com/squirrelsoft-dev/cloudwerk/commit/39d7a4783a5aca94073cdd6b142cc74789856e61)]:
  - @cloudwerk/core@0.13.0

## 0.12.0

### Patch Changes

- Updated dependencies [[`afbcd2d`](https://github.com/squirrelsoft-dev/cloudwerk/commit/afbcd2d31f6177fff01601537dbe27eaaa065892)]:
  - @cloudwerk/core@0.12.0

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
