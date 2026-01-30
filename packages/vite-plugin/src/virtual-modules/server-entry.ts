/**
 * Server Entry Virtual Module Generator
 *
 * Generates the virtual:cloudwerk/server-entry module that creates
 * a Hono app with all routes registered from the file-based routing manifest.
 */

import type { RouteManifest, ScanResult, QueueManifest, ServiceManifest } from '@cloudwerk/core/build'
import type { ResolvedCloudwerkOptions } from '../types.js'
import * as path from 'node:path'

/**
 * Options for generating server entry.
 */
export interface GenerateServerEntryOptions {
  /** Queue manifest if queues are configured */
  queueManifest?: QueueManifest | null
  /** Service manifest if services are configured */
  serviceManifest?: ServiceManifest | null
}

/**
 * Generate the server entry module code.
 *
 * This creates a complete Hono application with:
 * - All page and API routes registered
 * - Layouts applied to pages in correct order
 * - Middleware chains applied
 * - Route config support
 * - Error and 404 handling with error.tsx and not-found.tsx support
 *
 * @param manifest - Route manifest from @cloudwerk/core
 * @param scanResult - Scan result with file information
 * @param options - Resolved plugin options
 * @returns Generated TypeScript/JavaScript code
 */
export function generateServerEntry(
  manifest: RouteManifest,
  scanResult: ScanResult,
  options: ResolvedCloudwerkOptions,
  entryOptions?: GenerateServerEntryOptions
): string {
  const queueManifest = entryOptions?.queueManifest
  const serviceManifest = entryOptions?.serviceManifest
  const imports: string[] = []
  const pageRegistrations: string[] = []
  const routeRegistrations: string[] = []
  const layoutImports: string[] = []
  const middlewareImports: string[] = []
  const errorImports: string[] = []
  const notFoundImports: string[] = []

  // Track imported modules to avoid duplicates
  const importedModules = new Set<string>()
  const layoutModules = new Map<string, string>() // path -> varName
  const middlewareModules = new Map<string, string>() // path -> varName
  const errorModules = new Map<string, string>() // path -> varName
  const notFoundModules = new Map<string, string>() // path -> varName

  let pageIndex = 0
  let routeIndex = 0
  let layoutIndex = 0
  let middlewareIndex = 0
  let errorIndex = 0
  let notFoundIndex = 0

  // Import all error boundary modules for global handler lookup
  for (const err of scanResult.errors) {
    if (!importedModules.has(err.absolutePath)) {
      const varName = `error_${errorIndex++}`
      errorImports.push(`import * as ${varName} from '${err.absolutePath}'`)
      errorModules.set(err.absolutePath, varName)
      importedModules.add(err.absolutePath)
    }
  }

  // Import all not-found boundary modules for global handler lookup
  for (const nf of scanResult.notFound) {
    if (!importedModules.has(nf.absolutePath)) {
      const varName = `notFound_${notFoundIndex++}`
      notFoundImports.push(`import * as ${varName} from '${nf.absolutePath}'`)
      notFoundModules.set(nf.absolutePath, varName)
      importedModules.add(nf.absolutePath)
    }
  }

  // Build error boundary map entries for runtime lookup (directory path -> module)
  const errorBoundaryMapEntries: string[] = []
  for (const err of scanResult.errors) {
    const dir = path.posix.dirname(err.relativePath)
    const normalizedDir = dir === '.' ? '' : dir
    const varName = errorModules.get(err.absolutePath)
    errorBoundaryMapEntries.push(`  ['${normalizedDir}', ${varName}]`)
  }

  // Build not-found boundary map entries for runtime lookup (directory path -> module)
  const notFoundBoundaryMapEntries: string[] = []
  for (const nf of scanResult.notFound) {
    const dir = path.posix.dirname(nf.relativePath)
    const normalizedDir = dir === '.' ? '' : dir
    const varName = notFoundModules.get(nf.absolutePath)
    notFoundBoundaryMapEntries.push(`  ['${normalizedDir}', ${varName}]`)
  }

  // Process each route
  for (const route of manifest.routes) {
    // Generate imports for middleware
    for (const middlewarePath of route.middleware) {
      if (!importedModules.has(middlewarePath)) {
        const varName = `middleware_${middlewareIndex++}`
        middlewareImports.push(`import { middleware as ${varName} } from '${middlewarePath}'`)
        middlewareModules.set(middlewarePath, varName)
        importedModules.add(middlewarePath)
      }
    }

    // Generate imports for layouts (pages only)
    if (route.fileType === 'page') {
      for (const layoutPath of route.layouts) {
        if (!importedModules.has(layoutPath)) {
          const varName = `layout_${layoutIndex++}`
          layoutImports.push(`import * as ${varName} from '${layoutPath}'`)
          layoutModules.set(layoutPath, varName)
          importedModules.add(layoutPath)
        }
      }
    }

    if (route.fileType === 'page') {
      // Page route - import page module and register GET handler
      const varName = `page_${pageIndex++}`
      imports.push(`import * as ${varName} from '${route.absolutePath}'`)

      // Generate layout chain for this route
      const layoutChain = route.layouts.map((p) => layoutModules.get(p)!).join(', ')
      const middlewareChain = route.middleware.map((p) => middlewareModules.get(p)!).join(', ')

      // Get error and not-found modules if available
      const errorModule = route.errorBoundary ? errorModules.get(route.errorBoundary) : null
      const notFoundModule = route.notFoundBoundary ? notFoundModules.get(route.notFoundBoundary) : null

      // Check if this is an optional catch-all route
      const hasOptionalCatchAll = route.segments.some(s => s.type === 'optionalCatchAll')

      if (hasOptionalCatchAll) {
        // For optional catch-all, register both the base path and the wildcard pattern
        // Base path (without the catch-all segment)
        const basePath = route.urlPattern.replace(/\/:[^/]+\{\.\*\}$/, '') || '/'
        pageRegistrations.push(
          `  registerPage(app, '${basePath}', ${varName}, [${layoutChain}], [${middlewareChain}], ${errorModule || 'null'}, ${notFoundModule || 'null'})`
        )
      }

      pageRegistrations.push(
        `  registerPage(app, '${route.urlPattern}', ${varName}, [${layoutChain}], [${middlewareChain}], ${errorModule || 'null'}, ${notFoundModule || 'null'})`
      )
    } else if (route.fileType === 'route') {
      // API route - import route module and register HTTP handlers
      const varName = `route_${routeIndex++}`
      imports.push(`import * as ${varName} from '${route.absolutePath}'`)

      const middlewareChain = route.middleware.map((p) => middlewareModules.get(p)!).join(', ')

      routeRegistrations.push(
        `  registerRoute(app, '${route.urlPattern}', ${varName}, [${middlewareChain}])`
      )
    }
  }

  const rendererName = options.renderer

  // Client entry path differs between dev and production
  // Dev: Vite virtual module path that Vite resolves
  // Production: Built asset path
  const clientEntryPath = options.isProduction
    ? `${options.hydrationEndpoint}/client.js`
    : '/@id/__x00__virtual:cloudwerk/client-entry'

  return `/**
 * Generated Cloudwerk Server Entry
 * This file is auto-generated by @cloudwerk/vite-plugin - do not edit
 */

import { Hono } from 'hono'
import { contextMiddleware, createHandlerAdapter, createMiddlewareAdapter, setRouteConfig, NotFoundError, RedirectError } from '@cloudwerk/core/runtime'
import { setActiveRenderer } from '@cloudwerk/ui'

// Page and Route Imports
${imports.join('\n')}

// Layout Imports
${layoutImports.join('\n')}

// Middleware Imports
${middlewareImports.join('\n')}

// Error Boundary Imports
${errorImports.join('\n')}

// Not-Found Boundary Imports
${notFoundImports.join('\n')}

// ============================================================================
// Boundary Maps for Runtime Lookup
// ============================================================================

const errorBoundaryMap = new Map([
${errorBoundaryMapEntries.join(',\n')}
])

const notFoundBoundaryMap = new Map([
${notFoundBoundaryMapEntries.join(',\n')}
])

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique error digest for matching server logs.
 */
function generateErrorDigest() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}

/**
 * Find the closest error boundary for a given URL path.
 * Walks from closest directory to root, returning first match.
 */
function findClosestErrorBoundary(urlPath) {
  // Convert URL path to directory segments
  const segments = urlPath.split('/').filter(Boolean)

  // Walk from closest to root
  while (segments.length >= 0) {
    const dir = segments.join('/')
    const boundary = errorBoundaryMap.get(dir)
    if (boundary) {
      return boundary
    }
    if (segments.length === 0) break
    segments.pop()
  }

  return null
}

/**
 * Find the closest not-found boundary for a given URL path.
 * Walks from closest directory to root, returning first match.
 */
function findClosestNotFoundBoundary(urlPath) {
  // Convert URL path to directory segments
  const segments = urlPath.split('/').filter(Boolean)

  // Walk from closest to root
  while (segments.length >= 0) {
    const dir = segments.join('/')
    const boundary = notFoundBoundaryMap.get(dir)
    if (boundary) {
      return boundary
    }
    if (segments.length === 0) break
    segments.pop()
  }

  return null
}

/**
 * Render an error page with the given error boundary module.
 */
async function renderErrorPage(error, errorModule, layoutModules, layoutLoaderData, params, searchParams, errorType) {
  // Add digest to error for log matching
  const digest = generateErrorDigest()
  error.digest = digest

  // Build error boundary props
  const errorProps = {
    error: {
      message: error.message,
      digest,
      stack: error.stack,
    },
    errorType,
    reset: () => {}, // No-op on server
    params,
    searchParams,
  }

  // Render error boundary
  let element = await Promise.resolve(errorModule.default(errorProps))

  // Wrap with layouts if available
  for (let i = layoutModules.length - 1; i >= 0; i--) {
    const Layout = layoutModules[i].default
    const layoutProps = {
      children: element,
      params,
      ...layoutLoaderData[i],
    }
    element = await Promise.resolve(Layout(layoutProps))
  }

  return renderWithHydration(element, 500)
}

/**
 * Render a not-found page with the given not-found boundary module.
 */
async function renderNotFoundPage(notFoundModule, layoutModules, layoutLoaderData, params, searchParams) {
  // Build not-found props
  const notFoundProps = {
    params,
    searchParams,
  }

  // Render not-found boundary
  let element = await Promise.resolve(notFoundModule.default(notFoundProps))

  // Wrap with layouts if available
  for (let i = layoutModules.length - 1; i >= 0; i--) {
    const Layout = layoutModules[i].default
    const layoutProps = {
      children: element,
      params,
      ...layoutLoaderData[i],
    }
    element = await Promise.resolve(Layout(layoutProps))
  }

  return renderWithHydration(element, 404)
}

// ============================================================================
// Route Registration Helpers
// ============================================================================

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']

function registerPage(app, pattern, pageModule, layoutModules, middlewareModules, errorModule, notFoundModule) {
  // Apply middleware (wrap with adapter to convert Cloudwerk middleware to Hono middleware)
  for (const mw of middlewareModules) {
    app.use(pattern, createMiddlewareAdapter(mw))
  }

  // Apply config middleware if present
  if (pageModule.config) {
    app.use(pattern, async (_c, next) => {
      setRouteConfig(pageModule.config)
      await next()
    })
  }

  // Register GET handler for page
  app.get(pattern, async (c) => {
    const params = c.req.param()
    const request = c.req.raw
    const url = new URL(request.url)
    const searchParams = Object.fromEntries(url.searchParams.entries())

    // Track layout loader data for use in error boundaries
    const layoutLoaderData = []
    const loaderArgs = { params, request, context: c }

    try {
      // Execute layout loaders
      for (const layoutModule of layoutModules) {
        if (layoutModule.loader) {
          const data = await Promise.resolve(layoutModule.loader(loaderArgs))
          layoutLoaderData.push(data ?? {})
        } else {
          layoutLoaderData.push({})
        }
      }

      // Execute page loader
      let pageLoaderData = {}
      if (pageModule.loader) {
        pageLoaderData = (await Promise.resolve(pageModule.loader(loaderArgs))) ?? {}
      }

      // Build page props
      const pageProps = { params, searchParams, ...pageLoaderData }

      // Render page
      let element = await Promise.resolve(pageModule.default(pageProps))

      // Wrap with layouts (inside-out)
      for (let i = layoutModules.length - 1; i >= 0; i--) {
        const Layout = layoutModules[i].default
        const layoutProps = {
          children: element,
          params,
          ...layoutLoaderData[i],
        }
        element = await Promise.resolve(Layout(layoutProps))
      }

      // Render the page with hydration script injection
      return renderWithHydration(element)
    } catch (error) {
      // Handle NotFoundError (check both instanceof and name for module duplication)
      if (error instanceof NotFoundError || error?.name === 'NotFoundError') {
        if (notFoundModule) {
          return renderNotFoundPage(notFoundModule, layoutModules, layoutLoaderData, params, searchParams)
        }
        // Re-throw to trigger global not-found handler
        throw error
      }

      // Handle RedirectError (check both instanceof and name for module duplication)
      if (error instanceof RedirectError || error?.name === 'RedirectError') {
        return c.redirect(error.url, error.status)
      }

      // Handle other errors
      console.error('Page render error:', error.message)
      if (errorModule) {
        return renderErrorPage(error, errorModule, layoutModules, layoutLoaderData, params, searchParams, 'loader')
      }
      // Re-throw to trigger global error handler
      throw error
    }
  })
}

/**
 * Render element to a Response, injecting hydration script before </body>.
 */
function renderWithHydration(element, status = 200) {
  // Hono JSX elements have toString() for synchronous rendering
  const html = '<!DOCTYPE html>' + String(element)

  // Inject hydration script before </body> if it exists (case-insensitive for HTML compat)
  const hydrationScript = '<script type="module" src="${clientEntryPath}"></script>'
  const bodyCloseRegex = /<\\/body>/i
  const injectedHtml = bodyCloseRegex.test(html)
    ? html.replace(bodyCloseRegex, hydrationScript + '</body>')
    : html + hydrationScript

  return new Response(injectedHtml, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}

function registerRoute(app, pattern, routeModule, middlewareModules) {
  // Apply middleware (wrap with adapter to convert Cloudwerk middleware to Hono middleware)
  for (const mw of middlewareModules) {
    app.use(pattern, createMiddlewareAdapter(mw))
  }

  // Apply config middleware if present
  if (routeModule.config) {
    app.use(pattern, async (_c, next) => {
      setRouteConfig(routeModule.config)
      await next()
    })
  }

  // Register each HTTP method handler
  for (const method of HTTP_METHODS) {
    const handler = routeModule[method]
    if (handler && typeof handler === 'function') {
      const h = handler.length === 2 ? createHandlerAdapter(handler) : handler
      switch (method) {
        case 'GET': app.get(pattern, h); break
        case 'POST': app.post(pattern, h); break
        case 'PUT': app.put(pattern, h); break
        case 'PATCH': app.patch(pattern, h); break
        case 'DELETE': app.delete(pattern, h); break
        case 'OPTIONS': app.options(pattern, h); break
        case 'HEAD': app.on('HEAD', [pattern], h); break
      }
    }
  }
}

// ============================================================================
// App Initialization
// ============================================================================

// Initialize renderer
setActiveRenderer('${rendererName}')

// Create Hono app
const app = new Hono({ strict: false })

// Add context middleware
app.use('*', contextMiddleware())
${options.isProduction ? `
// Serve static assets using Workers Static Assets binding (production only)
app.use('*', async (c, next) => {
  // Check if ASSETS binding is available
  if (!c.env?.ASSETS) {
    await next()
    return
  }

  // Try to serve the request as a static asset
  const response = await c.env.ASSETS.fetch(c.req.raw)

  // If asset found (not 404), return it
  if (response.status !== 404) {
    return response
  }

  // Asset not found, continue to routes
  await next()
})
` : ''}
// Register all routes
${pageRegistrations.join('\n')}
${routeRegistrations.join('\n')}

// 404 handler
app.notFound(async (c) => {
  const path = c.req.path

  // API routes return JSON 404
  if (path.startsWith('/api')) {
    return c.json({ error: 'Not Found', path }, 404)
  }

  // Try to find a not-found boundary for this path
  const notFoundModule = findClosestNotFoundBoundary(path)
  if (notFoundModule) {
    return renderNotFoundPage(notFoundModule, [], [], {}, {})
  }

  // Fallback to JSON 404
  return c.json({ error: 'Not Found', path }, 404)
})

// Error handler
app.onError(async (err, c) => {
  const path = c.req.path

  // Handle NotFoundError (check both instanceof and name for module duplication)
  if (err instanceof NotFoundError || err?.name === 'NotFoundError') {
    // API routes return JSON 404
    if (path.startsWith('/api')) {
      return c.json({ error: 'Not Found', path }, 404)
    }

    // Try to find a not-found boundary
    const notFoundModule = findClosestNotFoundBoundary(path)
    if (notFoundModule) {
      return renderNotFoundPage(notFoundModule, [], [], {}, {})
    }

    return c.json({ error: 'Not Found', path }, 404)
  }

  // Handle RedirectError (check both instanceof and name for module duplication)
  if (err instanceof RedirectError || err?.name === 'RedirectError') {
    return c.redirect(err.url, err.status)
  }

  // Log the error
  console.error('Request error:', err.message)

  // API routes return JSON 500
  if (path.startsWith('/api')) {
    return c.json({ error: 'Internal Server Error', message: err.message }, 500)
  }

  // Try to find an error boundary for this path
  const errorModule = findClosestErrorBoundary(path)
  if (errorModule) {
    return renderErrorPage(err, errorModule, [], [], {}, {}, 'unknown')
  }

  // Fallback to JSON 500
  return c.json({ error: 'Internal Server Error', message: err.message }, 500)
})

// ============================================================================
// Export
// ============================================================================

export default app
${generateQueueExports(queueManifest)}
${generateServiceRegistration(serviceManifest)}
`
}

/**
 * Generate queue consumer exports for Cloudflare Workers.
 */
function generateQueueExports(queueManifest: QueueManifest | null | undefined): string {
  if (!queueManifest || queueManifest.queues.length === 0) {
    return ''
  }

  const lines: string[] = []
  const imports: string[] = []
  const queueHandlers: string[] = []

  lines.push('')
  lines.push('// ============================================================================')
  lines.push('// Queue Consumer Handlers')
  lines.push('// ============================================================================')
  lines.push('')

  // Import each queue definition
  for (let i = 0; i < queueManifest.queues.length; i++) {
    const queue = queueManifest.queues[i]
    const varName = `queueDef_${i}`
    imports.push(`import ${varName} from '${queue.absolutePath}'`)

    // Generate handler for this queue
    queueHandlers.push(`
/**
 * Queue consumer handler for '${queue.name}'
 */
async function handle_${queue.name}_queue(batch, env, ctx) {
  const definition = ${varName}

  // Create message wrappers
  const messages = batch.messages.map((msg) => ({
    id: msg.id,
    body: msg.body,
    timestamp: new Date(msg.timestamp),
    attempts: msg.attempts,
    ack: () => msg.ack(),
    retry: (options) => msg.retry(options),
    deadLetter: (reason) => {
      // Mark for DLQ if configured
      if (definition.config?.deadLetterQueue) {
        msg.retry({ delaySeconds: 0 })
      }
    },
  }))

  // Validate messages if schema is defined
  if (definition.schema) {
    for (const message of messages) {
      const result = definition.schema.safeParse(message.body)
      if (!result.success) {
        console.error('Queue message validation failed:', result.error)
        message.retry({ delaySeconds: 60 })
        return
      }
    }
  }

  try {
    // Use batch processor if available
    if (definition.processBatch) {
      await definition.processBatch(messages)
    } else if (definition.process) {
      // Process messages individually
      for (const message of messages) {
        try {
          await definition.process(message)
        } catch (error) {
          if (definition.onError) {
            await definition.onError(error, message)
          } else {
            throw error
          }
        }
      }
    }
  } catch (error) {
    console.error('Queue processing error:', error)
    // Retry all messages
    batch.retryAll()
  }
}`)
  }

  lines.push(imports.join('\n'))
  lines.push(queueHandlers.join('\n'))

  // Generate the main queue handler that routes to specific handlers
  lines.push('')
  lines.push('/**')
  lines.push(' * Main queue handler that routes to specific queue handlers.')
  lines.push(' * Export this as the `queue` handler in your worker.')
  lines.push(' */')
  lines.push('export async function queue(batch, env, ctx) {')
  lines.push('  const queueName = batch.queue')
  lines.push('')

  for (const queue of queueManifest.queues) {
    lines.push(`  if (queueName === '${queue.queueName}') {`)
    lines.push(`    return handle_${queue.name}_queue(batch, env, ctx)`)
    lines.push('  }')
    lines.push('')
  }

  lines.push('  console.warn(\\`Unknown queue: \\${queueName}\\`)')
  lines.push('}')

  return lines.join('\n')
}

/**
 * Generate service registration code for local mode services.
 * This registers each service with the services proxy so they can be called via services.<name>.<method>
 */
function generateServiceRegistration(serviceManifest: ServiceManifest | null | undefined): string {
  if (!serviceManifest || serviceManifest.services.length === 0) {
    return ''
  }

  const lines: string[] = []
  const imports: string[] = []
  const registrations: string[] = []

  lines.push('')
  lines.push('// ============================================================================')
  lines.push('// Service Registration')
  lines.push('// ============================================================================')
  lines.push('')

  // Import registerLocalService from bindings
  imports.push("import { registerLocalService } from '@cloudwerk/core/bindings'")

  // Import each service definition
  for (let i = 0; i < serviceManifest.services.length; i++) {
    const service = serviceManifest.services[i]
    const varName = `serviceDef_${i}`
    imports.push(`import ${varName} from '${service.absolutePath}'`)

    // Only register local mode services
    if (service.mode === 'local') {
      registrations.push(`registerLocalService('${service.name}', ${varName})`)
    }
  }

  lines.push(imports.join('\n'))
  lines.push('')

  if (registrations.length > 0) {
    lines.push('// Register local services')
    for (const reg of registrations) {
      lines.push(reg)
    }
  }

  return lines.join('\n')
}
