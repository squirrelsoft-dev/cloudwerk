/**
 * @cloudwerk/cli - Hydration Routes
 *
 * Serves client-side hydration bundles:
 * - /__cloudwerk/runtime.js - Hono JSX hydration runtime
 * - /__cloudwerk/react-runtime.js - React hydration runtime
 * - /__cloudwerk/:componentId.js - Individual component bundles
 */

import type { Hono } from 'hono'
import {
  generateHydrationRuntime,
  generateReactHydrationRuntime,
} from '@cloudwerk/ui'
import { generateBundleOnDemand } from './clientBundle.js'
import type { HydrationManifestTracker } from './hydrationManifest.js'
import { getComponentByIdFromTracker } from './hydrationManifest.js'
import type { Logger } from '../types.js'

// ============================================================================
// Types
// ============================================================================

/**
 * Options for registering hydration routes.
 */
export interface HydrationRoutesOptions {
  /** Hydration manifest tracker */
  tracker: HydrationManifestTracker
  /** App directory for component ID generation */
  appDir: string
  /** Logger for output */
  logger: Logger
  /** Enable verbose logging */
  verbose?: boolean
  /** Renderer type for determining which runtime to use */
  renderer?: 'hono-jsx' | 'react'
}

// ============================================================================
// Runtime Cache
// ============================================================================

/**
 * Cache for generated runtime bundles.
 * These don't change during a dev session, so we can cache them.
 */
const runtimeCache = new Map<string, string>()

// ============================================================================
// Route Registration
// ============================================================================

/**
 * Register hydration routes with the Hono app.
 *
 * This registers the following routes BEFORE other routes:
 * - GET /__cloudwerk/runtime.js - Hono JSX hydration runtime
 * - GET /__cloudwerk/react-runtime.js - React hydration runtime
 * - GET /__cloudwerk/:componentId.js - Individual component bundles
 *
 * @param app - Hono app instance
 * @param options - Hydration route options
 *
 * @example
 * ```typescript
 * const tracker = createManifestTracker(appDir)
 * registerHydrationRoutes(app, {
 *   tracker,
 *   appDir,
 *   logger,
 *   verbose: true,
 * })
 * ```
 */
export function registerHydrationRoutes(
  app: Hono,
  options: HydrationRoutesOptions
): void {
  const { tracker, appDir, logger, verbose = false, renderer = 'hono-jsx' } = options

  // Register Hono JSX runtime route
  app.get('/__cloudwerk/runtime.js', (c) => {
    if (verbose) {
      logger.debug('Serving Hono JSX hydration runtime')
    }

    // Check cache first
    let runtime = runtimeCache.get('hono-jsx')
    if (!runtime) {
      runtime = generateHydrationRuntime()
      runtimeCache.set('hono-jsx', runtime)
    }

    return c.text(runtime, 200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
    })
  })

  // Register React runtime route
  app.get('/__cloudwerk/react-runtime.js', (c) => {
    if (verbose) {
      logger.debug('Serving React hydration runtime')
    }

    // Check cache first
    let runtime = runtimeCache.get('react')
    if (!runtime) {
      runtime = generateReactHydrationRuntime()
      runtimeCache.set('react', runtime)
    }

    return c.text(runtime, 200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
    })
  })

  // Register component bundle route
  // Note: The :componentId param doesn't include .js extension
  app.get('/__cloudwerk/:componentId{.+\\.js$}', async (c) => {
    const componentIdWithExt = c.req.param('componentId')
    // Remove .js extension to get component ID
    const componentId = componentIdWithExt.replace(/\.js$/, '')

    if (verbose) {
      logger.debug(`Serving component bundle: ${componentId}`)
    }

    // Look up component in tracker
    const component = getComponentByIdFromTracker(tracker, componentId)

    if (!component) {
      logger.warn(`[Cloudwerk] Component not found: ${componentId}`)
      return c.text(`// Component not found: ${componentId}`, 404, {
        'Content-Type': 'application/javascript; charset=utf-8',
      })
    }

    try {
      // Generate bundle on-demand
      const { content } = await generateBundleOnDemand(
        component.filePath,
        appDir,
        { renderer }
      )

      return c.text(content, 200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-cache', // Dev mode - always check for updates
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`[Cloudwerk] Failed to bundle component ${componentId}: ${message}`)
      return c.text(`// Bundle error: ${message}`, 500, {
        'Content-Type': 'application/javascript; charset=utf-8',
      })
    }
  })

  if (verbose) {
    logger.info('Registered hydration routes at /__cloudwerk/*')
  }
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Clear the runtime cache.
 * Call this when runtimes need to be regenerated.
 */
export function clearRuntimeCache(): void {
  runtimeCache.clear()
}
