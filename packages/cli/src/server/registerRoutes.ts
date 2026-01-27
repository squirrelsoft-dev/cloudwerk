/**
 * @cloudwerk/cli - Route Registration
 *
 * Registers route handlers with Hono.
 */

import * as path from 'node:path'
import type { Hono, Handler, MiddlewareHandler } from 'hono'
import type { RedirectStatusCode } from 'hono/utils/http-status'
import type {
  RouteManifest,
  HttpMethod,
  CloudwerkHandler,
  RouteConfig,
  PageProps,
  LayoutProps,
} from '@cloudwerk/core'
import { createHandlerAdapter, setRouteConfig, NotFoundError, RedirectError } from '@cloudwerk/core'
import { render } from '@cloudwerk/ui'
import type { Logger, RegisteredRoute } from '../types.js'
import { loadRouteHandler } from './loadHandler.js'
import { loadMiddlewareModule } from './loadMiddleware.js'
import { loadPageModule } from './loadPage.js'
import { loadLayoutModule } from './loadLayout.js'
import { parseSearchParams } from './parseSearchParams.js'

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
 * For each route entry:
 * - fileType === 'route': Register API route handlers (GET, POST, etc.)
 * - fileType === 'page': Register page component with layout wrapping
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
    // Handle page files (page.tsx)
    if (route.fileType === 'page') {
      try {
        // Load page component
        logger.debug(`Loading page: ${route.filePath}`)
        const pageModule = await loadPageModule(route.absolutePath, verbose)
        const PageComponent = pageModule.default

        // Load all layout components (already in correct order: root -> closest)
        const layoutModules = await Promise.all(
          route.layouts.map((layoutPath) => loadLayoutModule(layoutPath, verbose))
        )
        const layouts = layoutModules.map((m) => m.default)

        // Apply middleware first (same as route.ts)
        for (const middlewarePath of route.middleware) {
          const middlewareHandler = await loadMiddlewareModule(middlewarePath, verbose)

          if (middlewareHandler) {
            app.use(route.urlPattern, middlewareHandler)

            if (verbose) {
              logger.info(
                `Applied middleware: ${path.basename(middlewarePath)} -> ${route.urlPattern}`
              )
            }
          }
        }

        // Apply config middleware if page exports config
        if (pageModule.config) {
          app.use(route.urlPattern, createConfigMiddleware(pageModule.config))

          if (verbose) {
            logger.info(`Applied page config: ${route.filePath} -> ${route.urlPattern}`)
          }
        }

        // Register page handler as GET route
        app.get(route.urlPattern, async (c) => {
          try {
            const params = c.req.param()
            const searchParams = parseSearchParams(c)
            const request = c.req.raw

            // Execute layout loaders sequentially (parent -> child)
            // Each layout gets its own loader data
            const layoutLoaderData: Record<string, unknown>[] = []
            for (let index = 0; index < layoutModules.length; index++) {
              const layoutModule = layoutModules[index]
              if (layoutModule.loader) {
                try {
                  const data = await Promise.resolve(
                    layoutModule.loader({ params, request, context: c })
                  )
                  layoutLoaderData[index] = (data ?? {}) as Record<string, unknown>
                } catch (error) {
                  // Handle NotFoundError - return 404 immediately
                  if (error instanceof NotFoundError) {
                    return c.notFound()
                  }
                  // Handle RedirectError - return redirect immediately
                  if (error instanceof RedirectError) {
                    return c.redirect(error.url, error.status as RedirectStatusCode)
                  }
                  // Re-throw other errors
                  throw error
                }
              } else {
                layoutLoaderData[index] = {}
              }
            }

            // Execute page loader
            let pageLoaderData: Record<string, unknown> = {}
            if (pageModule.loader) {
              try {
                const data = await Promise.resolve(
                  pageModule.loader({ params, request, context: c })
                )
                pageLoaderData = (data as Record<string, unknown>) ?? {}
              } catch (error) {
                // Handle NotFoundError - return 404 immediately
                if (error instanceof NotFoundError) {
                  return c.notFound()
                }
                // Handle RedirectError - return redirect immediately
                if (error instanceof RedirectError) {
                  return c.redirect(error.url, error.status as RedirectStatusCode)
                }
                // Re-throw other errors
                throw error
              }
            }

            // Build page props with loader data spread
            const pageProps: PageProps = { params, searchParams, ...pageLoaderData }

            // Render page component (handle async - all components are Server Components)
            let element = await Promise.resolve(PageComponent(pageProps))

            // Wrap with layouts (reverse to wrap inside-out)
            // Given layouts [root, dashboard, settings] (root-to-leaf from resolver):
            // 1. Reverse to [settings, dashboard, root]
            // 2. Wrap page with settings: <Settings><Page/></Settings>
            // 3. Wrap with dashboard: <Dashboard><Settings><Page/></Settings></Dashboard>
            // 4. Wrap with root: <Root><Dashboard><Settings><Page/></Settings></Dashboard></Root>
            // Result: proper nesting order (root wraps all)
            // Each layout receives its own loader data spread into props
            for (let i = layouts.length - 1; i >= 0; i--) {
              const Layout = layouts[i]
              const layoutProps: LayoutProps = {
                children: element,
                params,
                ...layoutLoaderData[i],
              }
              element = await Promise.resolve(Layout(layoutProps))
            }

            // Use @cloudwerk/ui render function (streaming SSR)
            return render(element)
          } catch (error) {
            // Log error for debugging
            const message = error instanceof Error ? error.message : String(error)
            logger.error(`Error rendering page ${route.filePath}: ${message}`)

            // Return error response (future: error.tsx boundary)
            return c.html(
              `<!DOCTYPE html><html><body><h1>Internal Server Error</h1></body></html>`,
              500
            )
          }
        })

        registeredRoutes.push({
          method: 'GET',
          pattern: route.urlPattern,
          filePath: route.filePath,
        })

        logger.debug(`Registered page ${route.urlPattern}`)
      } catch (error) {
        // Log error but continue with other routes
        const message = error instanceof Error ? error.message : String(error)
        logger.error(`Failed to load page ${route.filePath}: ${message}`)
      }

      continue
    }

    // Handle API routes (route.ts files)
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
