/**
 * @cloudwerk/cli - Middleware Loader
 *
 * Compiles TypeScript middleware files on-the-fly using esbuild.
 * Similar pattern to loadHandler.ts but for middleware modules.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { builtinModules } from 'node:module'
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import type { MiddlewareHandler } from 'hono'
import type { Middleware, LoadedMiddlewareModule } from '@cloudwerk/core'
import { createMiddlewareAdapter } from '@cloudwerk/core'

// ============================================================================
// Module Cache
// ============================================================================

/**
 * Cache for compiled middleware modules to avoid recompilation.
 * Uses mtime for cache invalidation in dev mode.
 */
const middlewareCache = new Map<string, { module: LoadedMiddlewareModule; mtime: number }>()

// ============================================================================
// Middleware Loading
// ============================================================================

/**
 * Load a middleware module from the given path.
 *
 * Uses esbuild for TypeScript compilation and caches by mtime.
 * Returns a Hono-compatible middleware handler wrapped with createMiddlewareAdapter.
 *
 * @param absolutePath - Absolute path to the middleware file
 * @param verbose - Enable verbose logging
 * @returns Hono middleware handler or null if not found/invalid
 *
 * @example
 * const middleware = await loadMiddlewareModule('/app/middleware.ts')
 * if (middleware) {
 *   app.use('/api/*', middleware)
 * }
 */
export async function loadMiddlewareModule(
  absolutePath: string,
  verbose: boolean = false
): Promise<MiddlewareHandler | null> {
  // Check file exists
  if (!fs.existsSync(absolutePath)) {
    if (verbose) {
      console.warn(`Middleware not found: ${absolutePath}`)
    }
    return null
  }

  try {
    // Check cache by mtime
    const stat = fs.statSync(absolutePath)
    const mtime = stat.mtimeMs
    const cached = middlewareCache.get(absolutePath)

    if (cached && cached.mtime === mtime) {
      return extractMiddleware(cached.module, absolutePath, verbose)
    }

    // Derive esbuild target from current Node.js version
    const nodeVersion = process.versions.node.split('.')[0]
    const target = `node${nodeVersion}`

    // Compile with esbuild
    const result = await build({
      entryPoints: [absolutePath],
      bundle: true,
      write: false,
      format: 'esm',
      platform: 'node',
      target,
      external: [
        '@cloudwerk/core',
        'hono',
        // Use builtinModules for comprehensive Node.js built-in coverage
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
      ],
      logLevel: verbose ? 'warning' : 'silent',
      sourcemap: 'inline',
    })

    if (!result.outputFiles || result.outputFiles.length === 0) {
      throw new Error('No output from esbuild')
    }

    // Write to temp file near the original file (like loadHandler.ts)
    // This ensures proper module resolution for external packages like @cloudwerk/core
    const cacheKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const tempDir = findSafeTempDir(absolutePath)
    const tempFile = path.join(tempDir, `.cloudwerk-middleware-${cacheKey}.mjs`)
    fs.writeFileSync(tempFile, result.outputFiles[0].text)

    try {
      // Import module
      const module = (await import(pathToFileURL(tempFile).href)) as LoadedMiddlewareModule

      // Cache the compiled module with its mtime
      middlewareCache.set(absolutePath, { module, mtime })

      return extractMiddleware(module, absolutePath, verbose)
    } finally {
      // Clean up temp file
      try {
        fs.unlinkSync(tempFile)
      } catch {
        // Ignore cleanup errors
      }
    }
  } catch (error) {
    // Log error with context
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Failed to compile middleware at ${absolutePath}: ${message}`)
    return null
  }
}

// ============================================================================
// Middleware Extraction
// ============================================================================

/**
 * Extract middleware function from module exports and wrap with adapter.
 *
 * Supports both default export and named 'middleware' export.
 * Default export takes precedence over named export.
 *
 * @param module - Loaded middleware module
 * @param absolutePath - Path to middleware file (for error messages)
 * @param verbose - Enable verbose logging
 * @returns Hono middleware handler or null if no valid export found
 */
function extractMiddleware(
  module: LoadedMiddlewareModule,
  absolutePath: string,
  verbose: boolean
): MiddlewareHandler | null {
  // Prefer default export, fall back to named 'middleware' export
  const middleware = module.default ?? module.middleware

  if (!middleware) {
    if (verbose) {
      console.warn(
        `Middleware at ${absolutePath} must export a default function or named 'middleware' export`
      )
    }
    return null
  }

  // Validate export is a function
  if (typeof middleware !== 'function') {
    console.warn(
      `Middleware in ${absolutePath} must export a function, got ${typeof middleware}`
    )
    return null
  }

  // Wrap with adapter to convert Cloudwerk signature to Hono signature
  return createMiddlewareAdapter(middleware as Middleware)
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Clear the middleware cache (useful for hot reloading in the future).
 */
export function clearMiddlewareCache(): void {
  middlewareCache.clear()
}

/**
 * Get the size of the middleware cache.
 */
export function getMiddlewareCacheSize(): number {
  return middlewareCache.size
}

// ============================================================================
// Path Utilities
// ============================================================================

/**
 * Find a safe directory for temp files by walking up until we find
 * a directory without special characters like brackets.
 * This avoids URL encoding issues when using dynamic import.
 *
 * @param filePath - Starting file path
 * @returns Directory path safe for temp files
 */
function findSafeTempDir(filePath: string): string {
  let dir = path.dirname(filePath)
  const hasSpecialChars = (p: string) => /\[|\]|\(|\)/.test(path.basename(p))

  // Walk up until we find a directory without brackets
  while (hasSpecialChars(dir)) {
    const parent = path.dirname(dir)
    if (parent === dir) {
      // Reached root, use original directory
      break
    }
    dir = parent
  }

  return dir
}
