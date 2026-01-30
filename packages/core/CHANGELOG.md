# @cloudwerk/core

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

- [#217](https://github.com/squirrelsoft-dev/cloudwerk/pull/217) [`c179642`](https://github.com/squirrelsoft-dev/cloudwerk/commit/c179642bd67ced2d170bcdb4a723767aacd81eb0) Thanks [@sbeardsley](https://github.com/sbeardsley)! - feat(durable-object): implement Durable Objects support for Cloudwerk

  This release adds convention-based Durable Object support, enabling type-safe, stateful edge computing with native Cloudflare RPC.

  ## New Package: @cloudwerk/durable-object

  ### Features
  - **defineDurableObject()**: Factory function for creating durable object definitions
    - Type-safe state management with generics
    - Native Cloudflare RPC support via `methods` config
    - Built-in handlers for `fetch`, `alarm`, and WebSocket events
    - SQLite storage support with `sqlite: true` flag
    - Zod schema validation for state
  - **Error Classes**: Comprehensive error handling
    - `DurableObjectError` base class
    - `DurableObjectConfigError`, `DurableObjectNotFoundError`
    - `DurableObjectStateError`, `DurableObjectRPCError`
    - WebSocket and alarm-specific errors

  ### Usage Example

  ```typescript
  // app/objects/counter.ts
  import { defineDurableObject } from "@cloudwerk/durable-object";

  interface CounterState {
    value: number;
  }

  export default defineDurableObject<CounterState>({
    sqlite: true,

    async init(ctx) {
      ctx.sql.run(`CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY)`);
      return { value: 0 };
    },

    methods: {
      async increment(amount = 1) {
        this.state.value += amount;
        return this.state.value;
      },

      async getValue() {
        return this.state.value;
      },
    },
  });
  ```

  ```typescript
  // In route handlers
  import { durableObjects } from "@cloudwerk/bindings";

  export async function POST(request: Request, { params }: Context) {
    const id = durableObjects.Counter.idFromName(params.id);
    const counter = durableObjects.Counter.get(id);

    // Native RPC - direct method calls!
    const value = await counter.increment(5);

    return Response.json({ value });
  }
  ```

  ## Core Package Updates

  ### Scanner (`durable-object-scanner.ts`)
  - Scans `app/objects/` for durable object definitions
  - Name conversion utilities: `fileNameToObjectName`, `objectNameToBindingName`, `objectNameToClassName`
  - Both async and sync scanning functions

  ### Compiler (`durable-object-compiler.ts`)
  - Compiles scanned files into `DurableObjectManifest`
  - Validation for duplicate names, invalid formats
  - Entry updates from loaded definitions

  ### Bindings (`bindings.ts`)
  - `durableObjects` proxy for typed namespace access
  - `getDurableObject()`, `hasDurableObject()`, `getDurableObjectNames()` helpers
  - Full TypeScript support for RPC methods

  ## CLI Utilities (for future CLI commands)
  - `durable-object-class-generator.ts`: Generates DurableObject classes from definitions
  - `durable-object-wrangler.ts`: Generates wrangler.toml bindings and migrations
  - `durable-object-migrations.ts`: Tracks class additions/removals/renames
  - `durable-object-type-generator.ts`: Generates `.cloudwerk/types/durable-objects.d.ts`

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

## 0.11.0

### Minor Changes

- [#156](https://github.com/squirrelsoft-dev/cloudwerk/pull/156) [`7e4ff97`](https://github.com/squirrelsoft-dev/cloudwerk/commit/7e4ff9729563861839178475208a42ae7d94e137) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Add `cloudwerk bindings` command for managing Cloudflare bindings
  - `cloudwerk bindings` - View all configured bindings (production or specific environment)
  - `cloudwerk bindings add [type]` - Add a new binding (d1, kv, r2, queue, do, secret)
  - `cloudwerk bindings remove [name]` - Remove a binding
  - `cloudwerk bindings update [name]` - Update an existing binding
  - `cloudwerk bindings generate-types` - Regenerate TypeScript env.d.ts

  Supports environment-specific bindings with `--env` flag. Automatically generates TypeScript type definitions in env.d.ts after modifications.

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
