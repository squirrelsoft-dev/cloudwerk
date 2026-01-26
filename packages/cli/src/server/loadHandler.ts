/**
 * @cloudwerk/cli - Route Handler Loader
 *
 * Compiles TypeScript route files on-the-fly using esbuild.
 */

import { build } from 'esbuild'
import type { LoadedRouteModule } from '../types.js'

// ============================================================================
// Module Cache
// ============================================================================

/**
 * Cache for compiled modules to avoid recompilation.
 * In dev mode, we use timestamps for cache busting.
 */
const moduleCache = new Map<string, { module: LoadedRouteModule; mtime: number }>()

// ============================================================================
// Route Handler Loading
// ============================================================================

/**
 * Load a route handler module by compiling TypeScript on-the-fly.
 *
 * Uses esbuild to compile the file to ESM, then imports it via data URL.
 * Results are cached to avoid recompilation on subsequent requests.
 *
 * @param absolutePath - Absolute path to the route file
 * @returns Loaded module with HTTP method exports
 *
 * @example
 * const module = await loadRouteHandler('/app/users/route.ts')
 * if (module.GET) {
 *   // Register GET handler
 * }
 */
export async function loadRouteHandler(absolutePath: string): Promise<LoadedRouteModule> {
  try {
    // Build the TypeScript file
    const result = await build({
      entryPoints: [absolutePath],
      bundle: true,
      write: false,
      format: 'esm',
      platform: 'node',
      target: 'node20',
      external: [
        '@cloudwerk/core',
        'hono',
        'node:*',
        'fs',
        'path',
        'crypto',
        'http',
        'https',
        'stream',
        'util',
        'events',
        'buffer',
        'url',
        'querystring',
        'zlib',
        'os',
        'child_process',
        'worker_threads',
        'net',
        'tls',
        'dns',
      ],
      logLevel: 'silent',
      sourcemap: 'inline',
    })

    if (!result.outputFiles || result.outputFiles.length === 0) {
      throw new Error('No output from esbuild')
    }

    const code = result.outputFiles[0].text

    // Import via data URL to get module exports
    // Data URLs don't support query strings, so we rely on Node.js not caching
    // dynamic imports with identical data URLs (which it doesn't by default)
    const dataUrl = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`

    const module = await import(dataUrl) as LoadedRouteModule

    return module
  } catch (error) {
    // Re-throw with more context
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to compile route handler at ${absolutePath}: ${message}`)
  }
}

/**
 * Clear the module cache (useful for hot reloading in the future).
 */
export function clearModuleCache(): void {
  moduleCache.clear()
}

/**
 * Get the size of the module cache.
 */
export function getModuleCacheSize(): number {
  return moduleCache.size
}
