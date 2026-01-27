/**
 * @cloudwerk/cli - Hono App Factory
 *
 * Creates and configures the Hono application instance.
 */

import { Hono } from 'hono'
import type { RouteManifest, CloudwerkConfig, ScanResult } from '@cloudwerk/core'
import { contextMiddleware, resolveRoutesDir } from '@cloudwerk/core'
import { setActiveRenderer, getAvailableRenderers } from '@cloudwerk/ui'
import type { Logger, RegisteredRoute } from '../types.js'
import { registerRoutes } from './registerRoutes.js'
import { registerHydrationRoutes } from './hydrationRoutes.js'
import { createManifestTracker } from './hydrationManifest.js'
import { logRequest } from '../utils/logger.js'
import { HTTP_STATUS } from '../constants.js'

// ============================================================================
// App Creation
// ============================================================================

/**
 * Create a configured Hono application with registered routes.
 *
 * @param manifest - Route manifest from @cloudwerk/core
 * @param scanResult - Scan result containing error and not-found boundaries
 * @param config - Cloudwerk configuration
 * @param logger - Logger for output
 * @param verbose - Enable verbose logging
 * @returns Object with app instance and registered routes
 *
 * @example
 * const { app, routes } = await createApp(manifest, scanResult, config, logger)
 * serve({ fetch: app.fetch, port: 3000 })
 */
export async function createApp(
  manifest: RouteManifest,
  scanResult: ScanResult,
  config: CloudwerkConfig,
  logger: Logger,
  verbose: boolean = false
): Promise<{ app: Hono; routes: RegisteredRoute[] }> {
  // Initialize UI renderer from config
  const rendererName = config.ui?.renderer ?? 'hono-jsx'
  try {
    setActiveRenderer(rendererName)
    if (verbose) {
      logger.info(`Using UI renderer: ${rendererName}`)
    }
  } catch (error) {
    const available = getAvailableRenderers().join(', ')
    throw new Error(
      `Failed to initialize UI renderer "${rendererName}". Available renderers: ${available}.`,
      { cause: error }
    )
  }

  // Create Hono instance
  // strict: false allows trailing slashes to be optional
  // e.g., /api/users and /api/users/ both match the same route
  const app = new Hono({
    strict: false,
  })

  // Add context middleware (MUST be first to capture all requests)
  app.use('*', contextMiddleware())

  // Add request timing middleware for verbose mode
  if (verbose) {
    app.use('*', async (c, next) => {
      const start = Date.now()
      await next()
      const duration = Date.now() - start
      logRequest(c.req.method, c.req.path, c.res.status, duration)
    })
  }

  // Apply global middleware if configured
  if (config.globalMiddleware && config.globalMiddleware.length > 0) {
    for (const middleware of config.globalMiddleware) {
      app.use('*', middleware)
    }
  }

  // Create hydration manifest tracker for client component tracking
  const appDir = resolveRoutesDir(config, manifest.rootDir)
  const hydrationTracker = createManifestTracker(appDir)

  // Register hydration routes BEFORE other routes
  // This ensures /__cloudwerk/* routes take precedence
  registerHydrationRoutes(app, {
    tracker: hydrationTracker,
    appDir,
    logger,
    verbose,
    renderer: rendererName === 'react' ? 'react' : 'hono-jsx',
  })

  // Register routes from manifest (with hydration tracking)
  const routes = await registerRoutes(app, manifest, scanResult, logger, verbose, hydrationTracker)

  // Add 404 handler
  app.notFound((c) => {
    return c.json(
      {
        error: 'Not Found',
        path: c.req.path,
        method: c.req.method,
      },
      HTTP_STATUS.NOT_FOUND
    )
  })

  // Add global error handler
  app.onError((err, c) => {
    logger.error(`Request error: ${err.message}`)

    // In development, include error details
    return c.json(
      {
        error: 'Internal Server Error',
        message: err.message,
        stack: err.stack,
      },
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    )
  })

  return { app, routes }
}
