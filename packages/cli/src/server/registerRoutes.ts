/**
 * @cloudwerk/cli - Route Registration
 *
 * Registers route handlers with Hono.
 */

import * as path from 'node:path'
import type { Hono, Handler, MiddlewareHandler } from 'hono'
import type { RouteManifest, HttpMethod, CloudwerkHandler, RouteConfig } from '@cloudwerk/core'
import { createHandlerAdapter, setRouteConfig } from '@cloudwerk/core'
import type { Logger, RegisteredRoute } from '../types.js'
import { loadRouteHandler } from './loadHandler.js'
import { loadMiddlewareModule } from './loadMiddleware.js'

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
// Handler Detection
// ============================================================================

/**
 * Detect if a handler uses the new Cloudwerk signature.
 *
 * Detection is based on function arity (number of declared parameters):
 * - Arity 2: Cloudwerk handler `(request, context) => Response`
 * - Arity 1: Legacy Hono handler `(c) => Response`
 *
 * **Important**: Cloudwerk handlers must always declare both parameters,
 * even if context is unused. Use `_context` for unused parameters:
 *
 * @example
 * // Correct - arity 2
 * export function GET(request: Request, _context: CloudwerkHandlerContext) {
 *   return new Response('Hello')
 * }
 *
 * // Also correct - arity 2
 * export function GET(request: Request, { params }: CloudwerkHandlerContext) {
 *   return json({ id: params.id })
 * }
 *
 * // Incorrect - arity 1, will be treated as Hono handler
 * export function GET(request: Request) {
 *   return new Response('Hello')
 * }
 */
function isCloudwerkHandler(fn: unknown): fn is CloudwerkHandler {
  return typeof fn === 'function' && fn.length === 2
}

/**
 * Create middleware that sets route config in the request context.
 *
 * This middleware runs AFTER user middleware to ensure the config
 * is available for the route handler. User middleware cannot override
 * the route config because this runs after them.
 *
 * @param config - The route configuration to set
 * @returns Hono middleware handler
 */
function createConfigMiddleware(config: RouteConfig): MiddlewareHandler {
  return async (c, next) => {
    setRouteConfig(config)
    await next()
  }
}

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
      // Load and apply middleware for this route (in order from root to closest)
      // The resolver already returns middleware in the correct order
      for (const middlewarePath of route.middleware) {
        const middlewareHandler = await loadMiddlewareModule(middlewarePath, verbose)

        if (middlewareHandler) {
          // Apply to this specific route pattern
          app.use(route.urlPattern, middlewareHandler)

          if (verbose) {
            logger.info(`Applied middleware: ${path.basename(middlewarePath)} -> ${route.urlPattern}`)
          }
        }
      }

      // Load the route handler module
      logger.debug(`Loading route handler: ${route.filePath}`)
      const module = await loadRouteHandler(route.absolutePath, verbose)

      // Apply config middleware if route exports config
      // This runs AFTER user middleware, so config is only available in handlers
      // (user middleware cannot access getRouteConfig() - see plan for rationale)
      if (module.config) {
        app.use(route.urlPattern, createConfigMiddleware(module.config))

        if (verbose) {
          logger.info(`Applied route config: ${route.filePath} -> ${route.urlPattern}`)
        }
      }

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
 * @param handler - Route handler function (Hono or Cloudwerk signature)
 */
function registerMethod(
  app: Hono,
  method: HttpMethod,
  pattern: string,
  handler: Handler | CloudwerkHandler
): void {
  // Wrap Cloudwerk-native handlers for Hono compatibility
  const h: Handler = isCloudwerkHandler(handler)
    ? createHandlerAdapter(handler)
    : handler as Handler

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
