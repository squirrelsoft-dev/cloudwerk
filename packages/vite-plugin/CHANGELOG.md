# @cloudwerk/vite-plugin

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
