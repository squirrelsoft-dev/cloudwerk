# @cloudwerk/vite-plugin

## 0.6.1

### Patch Changes

- [#221](https://github.com/squirrelsoft-dev/cloudwerk/pull/221) [`5f38299`](https://github.com/squirrelsoft-dev/cloudwerk/commit/5f3829954b73d119ef57bceddc6c806a5fbaca3c) Thanks [@sbeardsley](https://github.com/sbeardsley)! - feat(cli): add Static Site Generation (SSG) support
  - Use `getPlatformProxy()` from wrangler to access D1/KV/R2 bindings at build time
  - Use Hono's `toSSG()` helper to generate static HTML files
  - Add cloudwerk plugin to SSG Vite server for proper binding transforms
  - Merge user's vite config with base config during build
  - Pages with `generateStaticParams` export are pre-rendered at build time

  fix(core): clean up debug logging from context and bindings modules

  fix(vite-plugin): ensure binding transforms work correctly in SSG mode

- Updated dependencies [[`5f38299`](https://github.com/squirrelsoft-dev/cloudwerk/commit/5f3829954b73d119ef57bceddc6c806a5fbaca3c)]:
  - @cloudwerk/core@0.14.0
  - @cloudwerk/ui@0.14.0

## 0.6.0

### Minor Changes

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
  - @cloudwerk/ui@0.13.0

## 0.5.0

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
  - @cloudwerk/ui@0.12.0

## 0.4.1

### Patch Changes

- Updated dependencies [[`7e4ff97`](https://github.com/squirrelsoft-dev/cloudwerk/commit/7e4ff9729563861839178475208a42ae7d94e137)]:
  - @cloudwerk/core@0.11.0
  - @cloudwerk/ui@0.11.0

## 0.4.0

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

## 0.3.0

### Minor Changes

- [#152](https://github.com/squirrelsoft-dev/cloudwerk/pull/152) [`3245bb2`](https://github.com/squirrelsoft-dev/cloudwerk/commit/3245bb2d915e39f8fcab04dffb8901f610597c70) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Add publicDir configuration for serving static assets from public/ folder
  - Added `publicDir` option to `CloudwerkConfig` (default: "public")
  - Vite plugin now passes `publicDir` to Vite's built-in static file serving
  - Fixed CLI build command to avoid duplicating static assets in dist/ output
  - Added integration tests for static asset serving

### Patch Changes

- Updated dependencies [[`3245bb2`](https://github.com/squirrelsoft-dev/cloudwerk/commit/3245bb2d915e39f8fcab04dffb8901f610597c70)]:
  - @cloudwerk/core@0.9.0
  - @cloudwerk/ui@0.9.0

## 0.2.0

### Minor Changes

- [#149](https://github.com/squirrelsoft-dev/cloudwerk/pull/149) [`4958ac2`](https://github.com/squirrelsoft-dev/cloudwerk/commit/4958ac226bb6350e8f0cf8be32d1938d275df631) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Add support for error.tsx and not-found.tsx boundary pages
  - Error boundaries catch errors in loaders and render custom error UI
  - Not-found boundaries render when NotFoundError is thrown or for 404s
  - Nested boundaries override parent boundaries (closest wins)
  - API routes return JSON errors, page routes render HTML boundaries

### Patch Changes

- Updated dependencies [[`4958ac2`](https://github.com/squirrelsoft-dev/cloudwerk/commit/4958ac226bb6350e8f0cf8be32d1938d275df631)]:
  - @cloudwerk/core@0.8.0
  - @cloudwerk/ui@0.8.0

## 0.1.3

### Patch Changes

- [#145](https://github.com/squirrelsoft-dev/cloudwerk/pull/145) [`fc2d8c3`](https://github.com/squirrelsoft-dev/cloudwerk/commit/fc2d8c3adb86078cc17b93ba11da29073da4b4ee) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Add README files to all published packages for npm display

- Updated dependencies [[`fc2d8c3`](https://github.com/squirrelsoft-dev/cloudwerk/commit/fc2d8c3adb86078cc17b93ba11da29073da4b4ee)]:
  - @cloudwerk/core@0.7.2
  - @cloudwerk/ui@0.7.2

## 0.1.2

### Patch Changes

- [#143](https://github.com/squirrelsoft-dev/cloudwerk/pull/143) [`403005f`](https://github.com/squirrelsoft-dev/cloudwerk/commit/403005f8a15c838bb37f5c619e77510b09a71d63) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Fix middleware and catch-all route handling
  - Fix middleware import to use named export `{ middleware }`
  - Wrap middleware with `createMiddlewareAdapter` for Hono compatibility
  - Fix catch-all route patterns to use Hono-compatible `:slug{.+}` syntax
  - Fix optional catch-all patterns to use `:slug{.*}` with base path registration

- Updated dependencies [[`403005f`](https://github.com/squirrelsoft-dev/cloudwerk/commit/403005f8a15c838bb37f5c619e77510b09a71d63), [`9b9d131`](https://github.com/squirrelsoft-dev/cloudwerk/commit/9b9d131c7b4f6acbfef1b462a5e2b5c689f626a4)]:
  - @cloudwerk/core@0.7.1
  - @cloudwerk/ui@0.7.1

## 0.1.1

### Patch Changes

- [#141](https://github.com/squirrelsoft-dev/cloudwerk/pull/141) [`3e0279d`](https://github.com/squirrelsoft-dev/cloudwerk/commit/3e0279d10a65f68880d30e5893b9d7a49e1d137b) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Split @cloudwerk/core into /runtime and /build subpackages for smaller Worker bundles
  - Add `@cloudwerk/core/runtime` entry point (10.8KB) with context, middleware, errors, and response helpers
  - Add `@cloudwerk/core/build` entry point (35.7KB) with compiler, scanner, resolver, and config utilities
  - Main `@cloudwerk/core` entry remains backwards compatible by re-exporting from both
  - Update consumer packages to import from appropriate subpackages

- Updated dependencies [[`3e0279d`](https://github.com/squirrelsoft-dev/cloudwerk/commit/3e0279d10a65f68880d30e5893b9d7a49e1d137b)]:
  - @cloudwerk/core@0.7.0
  - @cloudwerk/ui@0.7.0
