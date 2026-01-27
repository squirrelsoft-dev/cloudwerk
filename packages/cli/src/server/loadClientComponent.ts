/**
 * @cloudwerk/cli - Client Component Loader
 *
 * Loads and compiles client components marked with 'use client' directive.
 * These are components imported by pages or layouts that need client-side hydration.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { builtinModules } from 'node:module'
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import { hasUseClientDirective, generateComponentId } from '@cloudwerk/core'

// ============================================================================
// Types
// ============================================================================

/**
 * A loaded client component module.
 */
export interface LoadedClientComponentModule {
  /** Default export: the component function */
  default: (...args: unknown[]) => unknown
  /** Whether this is a Client Component */
  isClientComponent: true
  /** Component ID for hydration */
  componentId: string
  /** Absolute file path */
  filePath: string
}

// ============================================================================
// Module Cache
// ============================================================================

/**
 * Cache for compiled client component modules.
 * Key: absolute file path, Value: { module, mtime }
 */
const clientComponentCache = new Map<
  string,
  { module: LoadedClientComponentModule; mtime: number }
>()

// ============================================================================
// Client Component Loading
// ============================================================================

/**
 * Load a client component module by compiling TypeScript/TSX.
 *
 * This is used for server-side rendering of client components.
 * The component is compiled with hono/jsx for SSR, but marked for
 * client-side hydration.
 *
 * @param absolutePath - Absolute path to the client component file
 * @param appDir - App directory for component ID generation
 * @param verbose - Enable verbose logging
 * @returns Loaded client component module or null if not a client component
 *
 * @example
 * ```typescript
 * const module = await loadClientComponentModule(
 *   '/app/components/Counter.tsx',
 *   '/app'
 * )
 * if (module) {
 *   // This is a client component - render and wrap for hydration
 * }
 * ```
 */
export async function loadClientComponentModule(
  absolutePath: string,
  appDir: string,
  verbose: boolean = false
): Promise<LoadedClientComponentModule | null> {
  try {
    // Check if file has 'use client' directive
    const sourceCode = fs.readFileSync(absolutePath, 'utf-8')
    if (!hasUseClientDirective(sourceCode)) {
      return null // Not a client component
    }

    // Check cache
    const stat = fs.statSync(absolutePath)
    const mtime = stat.mtimeMs
    const cached = clientComponentCache.get(absolutePath)
    if (cached && cached.mtime === mtime) {
      return cached.module
    }

    // Generate component ID
    const componentId = generateComponentId(absolutePath, appDir)

    // Derive esbuild target from current Node.js version
    const nodeVersion = process.versions.node.split('.')[0]
    const target = `node${nodeVersion}`

    // Build the TypeScript/TSX file with JSX support
    // Use hono/jsx for server-side rendering
    const result = await build({
      entryPoints: [absolutePath],
      bundle: true,
      write: false,
      format: 'esm',
      platform: 'node',
      target,
      jsx: 'automatic',
      jsxImportSource: 'hono/jsx',
      external: [
        '@cloudwerk/core',
        '@cloudwerk/ui',
        'hono',
        'hono/jsx',
        'hono/jsx/dom',
        'hono/jsx/streaming',
        'hono/html',
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

    // Write to temp file for import
    const cacheKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const tempDir = findSafeTempDir(absolutePath)
    const tempFile = path.join(tempDir, `.cloudwerk-client-${cacheKey}.mjs`)
    fs.writeFileSync(tempFile, code)

    try {
      const rawModule = (await import(pathToFileURL(tempFile).href)) as {
        default?: unknown
      }

      // Validate default export
      if (!rawModule.default || typeof rawModule.default !== 'function') {
        throw new Error('Client component must have a default export function')
      }

      // Create module with metadata
      const module: LoadedClientComponentModule = {
        default: rawModule.default as (...args: unknown[]) => unknown,
        isClientComponent: true,
        componentId,
        filePath: absolutePath,
      }

      // Cache the module
      clientComponentCache.set(absolutePath, { module, mtime })

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
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to compile client component at ${absolutePath}: ${message}`)
  }
}

/**
 * Check if a file is a client component without loading it.
 *
 * @param absolutePath - Absolute path to the file
 * @returns True if the file has 'use client' directive
 */
export function isClientComponentFile(absolutePath: string): boolean {
  try {
    const sourceCode = fs.readFileSync(absolutePath, 'utf-8')
    return hasUseClientDirective(sourceCode)
  } catch {
    return false
  }
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Clear the client component module cache.
 */
export function clearClientComponentCache(): void {
  clientComponentCache.clear()
}

/**
 * Get the size of the client component module cache.
 */
export function getClientComponentCacheSize(): number {
  return clientComponentCache.size
}

// ============================================================================
// Path Utilities
// ============================================================================

/**
 * Find a safe directory for temp files.
 */
function findSafeTempDir(filePath: string): string {
  let dir = path.dirname(filePath)
  const hasSpecialChars = (p: string) => /\[|\]|\(|\)/.test(path.basename(p))

  while (hasSpecialChars(dir)) {
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }

  return dir
}
