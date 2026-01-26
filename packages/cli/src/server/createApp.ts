/**
 * @cloudwerk/cli - Hono App Factory
 *
 * Creates and configures the Hono application instance.
 */

import { Hono } from 'hono'
import type { RouteManifest, CloudwerkConfig } from '@cloudwerk/core'
import type { Logger, RegisteredRoute } from '../types.js'
import { registerRoutes } from './registerRoutes.js'
import { logRequest } from '../utils/logger.js'

// ============================================================================
// App Creation
// ============================================================================

/**
 * Create a configured Hono application with registered routes.
 *
 * @param manifest - Route manifest from @cloudwerk/core
 * @param config - Cloudwerk configuration
 * @param logger - Logger for output
 * @returns Object with app instance and registered routes
 *
 * @example
 * const { app, routes } = await createApp(manifest, config, logger)
 * serve({ fetch: app.fetch, port: 3000 })
 */
export async function createApp(
  manifest: RouteManifest,
  config: CloudwerkConfig,
  logger: Logger,
  verbose: boolean = false
): Promise<{ app: Hono; routes: RegisteredRoute[] }> {
  // Create Hono instance with base path
  const app = new Hono({
    strict: false,
  })

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

  // Register routes from manifest
  const routes = await registerRoutes(app, manifest, logger)

  // Add 404 handler
  app.notFound((c) => {
    return c.json(
      {
        error: 'Not Found',
        path: c.req.path,
        method: c.req.method,
      },
      404
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
      500
    )
  })

  return { app, routes }
}
