/**
 * @cloudwerk/cli - Route Registration
 *
 * Registers route handlers with Hono.
 */

import type { Hono, Handler } from 'hono'
import type { RouteManifest, HttpMethod } from '@cloudwerk/core'
import type { Logger, RegisteredRoute } from '../types.js'
import { loadRouteHandler } from './loadHandler.js'

// ============================================================================
// HTTP Methods
// ============================================================================

/**
 * HTTP methods we look for in route modules.
 */
const HTTP_METHODS: HttpMethod[] = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
  'HEAD',
]

// ============================================================================
// Route Registration
// ============================================================================

/**
 * Register all routes from the manifest with Hono.
 *
 * For each route entry with fileType === 'route':
 * 1. Compile and load the route handler module
 * 2. Extract HTTP method exports (GET, POST, etc.)
 * 3. Register each method with Hono
 *
 * @param app - Hono app instance
 * @param manifest - Route manifest from @cloudwerk/core
 * @param logger - Logger for output
 * @param verbose - Enable verbose logging
 * @returns Array of registered routes
 */
export async function registerRoutes(
  app: Hono,
  manifest: RouteManifest,
  logger: Logger,
  verbose: boolean = false
): Promise<RegisteredRoute[]> {
  const registeredRoutes: RegisteredRoute[] = []

  for (const route of manifest.routes) {
    // Only process API routes (route.ts files)
    if (route.fileType !== 'route') {
      logger.debug(`Skipping non-route file: ${route.filePath}`)
      continue
    }

    try {
      // Load the route handler module
      logger.debug(`Loading route handler: ${route.filePath}`)
      const module = await loadRouteHandler(route.absolutePath, verbose)

      // Register each HTTP method export
      for (const method of HTTP_METHODS) {
        const handler = module[method]

        if (handler && typeof handler === 'function') {
          registerMethod(app, method, route.urlPattern, handler)

          registeredRoutes.push({
            method,
            pattern: route.urlPattern,
            filePath: route.filePath,
          })

          logger.debug(`Registered ${method} ${route.urlPattern}`)
        }
      }
    } catch (error) {
      // Log error but continue with other routes
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`Failed to load route ${route.filePath}: ${message}`)

      // Continue to next route - don't fail the whole server
    }
  }

  return registeredRoutes
}

/**
 * Register a single HTTP method handler with Hono.
 *
 * @param app - Hono app instance
 * @param method - HTTP method
 * @param pattern - URL pattern
 * @param handler - Route handler function
 */
function registerMethod(
  app: Hono,
  method: HttpMethod,
  pattern: string,
  handler: (c: unknown) => Response | Promise<Response>
): void {
  // Cast to Hono's Handler type for proper type compatibility
  // The handler signature is compatible at runtime
  const h = handler as Handler

  switch (method) {
    case 'GET':
      app.get(pattern, h)
      break
    case 'POST':
      app.post(pattern, h)
      break
    case 'PUT':
      app.put(pattern, h)
      break
    case 'PATCH':
      app.patch(pattern, h)
      break
    case 'DELETE':
      app.delete(pattern, h)
      break
    case 'OPTIONS':
      app.options(pattern, h)
      break
    case 'HEAD':
      app.on('HEAD', [pattern], h)
      break
  }
}
