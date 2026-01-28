/**
 * @cloudwerk/core
 *
 * File-based routing, middleware, and configuration for Cloudwerk.
 *
 * This entry point re-exports everything from both runtime and build
 * for backwards compatibility. For optimal bundle size in production:
 *
 * - Import from '@cloudwerk/core/runtime' for Worker code
 * - Import from '@cloudwerk/core/build' for CLI/build tools
 *
 * @packageDocumentation
 */

// Re-export everything from runtime (no heavy dependencies)
export * from './runtime.js'

// Re-export everything from build (includes fast-glob, esbuild)
export * from './build.js'
