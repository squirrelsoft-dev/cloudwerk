# @cloudwerk/cli

## 0.17.0

### Minor Changes

- [#298](https://github.com/squirrelsoft-dev/cloudwerk/pull/298) [`53f62e4`](https://github.com/squirrelsoft-dev/cloudwerk/commit/53f62e4cc626f5f57477a921e18eeedcaccc3f55) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Bump `vitest` from ^1.0.0 to ^4.0.0 and `@vitest/coverage-v8` from ^1.0.0 to ^4.0.0 across the root and every workspace package with a test script. This clears the critical advisory GHSA-5xrq-8626-4rwp (arbitrary file read/execute via the Vitest UI server, fixed in ≥3.2.6) and collapses the duplicate `vite@5.4.21` that vitest 1's vite-node pulled in — the lockfile now resolves a single `vite@6.4.3`. Vitest 4 requires Vite ≥6 and Node ≥20, both already satisfied. No `vitest.config.*`/`vite.config.*` migration was needed: no config used the removed `coverage.all`/`coverage.extensions` options (all already use `coverage.include`), no constructor `vi.spyOn` usage, no snapshots to re-baseline. All 1605 tests pass on vitest 4.1.10.

- [#300](https://github.com/squirrelsoft-dev/cloudwerk/pull/300) [`edc45f3`](https://github.com/squirrelsoft-dev/cloudwerk/commit/edc45f34587debae205815c6ca94f98cb217d817) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Group K — Node 22.12 engine floor (linchpin). Bump `engines.node` from `>=20` to `>=22.12` (Node 20 is EOL) across root, `@cloudwerk/create-app`, and all examples. Bump `wrangler` ^4.0.0 → ^4.114.0 in `@cloudwerk/cli` and examples (pulls undici 7.18.2 → 7.28.0, clearing 11 undici advisories; peers `@cloudflare/workers-types ^5`). Bump `@cloudflare/workers-types` ^4 → ^5 in `@cloudwerk/durable-object`. Bump `commander` ^12.1.0 → ^15.0.0 in `@cloudwerk/cli` and `@cloudwerk/create-app` (v15 requires Node ≥22.12, now unblocked). Bump root `@types/node` ^20 → ^22 to align to the new engine floor. Bump root `packageManager` pnpm@9.0.0 → pnpm@10.15.1 (pnpm 11 deferred — see PR body). This unblocks Groups J (docs stack: astro 7 / starlight / sharp / satori / linkinator), L (typescript 7), and M (vite 8).

- [#301](https://github.com/squirrelsoft-dev/cloudwerk/pull/301) [`bf8ddb2`](https://github.com/squirrelsoft-dev/cloudwerk/commit/bf8ddb2a74f26fd83e269eaa04d318aa68d055de) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Bump `vite` from `^6.4.3` to `^7.0.0` — stage 1 of the 6→8 migration (Group M1 from the
  dependency audit). Vite 7 is the Rolldown/Oxc preview stage: dep optimization, JS
  transforms, and minification move toward Rolldown internals while the `vite` package
  itself still ships the stable esbuild/Rollup pipeline (Rolldown is opt-in via the
  separate `rolldown-vite` package, not required here). Security is already handled
  in-range (6.4.3, Group A); this bump is currency only.

  - `@cloudwerk/cli`: `dependencies.vite` narrowed from `^5.0.0 || ^6.0.0 || ^7.0.0` to
    `^7.0.0` so the bundled dev server actually resolves and runs on vite 7 (the old range
    let pnpm keep 6.4.3 since it still satisfied the range).
  - `@cloudwerk/vite-plugin`: `devDependencies.vite` bumped to `^7.0.0`; its
    `peerDependencies.vite` range (`^5.0.0 || ^6.0.0 || ^7.0.0`) already covered 7 and is
    unchanged, so downstream consumers can stay on vite 5/6 or move to 7.
  - `@cloudwerk/core`: `devDependencies.vite` bumped to `^7.0.0`; `peerDependencies.vite`
    widened from `^5.0.0 || ^6.0.0` to include `^7.0.0`.
  - All `examples/*` that depend on vite bumped to `^7.0.0`.
  - `pnpm.overrides.esbuild` (`^0.28.0`) is unchanged — esbuild is still used by vite 7
    and only becomes optional in vite 8 (Group M2).

  No `optimizeDeps.esbuildOptions`/`esbuild.*` config migration was needed: a repo-wide
  search found no `esbuildOptions`/`optimizeDeps` usage, and the one place a top-level
  `esbuild` key is set (`@cloudwerk/vite-plugin`'s JSX transform config) is the
  non-deprecated `esbuild.jsx*` transform option, not the deprecated
  `optimizeDeps.esbuildOptions`. No `vite.config.*` files exist in this repo — cli/
  vite-plugin construct Vite's `InlineConfig` programmatically and already pin explicit
  `build.target`/`ssr.target` values (`esnext`/`webworker`) and `minify: 'esbuild'`, so
  Vite 7's new default `build.target` (bumped from the old `modules` baseline) doesn't
  affect the Workers server bundle. The client bundle build target is left at Vite's
  default (as before); an `examples/blog` build (client + server) completes successfully
  under vite 7.3.6.

  Verified: `pnpm install`, `pnpm build` (14/14), `pnpm test` (27/27 tasks, 0 failures —
  vite-plugin 123/123, cli 48/48), `pnpm lint` (0 errors, pre-existing unrelated
  `no-explicit-any` warnings only). `pnpm audit` shows no new advisories tied to vite or
  Rolldown; the 6.4.3 security fix from Group A holds.

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

- [#296](https://github.com/squirrelsoft-dev/cloudwerk/pull/296) [`be8b381`](https://github.com/squirrelsoft-dev/cloudwerk/commit/be8b381726429cb8a1a847364a67abf2adcfc690) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Bump esbuild from ^0.25.0 to ^0.28.0 and update pnpm.overrides.esbuild pin from ^0.25.0 to ^0.28.0. esbuild 0.28.1 fixes a Windows path-traversal in the dev server (GHSA-g7r4-m6w7-qqqr); cloudwerk uses the build/transform API, not serve().

- [#297](https://github.com/squirrelsoft-dev/cloudwerk/pull/297) [`ef6af28`](https://github.com/squirrelsoft-dev/cloudwerk/commit/ef6af28c13821bda64908279a4bcd10733a3fee6) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Leaf dependency batch (Groups C/D/G/H/I from the dependency audit):

  - **Group C:** `jose` 5 → 6 (`@cloudwerk/auth`). cloudwerk only uses `SignJWT`,
    `jwtVerify`, and `jose.errors.*` (cookie-store.ts) — none removed in v6.
  - **Group D:** `@hono/node-server` 1 → 2, `@hono/vite-dev-server` 0.18 → 0.26,
    `@hono/vite-build` 1.11 (already in range) in `@cloudwerk/cli`; `@hono/vite-dev-server`
    0.18 → 0.26 (dev + peer) in `@cloudwerk/vite-plugin`. Both 0.26 and 2.0 are ESM-only
    (cli/vite-plugin are ESM); `@hono/node-server` v2 keeps the public API.
  - **Group G:** `@clack/prompts` 0.8 → 1 (`@cloudwerk/create-app`, ESM-only).
    `commander` unchanged (its 15 bump is deferred to the Node 22 floor).
  - **Group H:** `vite-tsconfig-paths` 5 → 6 (`examples/feature-flags`, private — no
    published change, included for completeness).
  - **Group I:** `@changesets/changelog-github` 0.5 → 0.7 (root devDep, additive
    `disableThanks` option).

  Verified: `pnpm install`, `pnpm build` (14/14), `pnpm test` (27/27 tasks, 0 failures —
  auth 331, cli 48, vite-plugin 123, create-app 55), `pnpm lint` (0 errors). The
  `examples/feature-flags` build completes successfully; a pre-existing static-generation
  warning about the `@/services/flags/service` alias is reproducible on `main` with the
  prior `vite-tsconfig-paths` 5.x and is unrelated to this bump.

- Updated dependencies [[`fea241d`](https://github.com/squirrelsoft-dev/cloudwerk/commit/fea241db0bf53c6c1c586abf66d7064cd7b9d685), [`be8b381`](https://github.com/squirrelsoft-dev/cloudwerk/commit/be8b381726429cb8a1a847364a67abf2adcfc690), [`53f62e4`](https://github.com/squirrelsoft-dev/cloudwerk/commit/53f62e4cc626f5f57477a921e18eeedcaccc3f55), [`bf8ddb2`](https://github.com/squirrelsoft-dev/cloudwerk/commit/bf8ddb2a74f26fd83e269eaa04d318aa68d055de), [`ef6af28`](https://github.com/squirrelsoft-dev/cloudwerk/commit/ef6af28c13821bda64908279a4bcd10733a3fee6)]:
  - @cloudwerk/core@0.17.0
  - @cloudwerk/ui@0.17.0
  - @cloudwerk/vite-plugin@0.17.0

## 0.16.2

### Patch Changes

- [#291](https://github.com/squirrelsoft-dev/cloudwerk/pull/291) [`d404535`](https://github.com/squirrelsoft-dev/cloudwerk/commit/d404535098ee9b1d1c240f77fa4e77c30dfc1923) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Add Turborepo for cached build orchestration. Add Bun engine support to scaffolded project templates. Show runtime info in dev server startup banner.

## 0.16.0

### Minor Changes

- [#288](https://github.com/squirrelsoft-dev/cloudwerk/pull/288) [`979c5a0`](https://github.com/squirrelsoft-dev/cloudwerk/commit/979c5a04933d0254794309027526d3d6651e77ee) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Auto-SSG and Worker polyfills for React renderer
  - **Auto-SSG**: Static page generation now runs automatically during `cloudwerk build` for routes with `rendering: 'static'` or `generateStaticParams`. The `--ssg` flag is no longer needed (use `--no-ssg` to opt out).
  - **SSG route filtering**: Only routes explicitly marked as static are generated. Dynamic pages and API routes are no longer captured by SSG.
  - **Worker polyfills**: `MessageChannel` and `document` polyfills are now automatically injected via Rollup banner for React renderer builds, fixing crashes from libraries like `react-markdown`/`micromark` that use `document.createElement` at module load time.

### Patch Changes

- Updated dependencies [[`979c5a0`](https://github.com/squirrelsoft-dev/cloudwerk/commit/979c5a04933d0254794309027526d3d6651e77ee)]:
  - @cloudwerk/vite-plugin@0.16.0

## 0.15.16

### Patch Changes

- [#281](https://github.com/squirrelsoft-dev/cloudwerk/pull/281) [`57a9230`](https://github.com/squirrelsoft-dev/cloudwerk/commit/57a923096884be75bdc0d76b4d51889ab380d1a0) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Use allowlist for client-safe @cloudwerk packages instead of individual exceptions. Fixes "Failed to resolve module specifier @cloudwerk/utils" in SSG output by ensuring the full hydration dependency chain is bundled.

## 0.15.15

### Patch Changes

- [#279](https://github.com/squirrelsoft-dev/cloudwerk/pull/279) [`6f5f201`](https://github.com/squirrelsoft-dev/cloudwerk/commit/6f5f201e6f19394249d0fc3f5a3bbaa753974d8b) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Fix client bundle externalizing @cloudwerk/ui/client, which caused "Failed to resolve module specifier" errors in SSG output. The hydration code must be bundled, not externalized.

## 0.15.14

### Patch Changes

- [#277](https://github.com/squirrelsoft-dev/cloudwerk/pull/277) [`217e829`](https://github.com/squirrelsoft-dev/cloudwerk/commit/217e829202f9513d58f7e642c38d505916cb7bfb) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Bump to pick up @cloudwerk/vite-plugin 0.8.2 which fixes SSG "Failed to parse URL from [object Request]" error

## 0.15.13

### Patch Changes

- [#273](https://github.com/squirrelsoft-dev/cloudwerk/pull/273) [`c8d8f13`](https://github.com/squirrelsoft-dev/cloudwerk/commit/c8d8f132ebf6bc1024043fefc2376188a1f2750e) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Fix SSG "Failed to parse URL from [object Request]" error by skipping ASSETS middleware during static generation and adding a try/catch fallback for ASSETS.fetch

## 0.15.12

### Patch Changes

- [#271](https://github.com/squirrelsoft-dev/cloudwerk/pull/271) [`f9a3682`](https://github.com/squirrelsoft-dev/cloudwerk/commit/f9a36823c1260cf33e6d0f632099238c71849d49) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Bump @cloudwerk/vite-plugin dependency to pick up the unused import stripping fix, which prevents browser errors in Vite dev mode when server-only imports reference Node.js APIs.

## 0.15.11

### Patch Changes

- Externalize @cloudwerk/\* packages from the client build to prevent AsyncLocalStorage (node:async_hooks) from leaking into the browser bundle.

## 0.15.10

### Patch Changes

- [#265](https://github.com/squirrelsoft-dev/cloudwerk/pull/265) [`f2b2331`](https://github.com/squirrelsoft-dev/cloudwerk/commit/f2b233144d4f14ea07a56853930f76cb87d791ef) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Surface client build failures as visible warnings instead of silently swallowing them. Fix Rollup onwarn regex to properly suppress expected MISSING_EXPORT warnings for optional page exports.

## 0.15.9

### Patch Changes

- Updated dependencies [[`f0be91e`](https://github.com/squirrelsoft-dev/cloudwerk/commit/f0be91e06f8d0b83fbd3790c1d388d117cd8e88c)]:
  - @cloudwerk/vite-plugin@0.8.0

## 0.15.8

### Patch Changes

- Updated dependencies [[`71e6f92`](https://github.com/squirrelsoft-dev/cloudwerk/commit/71e6f9276d93b333dfdf8d739e6e26a6a780b390)]:
  - @cloudwerk/vite-plugin@0.7.0

## 0.15.7

### Patch Changes

- [#259](https://github.com/squirrelsoft-dev/cloudwerk/pull/259) [`6420c5e`](https://github.com/squirrelsoft-dev/cloudwerk/commit/6420c5ee7be0f3494e2f55311636ac2e40b56fab) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Fix XSS vulnerability in React hydration data script injection, scope MISSING_EXPORT warning suppression to known-optional exports, and use JSON.stringify for route pattern keys in client entry.

- Updated dependencies [[`6420c5e`](https://github.com/squirrelsoft-dev/cloudwerk/commit/6420c5ee7be0f3494e2f55311636ac2e40b56fab)]:
  - @cloudwerk/vite-plugin@0.6.9

## 0.15.6

### Patch Changes

- [#257](https://github.com/squirrelsoft-dev/cloudwerk/pull/257) [`aeaa7ca`](https://github.com/squirrelsoft-dev/cloudwerk/commit/aeaa7ca8d0eb8a40a1cb89405c2d11222a639c5f) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Switch React renderer to full-tree hydration instead of island hydration. This fixes client components that receive children (e.g. `<FadeIn><h1>...</h1></FadeIn>`), context propagation across component boundaries, and hydration mismatches with motion/framer-motion. The server now embeds serialized page data as `__CLOUDWERK_DATA__` and the client reconstructs the full React component tree before calling `hydrateRoot`. Hono JSX renderer continues to use island hydration unchanged. Also fix "use client" directive handling in production builds.

- Updated dependencies [[`aeaa7ca`](https://github.com/squirrelsoft-dev/cloudwerk/commit/aeaa7ca8d0eb8a40a1cb89405c2d11222a639c5f)]:
  - @cloudwerk/ui@0.15.6
  - @cloudwerk/vite-plugin@0.6.8

## 0.15.2

### Patch Changes

- [#233](https://github.com/squirrelsoft-dev/cloudwerk/pull/233) [`dbdf87a`](https://github.com/squirrelsoft-dev/cloudwerk/commit/dbdf87af77cbedd9178defc96b733fa62c0fc74c) Thanks [@sbeardsley](https://github.com/sbeardsley)! - fix(cli): add content hash to client entry filename for cache busting

  Changed client entry output from `client.js` to `client-[hash].js` to enable
  proper browser caching with cache invalidation on content changes.

- Updated dependencies [[`dbdf87a`](https://github.com/squirrelsoft-dev/cloudwerk/commit/dbdf87af77cbedd9178defc96b733fa62c0fc74c)]:
  - @cloudwerk/vite-plugin@0.6.4

## 0.15.0

### Patch Changes

- Updated dependencies [[`3a54d33`](https://github.com/squirrelsoft-dev/cloudwerk/commit/3a54d330f2eb5e1bbb5c1aef62917e061df61ef6)]:
  - @cloudwerk/core@0.15.0
  - @cloudwerk/ui@0.15.0
  - @cloudwerk/vite-plugin@0.6.2

## 0.14.0

### Minor Changes

- [#221](https://github.com/squirrelsoft-dev/cloudwerk/pull/221) [`5f38299`](https://github.com/squirrelsoft-dev/cloudwerk/commit/5f3829954b73d119ef57bceddc6c806a5fbaca3c) Thanks [@sbeardsley](https://github.com/sbeardsley)! - feat(cli): add Static Site Generation (SSG) support
  - Use `getPlatformProxy()` from wrangler to access D1/KV/R2 bindings at build time
  - Use Hono's `toSSG()` helper to generate static HTML files
  - Add cloudwerk plugin to SSG Vite server for proper binding transforms
  - Merge user's vite config with base config during build
  - Pages with `generateStaticParams` export are pre-rendered at build time

  fix(core): clean up debug logging from context and bindings modules

  fix(vite-plugin): ensure binding transforms work correctly in SSG mode

### Patch Changes

- Updated dependencies [[`5f38299`](https://github.com/squirrelsoft-dev/cloudwerk/commit/5f3829954b73d119ef57bceddc6c806a5fbaca3c)]:
  - @cloudwerk/core@0.14.0
  - @cloudwerk/vite-plugin@0.6.1
  - @cloudwerk/ui@0.14.0

## 0.13.0

### Minor Changes

- [#217](https://github.com/squirrelsoft-dev/cloudwerk/pull/217) [`96b77e6`](https://github.com/squirrelsoft-dev/cloudwerk/commit/96b77e6056f5b6c522dfaf07264aafa48f26249f) Thanks [@sbeardsley](https://github.com/sbeardsley)! - feat(trigger): add @cloudwerk/trigger package for event-driven triggers

  Introduces the @cloudwerk/trigger package with support for:
  - **Trigger Sources**: scheduled (cron), queue, R2, webhook, email, D1, and tail
  - **defineTrigger()**: Factory function for creating type-safe trigger definitions
  - **Event Types**: Full TypeScript types for all trigger event types
  - **Error Handling**: Custom error classes and onError handlers
  - **Webhook Verifiers**: Built-in signature verification for Stripe, GitHub, Slack, Twilio, Shopify, Linear
  - **Trigger Chaining**: emit() helper for invoking other triggers with trace ID propagation
  - **Testing Utilities**: mockEvent factories and testTrigger() helper
  - **Observability**: Metrics collection and execution timers

  Also adds to @cloudwerk/core:
  - **Trigger Scanner**: Discovers trigger files in app/triggers/ with fan-out subdirectory support
  - **Trigger Compiler**: Compiles triggers to manifest with validation

  Also adds to @cloudwerk/cli:
  - **cloudwerk triggers**: Overview of discovered triggers
  - **cloudwerk triggers list**: List all triggers with details (--type filter, --json output)
  - **cloudwerk triggers validate**: Validate trigger configurations (--strict mode)
  - **cloudwerk triggers generate**: Regenerate wrangler.toml and TypeScript types

  Example usage:

  ```typescript
  // app/triggers/daily-cleanup.ts
  import { defineTrigger } from "@cloudwerk/trigger";

  export default defineTrigger({
    source: { type: "scheduled", cron: "0 0 * * *" },
    async handle(event, ctx) {
      console.log(`[${ctx.traceId}] Running cleanup`);
      await cleanupOldRecords();
    },
  });

  // app/triggers/stripe-webhook.ts
  import { defineTrigger, verifiers } from "@cloudwerk/trigger";

  export default defineTrigger({
    source: {
      type: "webhook",
      path: "/webhooks/stripe",
      verify: verifiers.stripe(process.env.STRIPE_WEBHOOK_SECRET),
    },
    async handle(event) {
      if (event.payload.type === "checkout.session.completed") {
        await handleCheckout(event.payload);
      }
    },
  });
  ```

- [#217](https://github.com/squirrelsoft-dev/cloudwerk/pull/217) [`068b10f`](https://github.com/squirrelsoft-dev/cloudwerk/commit/068b10ffbe84dbbe38307c3ebdfe415f53a1904b) Thanks [@sbeardsley](https://github.com/sbeardsley)! - feat(queue): implement queue producers and consumers for Cloudwerk

  Add comprehensive queue support for Cloudflare Workers:
  - **@cloudwerk/queue**: New package with `defineQueue()` API for creating queue consumers, supporting single message processing, batch processing, error handling, and optional Zod schema validation
  - **@cloudwerk/core**: Queue scanner for `app/queues/` directory discovery, queue compiler for manifest generation, and typed queue producer proxy (`queues.email.send()`) in bindings
  - **@cloudwerk/cli**: Queue type generation for `.cloudwerk/types/queues.d.ts` and wrangler.toml queue configuration generation
  - **@cloudwerk/vite-plugin**: Queue scanning integration and consumer registration in server entry

  Also includes dead letter queue (DLQ) support with utilities for handling failed messages.

- [#217](https://github.com/squirrelsoft-dev/cloudwerk/pull/217) [`39d7a47`](https://github.com/squirrelsoft-dev/cloudwerk/commit/39d7a4783a5aca94073cdd6b142cc74789856e61) Thanks [@sbeardsley](https://github.com/sbeardsley)! - feat(service): implement convention-based service extraction

  Introduces the `@cloudwerk/service` package and related infrastructure for defining services that can run locally or be extracted as separate Cloudflare Workers.

  ### New Package: @cloudwerk/service
  - `defineService()` API for creating service definitions with methods, lifecycle hooks, and extraction configuration
  - `HooksManager` for handling `onInit`, `onBefore`, `onAfter`, and `onError` lifecycle hooks
  - Type-safe service definitions with full TypeScript support

  ### Core Package Updates
  - Service scanner (`scanServices`, `scanServicesSync`) for discovering `app/services/*/service.ts` files
  - Service compiler (`buildServiceManifest`, `compileService`) for generating service manifests
  - `services` proxy in `@cloudwerk/core/bindings` for transparent local/extracted mode switching
  - Helper functions: `getService`, `hasService`, `getServiceNames`, `registerLocalService`

  ### CLI Package Updates
  - New `cloudwerk services` command group:
    - `cloudwerk services list` - List all discovered services
    - `cloudwerk services info <name>` - Show service details
    - `cloudwerk services extract <name>` - Extract to separate Worker
    - `cloudwerk services inline <name>` - Convert back to local mode
    - `cloudwerk services deploy <name>` - Deploy extracted service
    - `cloudwerk services status` - Show all services status
  - Service type generator for `.cloudwerk/types/services.d.ts`
  - Service worker generator for WorkerEntrypoint wrappers
  - Service wrangler.toml generator for service bindings
  - Service SDK generator for external consumption

  ### Vite Plugin Updates
  - Service scanning integration for hot module reloading
  - File watching for `app/services/*/service.ts` changes
  - Service manifest generation and server entry updates
  - Local service registration in generated server entry

  ### How It Works
  1. Define a service in `app/services/email/service.ts`:

  ```typescript
  import { defineService } from "@cloudwerk/service";

  export default defineService({
    methods: {
      async send({ to, subject, body }) {
        // Send email
        return { success: true };
      },
    },
  });
  ```

  2. Call it from route handlers:

  ```typescript
  import { services } from "@cloudwerk/core/bindings";

  export async function POST() {
    const result = await services.email.send({
      to: "user@example.com",
      subject: "Hello",
      body: "Welcome!",
    });
    return json(result);
  }
  ```

  3. Extract to a separate Worker when needed:

  ```bash
  cloudwerk services extract email
  cloudwerk services deploy email
  ```

  The same API works in both local and extracted modes - Cloudflare's native RPC handles the communication automatically via service bindings.

### Patch Changes

- Updated dependencies [[`96b77e6`](https://github.com/squirrelsoft-dev/cloudwerk/commit/96b77e6056f5b6c522dfaf07264aafa48f26249f), [`068b10f`](https://github.com/squirrelsoft-dev/cloudwerk/commit/068b10ffbe84dbbe38307c3ebdfe415f53a1904b), [`c179642`](https://github.com/squirrelsoft-dev/cloudwerk/commit/c179642bd67ced2d170bcdb4a723767aacd81eb0), [`39d7a47`](https://github.com/squirrelsoft-dev/cloudwerk/commit/39d7a4783a5aca94073cdd6b142cc74789856e61)]:
  - @cloudwerk/core@0.13.0
  - @cloudwerk/vite-plugin@0.6.0
  - @cloudwerk/ui@0.13.0

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
