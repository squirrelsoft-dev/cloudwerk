/**
 * @cloudwerk/cli - Route Handler Loader
 *
 * Compiles TypeScript route files on-the-fly using esbuild.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { builtinModules } from 'node:module'
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import { validateRouteConfig } from '@cloudwerk/core'
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
 * Results are cached based on file mtime to avoid unnecessary recompilation.
 *
 * @param absolutePath - Absolute path to the route file
 * @param verbose - Enable verbose logging (passed to esbuild)
 * @returns Loaded module with HTTP method exports
 *
 * @example
 * const module = await loadRouteHandler('/app/users/route.ts')
 * if (module.GET) {
 *   // Register GET handler
 * }
 */
export async function loadRouteHandler(
  absolutePath: string,
  verbose: boolean = false
): Promise<LoadedRouteModule> {
  try {
    // Check file modification time for cache invalidation
    const stat = fs.statSync(absolutePath)
    const mtime = stat.mtimeMs

    // Return cached module if file hasn't changed
    const cached = moduleCache.get(absolutePath)
    if (cached && cached.mtime === mtime) {
      return cached.module
    }

    // Derive esbuild target from current Node.js version
    const nodeVersion = process.versions.node.split('.')[0]
    const target = `node${nodeVersion}`

    // Build the TypeScript file
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

    const code = result.outputFiles[0].text

    // Write to temp file in a safe location within the project tree
    // This ensures proper module resolution for external packages like @cloudwerk/core
    // Data URLs don't support bare module specifiers in Node.js
    // By placing the temp file in the project directory, node_modules is found
    // We walk up to find a directory without special characters (like [id])
    // to avoid URL encoding issues with dynamic import
    const cacheKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const tempDir = findSafeTempDir(absolutePath)
    const tempFile = path.join(tempDir, `.cloudwerk-route-${cacheKey}.mjs`)
    fs.writeFileSync(tempFile, code)

    try {
      const rawModule = (await import(pathToFileURL(tempFile).href)) as LoadedRouteModule & { config?: unknown }

      // Validate config if present
      let validatedConfig: LoadedRouteModule['config'] = undefined
      if ('config' in rawModule) {
        validatedConfig = validateRouteConfig(rawModule.config, absolutePath)
      }

      // Create module with validated config
      const module: LoadedRouteModule = {
        ...rawModule,
        config: validatedConfig,
      }

      // Cache the compiled module with its mtime
      moduleCache.set(absolutePath, { module, mtime })

      return module
    } finally {
      // Clean up temp file
      try {
        fs.unlinkSync(tempFile)
      } catch {
        // Ignore cleanup errors
      }
    }
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
