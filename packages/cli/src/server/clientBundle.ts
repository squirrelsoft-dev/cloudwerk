/**
 * @cloudwerk/cli - Client Bundle Generator
 *
 * Generates client-side bundles for components marked with 'use client'.
 * Uses esbuild configured for browser targeting with hono/jsx/dom.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { createRequire } from 'node:module'
import { build } from 'esbuild'

// Get the node_modules path for resolving hono
const require = createRequire(import.meta.url)
// Resolve hono's main entry and get the node_modules directory
const honoMainPath = require.resolve('hono')
// Walk up to find node_modules (the path will be .../node_modules/hono/dist/index.js or similar)
function findNodeModulesDir(filePath: string): string {
  let dir = filePath
  while (dir !== path.dirname(dir)) {
    dir = path.dirname(dir)
    if (path.basename(dir) === 'node_modules') {
      return dir
    }
  }
  return path.join(path.dirname(filePath), '..', '..') // Fallback
}
const nodeModulesPath = findNodeModulesDir(honoMainPath)
import type { ClientComponentInfo, HydrationManifest } from '@cloudwerk/core'
import { generateComponentId, createHydrationManifest, addToHydrationManifest } from '@cloudwerk/core'
import { generateHydrationRuntime, generateReactHydrationRuntime } from '@cloudwerk/ui'

// ============================================================================
// Types
// ============================================================================

/**
 * Options for generating client bundles.
 */
export interface ClientBundleOptions {
  /** Output directory for client bundles */
  outputDir: string
  /** App directory for component ID generation */
  appDir: string
  /** Base URL path for client bundles */
  basePath?: string
  /** Enable minification */
  minify?: boolean
  /** Enable source maps */
  sourcemap?: boolean
  /** Enable verbose logging */
  verbose?: boolean
  /** Renderer to use for client-side hydration ('hono-jsx' or 'react') */
  renderer?: 'hono-jsx' | 'react'
}

/**
 * Result of client bundle generation.
 */
export interface ClientBundleResult {
  /** Hydration manifest with all client components */
  manifest: HydrationManifest
  /** Map of component ID to bundle file path */
  bundles: Map<string, string>
  /** Total bundle size in bytes */
  totalSize: number
}

// ============================================================================
// Bundle Cache
// ============================================================================

/**
 * Cache for generated client bundles to avoid regeneration.
 * Key: absolute file path, Value: { bundle content, mtime }
 */
const bundleCache = new Map<string, { content: string; mtime: number; bundlePath: string }>()

// ============================================================================
// Client Bundle Generation
// ============================================================================

/**
 * Generate client bundles for a list of client components.
 *
 * Each client component is bundled separately to enable:
 * - Code splitting (only load components used on the page)
 * - Optimal caching (unchanged components don't need re-download)
 * - Parallel loading of multiple components
 *
 * @param components - List of client component file paths
 * @param options - Bundle generation options
 * @returns Bundle generation result with manifest and bundle paths
 *
 * @example
 * ```typescript
 * const result = await generateClientBundles(
 *   ['/app/components/Counter.tsx', '/app/components/Toggle.tsx'],
 *   { outputDir: '/dist/client', appDir: '/app' }
 * )
 * ```
 */
export async function generateClientBundles(
  components: string[],
  options: ClientBundleOptions
): Promise<ClientBundleResult> {
  const {
    outputDir,
    appDir,
    basePath = '/__cloudwerk',
    minify = process.env.NODE_ENV === 'production',
    sourcemap = process.env.NODE_ENV !== 'production',
    verbose = false,
    renderer = 'hono-jsx',
  } = options

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // Create hydration manifest
  const manifest = createHydrationManifest(basePath)
  const bundles = new Map<string, string>()
  let totalSize = 0

  // Generate the appropriate hydration runtime based on renderer
  if (renderer === 'react') {
    // Generate React hydration runtime
    const runtimePath = path.join(outputDir, 'react-runtime.js')
    const runtimeContent = generateReactHydrationRuntime()
    fs.writeFileSync(runtimePath, runtimeContent)
    totalSize += runtimeContent.length

    if (verbose) {
      console.log(`[Cloudwerk] Generated React hydration runtime: ${runtimePath}`)
    }
  } else {
    // Generate Hono JSX hydration runtime (default)
    const runtimePath = path.join(outputDir, 'runtime.js')
    const runtimeContent = generateHydrationRuntime()
    fs.writeFileSync(runtimePath, runtimeContent)
    totalSize += runtimeContent.length

    if (verbose) {
      console.log(`[Cloudwerk] Generated hydration runtime: ${runtimePath}`)
    }
  }

  // Generate bundle for each client component
  for (const componentPath of components) {
    try {
      const result = await generateSingleBundle(componentPath, {
        outputDir,
        appDir,
        basePath,
        minify,
        sourcemap,
        verbose,
        renderer,
      })

      // Add to manifest
      const info: ClientComponentInfo = {
        filePath: componentPath,
        componentId: result.componentId,
        exportName: 'default',
      }
      addToHydrationManifest(manifest, info, result.bundlePath)
      bundles.set(result.componentId, result.outputPath)
      totalSize += result.size

      if (verbose) {
        console.log(`[Cloudwerk] Generated client bundle: ${result.componentId} (${result.size} bytes)`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[Cloudwerk] Failed to bundle ${componentPath}: ${message}`)
    }
  }

  return { manifest, bundles, totalSize }
}

/**
 * Result of bundling a single component.
 */
interface SingleBundleResult {
  componentId: string
  outputPath: string
  bundlePath: string
  size: number
}

/**
 * Generate a client bundle for a single component.
 *
 * @param componentPath - Absolute path to the component file
 * @param options - Bundle generation options
 * @returns Bundle result with paths and size
 */
async function generateSingleBundle(
  componentPath: string,
  options: ClientBundleOptions
): Promise<SingleBundleResult> {
  const { outputDir, appDir, basePath = '/__cloudwerk', minify, sourcemap, renderer = 'hono-jsx' } = options

  // Generate component ID
  const componentId = generateComponentId(componentPath, appDir)

  // Check cache - include renderer in cache key to handle switching renderers
  const cacheKey = `${componentPath}:${renderer}`
  const stat = fs.statSync(componentPath)
  const cached = bundleCache.get(cacheKey)
  if (cached && cached.mtime === stat.mtimeMs) {
    // Return cached result
    return {
      componentId,
      outputPath: path.join(outputDir, `${componentId}.js`),
      bundlePath: `${basePath}/${componentId}.js`,
      size: cached.content.length,
    }
  }

  // Determine JSX import source based on renderer
  const jsxImportSource = renderer === 'react' ? 'react' : 'hono/jsx/dom'

  // Build the component for browser
  const result = await build({
    entryPoints: [componentPath],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    target: ['es2020', 'chrome80', 'firefox80', 'safari14'],
    jsx: 'automatic',
    jsxImportSource,
    minify,
    sourcemap: sourcemap ? 'inline' : false,
    external: [], // Bundle everything for client
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    },
    logLevel: 'silent',
    // Resolve hono/react from the package's node_modules
    nodePaths: [nodeModulesPath],
  })

  if (!result.outputFiles || result.outputFiles.length === 0) {
    throw new Error('No output from esbuild')
  }

  const content = result.outputFiles[0].text
  const outputPath = path.join(outputDir, `${componentId}.js`)

  // Write bundle to disk
  fs.writeFileSync(outputPath, content)

  // Update cache with renderer-specific key
  bundleCache.set(cacheKey, {
    content,
    mtime: stat.mtimeMs,
    bundlePath: `${basePath}/${componentId}.js`,
  })

  return {
    componentId,
    outputPath,
    bundlePath: `${basePath}/${componentId}.js`,
    size: content.length,
  }
}

// ============================================================================
// On-Demand Bundle Generation
// ============================================================================

/**
 * Options for on-demand bundle generation.
 */
export interface OnDemandBundleOptions {
  /** Renderer to use for client-side hydration ('hono-jsx' or 'react') */
  renderer?: 'hono-jsx' | 'react'
}

/**
 * Generate a client bundle on-demand (for development).
 *
 * This is used during development to generate bundles only when needed,
 * avoiding the overhead of pre-bundling all client components.
 *
 * @param componentPath - Absolute path to the component file
 * @param appDir - App directory for component ID generation
 * @param options - On-demand bundle options
 * @returns Bundle content as string
 */
export async function generateBundleOnDemand(
  componentPath: string,
  appDir: string,
  options: OnDemandBundleOptions = {}
): Promise<{ content: string; componentId: string }> {
  const { renderer = 'hono-jsx' } = options

  // Check cache with renderer-specific key
  const cacheKey = `${componentPath}:${renderer}`
  const stat = fs.statSync(componentPath)
  const cached = bundleCache.get(cacheKey)
  if (cached && cached.mtime === stat.mtimeMs) {
    return {
      content: cached.content,
      componentId: generateComponentId(componentPath, appDir),
    }
  }

  // Determine JSX import source based on renderer
  const jsxImportSource = renderer === 'react' ? 'react' : 'hono/jsx/dom'

  // Build the component
  const result = await build({
    entryPoints: [componentPath],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    target: ['es2020', 'chrome80', 'firefox80', 'safari14'],
    jsx: 'automatic',
    jsxImportSource,
    minify: false,
    sourcemap: 'inline',
    define: {
      'process.env.NODE_ENV': JSON.stringify('development'),
    },
    logLevel: 'silent',
    // Resolve hono/react from the package's node_modules
    nodePaths: [nodeModulesPath],
  })

  if (!result.outputFiles || result.outputFiles.length === 0) {
    throw new Error('No output from esbuild')
  }

  const content = result.outputFiles[0].text
  const componentId = generateComponentId(componentPath, appDir)

  // Update cache with renderer-specific key
  bundleCache.set(cacheKey, {
    content,
    mtime: stat.mtimeMs,
    bundlePath: `/__cloudwerk/${componentId}.js`,
  })

  return { content, componentId }
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Clear the bundle cache.
 */
export function clearBundleCache(): void {
  bundleCache.clear()
}

/**
 * Get the size of the bundle cache.
 */
export function getBundleCacheSize(): number {
  return bundleCache.size
}

/**
 * Check if a component is cached.
 * @param componentPath - Absolute path to the component file
 * @param renderer - Renderer to check cache for (defaults to 'hono-jsx')
 */
export function isBundleCached(componentPath: string, renderer: 'hono-jsx' | 'react' = 'hono-jsx'): boolean {
  const cacheKey = `${componentPath}:${renderer}`
  return bundleCache.has(cacheKey)
}
