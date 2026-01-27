/**
 * @cloudwerk/cli - Page Component Loader
 *
 * Compiles TypeScript page components on-the-fly using esbuild.
 * Similar pattern to loadHandler.ts but configured for JSX.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { builtinModules } from 'node:module'
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import { validateRouteConfig, hasUseClientDirective, generateComponentId, validateComponentBoundaries, formatBoundaryErrors, hasBoundaryErrors } from '@cloudwerk/core'
import type { PageComponent, RouteConfig, LoaderFunction, ActionFunction } from '@cloudwerk/core'

// ============================================================================
// Types
// ============================================================================

/**
 * A loaded page module with default component export, optional config, loader, and action.
 */
export interface LoadedPageModule {
  /** Default export: the page component function */
  default: PageComponent
  /** Optional route configuration */
  config?: RouteConfig
  /** Optional loader function for server-side data loading */
  loader?: LoaderFunction
  /** Optional action function for handling form submissions */
  action?: ActionFunction
  /** Named POST action export */
  POST?: ActionFunction
  /** Named PUT action export */
  PUT?: ActionFunction
  /** Named PATCH action export */
  PATCH?: ActionFunction
  /** Named DELETE action export */
  DELETE?: ActionFunction
  /** Whether this page is a Client Component (has 'use client' directive) */
  isClientComponent?: boolean
  /** Component ID for hydration (only set if isClientComponent is true) */
  clientComponentId?: string
}

// ============================================================================
// Module Cache
// ============================================================================

/**
 * Cache for compiled page modules to avoid recompilation.
 * Uses mtime for cache invalidation in dev mode.
 */
const pageModuleCache = new Map<string, { module: LoadedPageModule; mtime: number }>()

// ============================================================================
// Page Loading
// ============================================================================

/**
 * Load a page component module by compiling TypeScript/TSX on-the-fly.
 *
 * Uses esbuild to compile the file to ESM with automatic JSX transform
 * configured for Hono JSX. Results are cached based on file mtime.
 *
 * @param absolutePath - Absolute path to the page file
 * @param verbose - Enable verbose logging (passed to esbuild)
 * @returns Loaded module with default page component export
 *
 * @example
 * const module = await loadPageModule('/app/page.tsx')
 * const PageComponent = module.default
 * const element = PageComponent({ params: {}, searchParams: {} })
 */
export async function loadPageModule(
  absolutePath: string,
  verbose: boolean = false
): Promise<LoadedPageModule> {
  try {
    // Check file modification time for cache invalidation
    const stat = fs.statSync(absolutePath)
    const mtime = stat.mtimeMs

    // Return cached module if file hasn't changed
    const cached = pageModuleCache.get(absolutePath)
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
    if (hasBoundaryErrors(validationResult)) {
      const errorMessage = formatBoundaryErrors(validationResult.issues.filter(i => i.severity === 'error'))
      throw new Error(`Component boundary validation failed:\n\n${errorMessage}`)
    }
    // Log warnings if any
    const warnings = validationResult.issues.filter(i => i.severity === 'warning')
    if (warnings.length > 0 && verbose) {
      console.warn(`Component boundary warnings in ${absolutePath}:\n${formatBoundaryErrors(warnings)}`)
    }

    // Write to temp file in a safe location within the project tree
    // This ensures proper module resolution for external packages
    const cacheKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const tempDir = findSafeTempDir(absolutePath)
    const tempFile = path.join(tempDir, `.cloudwerk-page-${cacheKey}.mjs`)
    fs.writeFileSync(tempFile, code)

    try {
      const rawModule = (await import(pathToFileURL(tempFile).href)) as LoadedPageModule & {
        config?: unknown
        loader?: unknown
        action?: unknown
        POST?: unknown
        PUT?: unknown
        PATCH?: unknown
        DELETE?: unknown
      }

      // Validate that default export exists and is a function
      if (!rawModule.default) {
        throw new Error('Page must have a default export')
      }

      if (typeof rawModule.default !== 'function') {
        throw new Error(
          `Page default export must be a function (component), got ${typeof rawModule.default}`
        )
      }

      // Validate config if present
      let validatedConfig: RouteConfig | undefined = undefined
      if ('config' in rawModule && rawModule.config !== undefined) {
        validatedConfig = validateRouteConfig(rawModule.config, absolutePath)
      }

      // Validate loader if present
      let validatedLoader: LoaderFunction | undefined = undefined
      if ('loader' in rawModule && rawModule.loader !== undefined) {
        if (typeof rawModule.loader !== 'function') {
          throw new Error(
            `Page loader export must be a function, got ${typeof rawModule.loader}`
          )
        }
        validatedLoader = rawModule.loader as LoaderFunction
      }

      // Validate action if present
      let validatedAction: ActionFunction | undefined = undefined
      if ('action' in rawModule && rawModule.action !== undefined) {
        if (typeof rawModule.action !== 'function') {
          throw new Error(
            `Page action export must be a function, got ${typeof rawModule.action}`
          )
        }
        validatedAction = rawModule.action as ActionFunction
      }

      // Validate named method exports (POST, PUT, PATCH, DELETE)
      const actionMethods = ['POST', 'PUT', 'PATCH', 'DELETE'] as const
      const validatedMethods: Partial<Record<typeof actionMethods[number], ActionFunction>> = {}

      for (const method of actionMethods) {
        if (method in rawModule && rawModule[method] !== undefined) {
          if (typeof rawModule[method] !== 'function') {
            throw new Error(
              `Page ${method} export must be a function, got ${typeof rawModule[method]}`
            )
          }
          validatedMethods[method] = rawModule[method] as ActionFunction
        }
      }

      // Create module with validated config, loader, actions, and client component info
      const module: LoadedPageModule = {
        default: rawModule.default,
        config: validatedConfig,
        loader: validatedLoader,
        action: validatedAction,
        ...validatedMethods,
        isClientComponent,
        clientComponentId,
      }

      // Cache the compiled module with its mtime
      pageModuleCache.set(absolutePath, { module, mtime })

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
    throw new Error(`Failed to compile page at ${absolutePath}: ${message}`)
  }
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Clear the page module cache (useful for hot reloading in the future).
 */
export function clearPageModuleCache(): void {
  pageModuleCache.clear()
}

/**
 * Get the size of the page module cache.
 */
export function getPageModuleCacheSize(): number {
  return pageModuleCache.size
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
