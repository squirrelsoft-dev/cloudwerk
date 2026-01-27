/**
 * @cloudwerk/cli - Layout Component Loader
 *
 * Compiles TypeScript layout components on-the-fly using esbuild.
 * Similar pattern to loadPage.ts.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { builtinModules } from 'node:module'
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import type { LayoutComponent, LoaderFunction } from '@cloudwerk/core'
import { hasUseClientDirective, generateComponentId, validateComponentBoundaries, handleBoundaryValidationResult } from '@cloudwerk/core'

// ============================================================================
// Types
// ============================================================================

/**
 * A loaded layout module with default component export and optional loader.
 */
export interface LoadedLayoutModule {
  /** Default export: the layout component function */
  default: LayoutComponent
  /** Optional loader function for server-side data loading */
  loader?: LoaderFunction
  /** Whether this layout is a Client Component (has 'use client' directive) */
  isClientComponent?: boolean
  /** Component ID for hydration (only set if isClientComponent is true) */
  clientComponentId?: string
}

// ============================================================================
// Module Cache
// ============================================================================

/**
 * Cache for compiled layout modules to avoid recompilation.
 * Uses mtime for cache invalidation in dev mode.
 */
const layoutModuleCache = new Map<string, { module: LoadedLayoutModule; mtime: number }>()

// ============================================================================
// Layout Loading
// ============================================================================

/**
 * Load a layout component module by compiling TypeScript/TSX on-the-fly.
 *
 * Uses esbuild to compile the file to ESM with automatic JSX transform
 * configured for Hono JSX. Results are cached based on file mtime.
 *
 * @param absolutePath - Absolute path to the layout file
 * @param verbose - Enable verbose logging (passed to esbuild)
 * @returns Loaded module with default layout component export
 *
 * @example
 * const module = await loadLayoutModule('/app/layout.tsx')
 * const LayoutComponent = module.default
 * const element = LayoutComponent({ children: <Page />, params: {} })
 */
export async function loadLayoutModule(
  absolutePath: string,
  verbose: boolean = false
): Promise<LoadedLayoutModule> {
  try {
    // Check file modification time for cache invalidation
    const stat = fs.statSync(absolutePath)
    const mtime = stat.mtimeMs

    // Return cached module if file hasn't changed
    const cached = layoutModuleCache.get(absolutePath)
    if (cached && cached.mtime === mtime) {
      return cached.module
    }

    // Derive esbuild target from current Node.js version
    const nodeVersion = process.versions.node.split('.')[0]
    const target = `node${nodeVersion}`

    // Build the TypeScript/TSX file with JSX support
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

    // Read the original source to check for 'use client' directive
    const sourceCode = fs.readFileSync(absolutePath, 'utf-8')
    const isClientComponent = hasUseClientDirective(sourceCode)
    const clientComponentId = isClientComponent
      ? generateComponentId(absolutePath, path.dirname(absolutePath))
      : undefined

    // Validate component boundaries
    const validationResult = validateComponentBoundaries(sourceCode, absolutePath, isClientComponent)
    handleBoundaryValidationResult(validationResult, absolutePath, { verbose })

    // Write to temp file in a safe location within the project tree
    // This ensures proper module resolution for external packages
    const cacheKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const tempDir = findSafeTempDir(absolutePath)
    const tempFile = path.join(tempDir, `.cloudwerk-layout-${cacheKey}.mjs`)
    fs.writeFileSync(tempFile, code)

    try {
      const rawModule = (await import(pathToFileURL(tempFile).href)) as LoadedLayoutModule & {
        loader?: unknown
      }

      // Validate that default export exists and is a function
      if (!rawModule.default) {
        throw new Error('Layout must have a default export')
      }

      if (typeof rawModule.default !== 'function') {
        throw new Error(
          `Layout default export must be a function (component), got ${typeof rawModule.default}`
        )
      }

      // Validate loader if present
      let validatedLoader: LoaderFunction | undefined = undefined
      if ('loader' in rawModule && rawModule.loader !== undefined) {
        if (typeof rawModule.loader !== 'function') {
          throw new Error(
            `Layout loader export must be a function, got ${typeof rawModule.loader}`
          )
        }
        validatedLoader = rawModule.loader as LoaderFunction
      }

      // Create module with loader and client component info
      const module: LoadedLayoutModule = {
        default: rawModule.default,
        loader: validatedLoader,
        isClientComponent,
        clientComponentId,
      }

      // Cache the compiled module with its mtime
      layoutModuleCache.set(absolutePath, { module, mtime })

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
    throw new Error(`Failed to compile layout at ${absolutePath}: ${message}`)
  }
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Clear the layout module cache (useful for hot reloading in the future).
 */
export function clearLayoutModuleCache(): void {
  layoutModuleCache.clear()
}

/**
 * Get the size of the layout module cache.
 */
export function getLayoutModuleCacheSize(): number {
  return layoutModuleCache.size
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
