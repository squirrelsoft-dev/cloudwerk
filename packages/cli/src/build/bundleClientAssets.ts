/**
 * @cloudwerk/cli - Client Asset Bundler
 *
 * Pre-generates all client-side assets at build time for production deployment.
 * This includes the hydration runtime and individual component bundles.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import type { RouteManifest } from '@cloudwerk/core'
import { generateClientBundles, generateBundledRuntime } from '../server/clientBundle.js'
import { loadPageModule } from '../server/loadPage.js'
import { loadLayoutModule } from '../server/loadLayout.js'
import type { Logger } from '../types.js'
import type { ClientBundleResult } from '../types.js'

// ============================================================================
// Types
// ============================================================================

/**
 * Options for client asset bundling.
 */
export interface BundleClientAssetsOptions {
  /** Route manifest */
  manifest: RouteManifest
  /** Output directory (dist/) */
  outputDir: string
  /** App directory for component ID generation */
  appDir: string
  /** Enable minification */
  minify?: boolean
  /** Enable source maps */
  sourcemap?: boolean
  /** Renderer to use ('hono-jsx' or 'react') */
  renderer?: 'hono-jsx' | 'react'
  /** Logger for output */
  logger: Logger
  /** Enable verbose logging */
  verbose?: boolean
}

// ============================================================================
// Constants
// ============================================================================

/** Subdirectory for client assets within output directory */
const CLIENT_ASSETS_DIR = '__cloudwerk'

/** Base path for client assets (used in URLs) */
const CLIENT_BASE_PATH = '/__cloudwerk'

// ============================================================================
// Client Asset Bundling
// ============================================================================

/**
 * Bundle all client-side assets for production.
 *
 * This function:
 * 1. Scans all routes to discover client components
 * 2. Generates the bundled hydration runtime
 * 3. Bundles each client component individually
 * 4. Writes a client manifest for runtime use
 *
 * @param options - Bundling options
 * @returns Bundle result with paths and sizes
 *
 * @example
 * ```typescript
 * const result = await bundleClientAssets({
 *   manifest,
 *   outputDir: './dist',
 *   appDir: './app',
 *   minify: true,
 *   logger,
 * })
 * console.log(`Total client bundle size: ${result.totalSize} bytes`)
 * ```
 */
export async function bundleClientAssets(
  options: BundleClientAssetsOptions
): Promise<ClientBundleResult> {
  const {
    manifest,
    outputDir,
    appDir,
    minify = true,
    sourcemap = false,
    renderer = 'hono-jsx',
    logger,
    verbose = false,
  } = options

  // Create output directory for client assets
  const clientOutputDir = path.join(outputDir, CLIENT_ASSETS_DIR)
  if (!fs.existsSync(clientOutputDir)) {
    fs.mkdirSync(clientOutputDir, { recursive: true })
  }

  logger.info('Bundling client assets...')

  // Step 1: Discover all client components by loading page/layout modules
  const clientComponents = await discoverClientComponents(manifest, appDir, logger, verbose)

  if (verbose) {
    logger.debug(`Discovered ${clientComponents.size} client component(s)`)
  }

  // Step 2: Generate and write the hydration runtime
  logger.debug('Generating hydration runtime...')
  const runtimeContent = await generateBundledRuntime(renderer)
  const runtimeFileName = renderer === 'react' ? 'react-runtime.js' : 'runtime.js'
  const runtimePath = path.join(clientOutputDir, runtimeFileName)
  fs.writeFileSync(runtimePath, runtimeContent)
  const runtimeSize = Buffer.byteLength(runtimeContent, 'utf8')

  if (verbose) {
    logger.debug(`Generated runtime: ${runtimePath} (${formatSize(runtimeSize)})`)
  }

  // Step 3: Bundle all client components
  const componentBundles = new Map<string, string>()
  const componentSizes = new Map<string, number>()
  let totalComponentSize = 0

  if (clientComponents.size > 0) {
    const componentPaths = Array.from(clientComponents.keys())

    const bundleResult = await generateClientBundles(componentPaths, {
      outputDir: clientOutputDir,
      appDir,
      basePath: CLIENT_BASE_PATH,
      minify,
      sourcemap,
      verbose,
      renderer,
    })

    // Collect bundle information
    for (const [componentId, bundlePath] of bundleResult.bundles) {
      componentBundles.set(componentId, bundlePath)
      const fullPath = path.join(clientOutputDir, `${componentId}.js`)
      if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath)
        componentSizes.set(componentId, stat.size)
        totalComponentSize += stat.size
      }
    }

    // Write the hydration manifest (convert Map to plain object for JSON)
    const manifestPath = path.join(clientOutputDir, 'manifest.json')
    const serializableManifest = {
      basePath: bundleResult.manifest.basePath,
      components: Object.fromEntries(bundleResult.manifest.components),
      generatedAt: bundleResult.manifest.generatedAt.toISOString(),
    }
    const manifestContent = JSON.stringify(serializableManifest, null, 2)
    fs.writeFileSync(manifestPath, manifestContent)

    if (verbose) {
      logger.debug(`Written manifest: ${manifestPath}`)
    }
  } else {
    // Write empty manifest if no client components
    const emptyManifest = {
      basePath: CLIENT_BASE_PATH,
      components: {},
      generatedAt: new Date().toISOString(),
    }
    const manifestPath = path.join(clientOutputDir, 'manifest.json')
    fs.writeFileSync(manifestPath, JSON.stringify(emptyManifest, null, 2))
  }

  const totalSize = runtimeSize + totalComponentSize

  logger.info(`Client assets bundled: ${formatSize(totalSize)}`)
  if (verbose) {
    logger.debug(`  Runtime: ${formatSize(runtimeSize)}`)
    logger.debug(`  Components: ${componentBundles.size} bundles (${formatSize(totalComponentSize)})`)
  }

  return {
    runtimePath,
    runtimeSize,
    componentBundles,
    componentSizes,
    manifestPath: path.join(clientOutputDir, 'manifest.json'),
    totalSize,
  }
}

// ============================================================================
// Client Component Discovery
// ============================================================================

/**
 * Discover all client components by loading page and layout modules.
 *
 * This walks through all routes in the manifest and loads their page/layout
 * modules to trigger client component detection via the esbuild plugin.
 *
 * @param manifest - Route manifest
 * @param appDir - App directory for component ID generation
 * @param logger - Logger for output
 * @param verbose - Enable verbose logging
 * @returns Map of component file path to component info
 */
async function discoverClientComponents(
  manifest: RouteManifest,
  appDir: string,
  logger: Logger,
  verbose: boolean
): Promise<Map<string, { componentId: string; filePath: string }>> {
  const clientComponents = new Map<string, { componentId: string; filePath: string }>()

  for (const route of manifest.routes) {
    // Only process page files - they import client components
    if (route.fileType !== 'page') {
      continue
    }

    try {
      // Load page module - this triggers client component detection
      const pageModule = await loadPageModule(route.absolutePath, verbose, appDir)

      // Track page itself if it's a client component
      if (pageModule.isClientComponent && pageModule.clientComponentId) {
        clientComponents.set(route.absolutePath, {
          componentId: pageModule.clientComponentId,
          filePath: route.absolutePath,
        })
      }

      // Track discovered client components from imports
      if (pageModule.discoveredClientComponents) {
        for (const [filePath, component] of pageModule.discoveredClientComponents) {
          clientComponents.set(filePath, {
            componentId: component.componentId,
            filePath: component.filePath,
          })
        }
      }

      // Load layout modules to discover their client components
      for (const layoutPath of route.layouts) {
        try {
          const layoutModule = await loadLayoutModule(layoutPath, verbose)

          // Track layout itself if it's a client component
          if (layoutModule.isClientComponent && layoutModule.clientComponentId) {
            clientComponents.set(layoutPath, {
              componentId: layoutModule.clientComponentId,
              filePath: layoutPath,
            })
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          logger.warn(`Failed to load layout ${layoutPath}: ${message}`)
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.warn(`Failed to load page ${route.filePath}: ${message}`)
    }
  }

  return clientComponents
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Format a byte size for human-readable display.
 *
 * @param bytes - Size in bytes
 * @returns Formatted size string (e.g., "14.2 KB")
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
