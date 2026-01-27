/**
 * @cloudwerk/cli - Route Registration
 *
 * Registers route handlers with Hono.
 */

import * as path from 'node:path'
import type { Hono, Handler, MiddlewareHandler, Context } from 'hono'
import type { RedirectStatusCode } from 'hono/utils/http-status'
import type {
  RouteManifest,
  HttpMethod,
  CloudwerkHandler,
  RouteConfig,
  PageProps,
  LayoutProps,
  LoaderFunction,
  LoaderArgs,
  ActionFunction,
  ActionArgs,
  ScanResult,
  ErrorBoundaryProps,
  NotFoundProps,
  LoadingProps,
} from '@cloudwerk/core'
import {
  createHandlerAdapter,
  setRouteConfig,
  NotFoundError,
  RedirectError,
  resolveErrorBoundary,
  resolveNotFoundBoundary,
  resolveLoadingBoundary,
} from '@cloudwerk/core'
import { render, renderStream, renderToStream } from '@cloudwerk/ui'
import type { Logger, RegisteredRoute } from '../types.js'
import { loadRouteHandler } from './loadHandler.js'
import { loadMiddlewareModule } from './loadMiddleware.js'
import { loadPageModule } from './loadPage.js'
import { loadLayoutModule } from './loadLayout.js'
import { loadErrorBoundaryModule } from './loadErrorBoundary.js'
import { loadNotFoundModule } from './loadNotFound.js'
import { loadLoadingModule, type LoadedLoadingModule } from './loadLoading.js'
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
// Loader Execution
// ============================================================================

/**
 * Result of executing a loader function.
 * Either returns data or an early response (404/redirect).
 */
type LoaderResult =
  | { data: Record<string, unknown>; response?: never }
  | { data?: never; response: Response }

/**
 * Execute a loader function with error handling for RedirectError.
 * NotFoundError is re-thrown to be handled by error boundary logic.
 *
 * @param loader - The loader function to execute
 * @param args - Arguments to pass to the loader
 * @param c - Hono context for creating responses
 * @returns Data from the loader or an early response (redirect only)
 */
async function executeLoader(
  loader: LoaderFunction,
  args: LoaderArgs,
  c: Context
): Promise<LoaderResult> {
  try {
    const data = await Promise.resolve(loader(args))
    return { data: (data ?? {}) as Record<string, unknown> }
  } catch (error) {
    // RedirectError is handled here as a response
    if (error instanceof RedirectError) {
      return { response: c.redirect(error.url, error.status as RedirectStatusCode) }
    }
    // NotFoundError and other errors are re-thrown to be handled by error boundaries
    throw error
  }
}

// ============================================================================
// Action Execution
// ============================================================================

/**
 * Result of executing an action function.
 * Either returns data for re-rendering or an early response (redirect/json).
 */
type ActionResult =
  | { data: Record<string, unknown>; response?: never }
  | { data?: never; response: Response }

/**
 * Execute an action function with error handling for NotFoundError and RedirectError.
 *
 * If the action returns a Response, it's passed through directly.
 * If the action returns data, it's returned for re-rendering the page with actionData.
 *
 * @param action - The action function to execute
 * @param args - Arguments to pass to the action
 * @param c - Hono context for creating responses
 * @returns Data from the action or an early response
 */
async function executeAction(
  action: ActionFunction,
  args: ActionArgs,
  c: Context
): Promise<ActionResult> {
  try {
    const result = await Promise.resolve(action(args))

    // If action returned a Response, pass it through
    if (result instanceof Response) {
      return { response: result }
    }

    // Otherwise return as data for re-rendering
    return { data: (result ?? {}) as Record<string, unknown> }
  } catch (error) {
    // RedirectError is handled here as a response
    if (error instanceof RedirectError) {
      return { response: c.redirect(error.url, error.status as RedirectStatusCode) }
    }
    // NotFoundError and other errors are re-thrown to be handled by error boundaries
    throw error
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
 * @param scanResult - Scan result containing error and not-found boundaries
 * @param logger - Logger for output
 * @param verbose - Enable verbose logging
 * @returns Array of registered routes
 */
export async function registerRoutes(
  app: Hono,
  manifest: RouteManifest,
  scanResult: ScanResult,
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

        // Load loading component if one exists for this route
        const loadingPath = resolveLoadingBoundary(route.filePath, scanResult.loading)
        let loadingModule: LoadedLoadingModule | null = null
        if (loadingPath) {
          try {
            loadingModule = await loadLoadingModule(loadingPath, verbose)
            if (verbose) {
              logger.info(`Loaded loading boundary: ${loadingPath} -> ${route.urlPattern}`)
            }
          } catch (loadingError) {
            const loadingMessage =
              loadingError instanceof Error ? loadingError.message : String(loadingError)
            logger.error(`Failed to load loading boundary: ${loadingMessage}`)
            // Continue without streaming - fall back to non-streaming behavior
          }
        }

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
          // Declare variables outside try block so they're available in catch
          const params = c.req.param()
          const searchParams = parseSearchParams(c)
          const request = c.req.raw
          const pathname = new URL(request.url).pathname
          const layoutLoaderData: Record<string, unknown>[] = []

          // Determine if streaming is enabled for this route
          // Streaming is enabled if: loading.tsx exists AND streaming !== false in config
          const streamingDisabled = pageModule.config?.streaming === false
          const useStreaming = loadingModule && !streamingDisabled

          if (useStreaming) {
            // STREAMING MODE: Show loading UI immediately, stream content when ready
            try {
              const LoadingComponent = loadingModule.default

              // Create loading props
              const loadingProps: LoadingProps = { params, searchParams, pathname }

              // Render loading component
              let loadingElement = await Promise.resolve(LoadingComponent(loadingProps))

              // Wrap loading component with layouts (without loader data since loaders haven't run yet)
              // Layouts are rendered with empty objects for loader data - they should handle undefined gracefully
              for (let i = layouts.length - 1; i >= 0; i--) {
                const Layout = layouts[i]
                const layoutProps: LayoutProps = {
                  children: loadingElement,
                  params,
                  // Pass empty objects for layout loader data since loaders haven't run
                }
                loadingElement = await Promise.resolve(Layout(layoutProps))
              }

              // Create a promise that resolves to the full content (with loaders executed)
              const contentPromise = (async () => {
                // Execute layout loaders sequentially (parent -> child)
                const loaderArgs: LoaderArgs = { params, request, context: c }

                for (let index = 0; index < layoutModules.length; index++) {
                  const layoutModule = layoutModules[index]
                  if (layoutModule.loader) {
                    const result = await executeLoader(layoutModule.loader, loaderArgs, c)
                    if (result.response) {
                      // Redirect/response from loader - render error message in stream
                      // We can't redirect during streaming, so render error boundary
                      throw new Error('Redirect during streaming not supported')
                    }
                    layoutLoaderData[index] = result.data
                  } else {
                    layoutLoaderData[index] = {}
                  }
                }

                // Execute page loader
                let pageLoaderData: Record<string, unknown> = {}
                if (pageModule.loader) {
                  const result = await executeLoader(pageModule.loader, loaderArgs, c)
                  if (result.response) {
                    throw new Error('Redirect during streaming not supported')
                  }
                  pageLoaderData = result.data
                }

                // Build page props with loader data spread
                const pageProps: PageProps = { params, searchParams, ...pageLoaderData }

                // Render page component
                let element = await Promise.resolve(PageComponent(pageProps))

                // Wrap with layouts (with loader data now available)
                for (let i = layouts.length - 1; i >= 0; i--) {
                  const Layout = layouts[i]
                  const layoutProps: LayoutProps = {
                    children: element,
                    params,
                    ...layoutLoaderData[i],
                  }
                  element = await Promise.resolve(Layout(layoutProps))
                }

                return element
              })()

              // Use streaming render - sends loading UI first, then streams content
              return renderStream(loadingElement, contentPromise)
            } catch (error) {
              // Handle errors during streaming setup (loading component render)
              // Fall through to non-streaming error handling
              const message = error instanceof Error ? error.message : String(error)
              logger.error(`Streaming error in ${route.filePath}: ${message}`)

              // Fall through to non-streaming mode on error
            }
          }

          // NON-STREAMING MODE: Wait for all loaders, then render
          try {
            // Execute layout loaders sequentially (parent -> child)
            // Each layout gets its own loader data
            const loaderArgs: LoaderArgs = { params, request, context: c }

            for (let index = 0; index < layoutModules.length; index++) {
              const layoutModule = layoutModules[index]
              if (layoutModule.loader) {
                const result = await executeLoader(layoutModule.loader, loaderArgs, c)
                if (result.response) {
                  return result.response
                }
                layoutLoaderData[index] = result.data
              } else {
                layoutLoaderData[index] = {}
              }
            }

            // Execute page loader
            let pageLoaderData: Record<string, unknown> = {}
            if (pageModule.loader) {
              const result = await executeLoader(pageModule.loader, loaderArgs, c)
              if (result.response) {
                return result.response
              }
              pageLoaderData = result.data
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

            // Use renderToStream for native Suspense support
            // This enables progressive streaming for pages with Suspense boundaries
            return renderToStream(element)
          } catch (error) {
            // Handle NotFoundError with not-found boundary
            if (error instanceof NotFoundError) {
              const notFoundPath = resolveNotFoundBoundary(route.filePath, scanResult.notFound)

              if (notFoundPath) {
                try {
                  const notFoundModule = await loadNotFoundModule(notFoundPath, verbose)
                  const NotFoundComponent = notFoundModule.default

                  const notFoundProps: NotFoundProps = { params, searchParams }
                  let notFoundElement = await Promise.resolve(NotFoundComponent(notFoundProps))

                  // Wrap with layouts (all layouts loaded successfully before error)
                  for (let i = layouts.length - 1; i >= 0; i--) {
                    const Layout = layouts[i]
                    const layoutProps: LayoutProps = {
                      children: notFoundElement,
                      params,
                      ...layoutLoaderData[i],
                    }
                    notFoundElement = await Promise.resolve(Layout(layoutProps))
                  }

                  return render(notFoundElement, { status: 404 })
                } catch (boundaryError) {
                  const boundaryMessage =
                    boundaryError instanceof Error ? boundaryError.message : String(boundaryError)
                  logger.error(`Not-found boundary failed: ${boundaryMessage}`)
                }
              }

              // Fallback to Hono's notFound
              return c.notFound()
            }

            // Handle other errors with error boundary
            const errorPath = resolveErrorBoundary(route.filePath, scanResult.errors)

            if (errorPath) {
              try {
                const errorModule = await loadErrorBoundaryModule(errorPath, verbose)
                const ErrorComponent = errorModule.default

                // Generate digest for production logging
                const digest = crypto.randomUUID().slice(0, 8)
                const originalMessage = error instanceof Error ? error.message : String(error)
                logger.error(`Error [${digest}] in ${route.filePath}: ${originalMessage}`)

                // Sanitize error for production
                const sanitizedError =
                  process.env.NODE_ENV === 'production'
                    ? Object.assign(new Error('An error occurred'), { digest })
                    : Object.assign(
                        error instanceof Error ? error : new Error(String(error)),
                        { digest }
                      )

                const errorProps: ErrorBoundaryProps = {
                  error: sanitizedError,
                  errorType: 'loader',
                  reset: () => {},
                  params,
                  searchParams,
                }

                let errorElement = await Promise.resolve(ErrorComponent(errorProps))

                // Wrap with layouts (all layouts that loaded successfully)
                for (let i = layouts.length - 1; i >= 0; i--) {
                  const Layout = layouts[i]
                  const layoutProps: LayoutProps = {
                    children: errorElement,
                    params,
                    ...layoutLoaderData[i],
                  }
                  errorElement = await Promise.resolve(Layout(layoutProps))
                }

                return render(errorElement, { status: 500 })
              } catch (boundaryError) {
                const boundaryMessage =
                  boundaryError instanceof Error ? boundaryError.message : String(boundaryError)
                logger.error(`Error boundary failed: ${boundaryMessage}`)
              }
            }

            // Fallback error response
            const message = error instanceof Error ? error.message : String(error)
            logger.error(`Error rendering page ${route.filePath}: ${message}`)
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

        // Register action handlers for mutation methods (POST, PUT, PATCH, DELETE)
        const actionMethods: HttpMethod[] = ['POST', 'PUT', 'PATCH', 'DELETE']

        for (const method of actionMethods) {
          // Prefer named export (e.g., POST) over generic action
          const action = pageModule[method as keyof typeof pageModule] ?? pageModule.action

          if (action && typeof action === 'function') {
            const actionFn = action as ActionFunction

            // Register the action handler
            registerMethod(app, method, route.urlPattern, async (c) => {
              // Declare variables outside try block so they're available in catch
              const params = c.req.param()
              const searchParams = parseSearchParams(c)
              const request = c.req.raw
              const layoutLoaderData: Record<string, unknown>[] = []

              try {
                // Execute action
                const actionArgs: ActionArgs = { params, request, context: c }
                const actionResult = await executeAction(actionFn, actionArgs, c)

                // If action returned a Response (redirect, json, etc.), return it directly
                if (actionResult.response) {
                  return actionResult.response
                }

                // Action returned data - re-run loaders and render page with actionData

                // Execute layout loaders sequentially (parent -> child)
                const loaderArgs: LoaderArgs = { params, request, context: c }

                for (let index = 0; index < layoutModules.length; index++) {
                  const layoutModule = layoutModules[index]
                  if (layoutModule.loader) {
                    const result = await executeLoader(layoutModule.loader, loaderArgs, c)
                    if (result.response) {
                      return result.response
                    }
                    layoutLoaderData[index] = result.data
                  } else {
                    layoutLoaderData[index] = {}
                  }
                }

                // Execute page loader
                let pageLoaderData: Record<string, unknown> = {}
                if (pageModule.loader) {
                  const result = await executeLoader(pageModule.loader, loaderArgs, c)
                  if (result.response) {
                    return result.response
                  }
                  pageLoaderData = result.data
                }

                // Build page props with loader data spread and actionData
                const pageProps: PageProps = {
                  params,
                  searchParams,
                  actionData: actionResult.data,
                  ...pageLoaderData,
                }

                // Render page component (handle async - all components are Server Components)
                let element = await Promise.resolve(PageComponent(pageProps))

                // Wrap with layouts (reverse to wrap inside-out)
                for (let i = layouts.length - 1; i >= 0; i--) {
                  const Layout = layouts[i]
                  const layoutProps: LayoutProps = {
                    children: element,
                    params,
                    ...layoutLoaderData[i],
                  }
                  element = await Promise.resolve(Layout(layoutProps))
                }

                // Use renderToStream for native Suspense support
                // This enables progressive streaming for pages with Suspense boundaries
                return renderToStream(element)
              } catch (error) {
                // Handle NotFoundError with not-found boundary
                if (error instanceof NotFoundError) {
                  const notFoundPath = resolveNotFoundBoundary(route.filePath, scanResult.notFound)

                  if (notFoundPath) {
                    try {
                      const notFoundModule = await loadNotFoundModule(notFoundPath, verbose)
                      const NotFoundComponent = notFoundModule.default

                      const notFoundProps: NotFoundProps = { params, searchParams }
                      let notFoundElement = await Promise.resolve(NotFoundComponent(notFoundProps))

                      // Wrap with layouts
                      for (let i = layouts.length - 1; i >= 0; i--) {
                        const Layout = layouts[i]
                        const layoutProps: LayoutProps = {
                          children: notFoundElement,
                          params,
                          ...layoutLoaderData[i],
                        }
                        notFoundElement = await Promise.resolve(Layout(layoutProps))
                      }

                      return render(notFoundElement, { status: 404 })
                    } catch (boundaryError) {
                      const boundaryMessage =
                        boundaryError instanceof Error ? boundaryError.message : String(boundaryError)
                      logger.error(`Not-found boundary failed: ${boundaryMessage}`)
                    }
                  }

                  return c.notFound()
                }

                // Handle other errors with error boundary
                const errorPath = resolveErrorBoundary(route.filePath, scanResult.errors)

                if (errorPath) {
                  try {
                    const errorModule = await loadErrorBoundaryModule(errorPath, verbose)
                    const ErrorComponent = errorModule.default

                    // Generate digest for production logging
                    const digest = crypto.randomUUID().slice(0, 8)
                    const originalMessage = error instanceof Error ? error.message : String(error)
                    logger.error(`Error [${digest}] in ${route.filePath} action: ${originalMessage}`)

                    // Sanitize error for production
                    const sanitizedError =
                      process.env.NODE_ENV === 'production'
                        ? Object.assign(new Error('An error occurred'), { digest })
                        : Object.assign(
                            error instanceof Error ? error : new Error(String(error)),
                            { digest }
                          )

                    const errorProps: ErrorBoundaryProps = {
                      error: sanitizedError,
                      errorType: 'action',
                      reset: () => {},
                      params,
                      searchParams,
                    }

                    let errorElement = await Promise.resolve(ErrorComponent(errorProps))

                    // Wrap with layouts
                    for (let i = layouts.length - 1; i >= 0; i--) {
                      const Layout = layouts[i]
                      const layoutProps: LayoutProps = {
                        children: errorElement,
                        params,
                        ...layoutLoaderData[i],
                      }
                      errorElement = await Promise.resolve(Layout(layoutProps))
                    }

                    return render(errorElement, { status: 500 })
                  } catch (boundaryError) {
                    const boundaryMessage =
                      boundaryError instanceof Error ? boundaryError.message : String(boundaryError)
                    logger.error(`Error boundary failed: ${boundaryMessage}`)
                  }
                }

                // Fallback error response
                const message = error instanceof Error ? error.message : String(error)
                logger.error(`Error executing action ${route.filePath}: ${message}`)
                return c.html(
                  `<!DOCTYPE html><html><body><h1>Internal Server Error</h1></body></html>`,
                  500
                )
              }
            })

            registeredRoutes.push({
              method,
              pattern: route.urlPattern,
              filePath: route.filePath,
            })

            logger.debug(`Registered ${method} action ${route.urlPattern}`)
          }
        }
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
