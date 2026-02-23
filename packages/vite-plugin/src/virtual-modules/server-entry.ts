/**
 * Server Entry Virtual Module Generator
 *
 * Generates the virtual:cloudwerk/server-entry module that creates
 * a Hono app with all routes registered from the file-based routing manifest.
 */

import type { RouteManifest, ScanResult, QueueManifest, ServiceManifest, AuthManifest } from '@cloudwerk/core/build'
import type { ResolvedCloudwerkOptions, CssImportInfo } from '../types.js'
import * as path from 'node:path'

/**
 * Asset manifest entry from Vite build.
 */
export interface AssetManifestEntry {
  file: string
  css?: string[]
  assets?: string[]
  isEntry?: boolean
  isDynamicEntry?: boolean
}

/**
 * Asset manifest from Vite build (maps source to output files).
 */
export type AssetManifest = Record<string, AssetManifestEntry>

/**
 * Options for generating server entry.
 */
export interface GenerateServerEntryOptions {
  /** Queue manifest if queues are configured */
  queueManifest?: QueueManifest | null
  /** Service manifest if services are configured */
  serviceManifest?: ServiceManifest | null
  /** Asset manifest from Vite build for CSS injection */
  assetManifest?: AssetManifest | null
  /** Auth manifest if auth providers are configured */
  authManifest?: AuthManifest | null
  /** CSS imports from layouts/pages (for dev mode injection) */
  cssImports?: Map<string, CssImportInfo[]>
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
  const assetManifest = entryOptions?.assetManifest
  const authManifest = entryOptions?.authManifest
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

  // Find root middleware (app/middleware.ts) for global application
  const rootMiddleware = scanResult.middleware.find(
    (m) => m.relativePath === 'middleware.ts' || m.relativePath === 'middleware.tsx'
  )
  let rootMiddlewareVarName: string | null = null

  // Track page info for SSG endpoint generation
  const ssgPageInfo: Array<{
    varName: string
    urlPattern: string
    hasDynamicSegments: boolean
  }> = []

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

  // Import root middleware for global application (if exists)
  if (rootMiddleware) {
    rootMiddlewareVarName = `middleware_${middlewareIndex++}`
    middlewareImports.push(`import { middleware as ${rootMiddlewareVarName} } from '${rootMiddleware.absolutePath}'`)
    middlewareModules.set(rootMiddleware.absolutePath, rootMiddlewareVarName)
    importedModules.add(rootMiddleware.absolutePath)
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

      // Track for SSG endpoint
      const hasDynamicSegments = route.segments.some(
        (s) => s.type === 'dynamic' || s.type === 'catchAll' || s.type === 'optionalCatchAll'
      )
      ssgPageInfo.push({ varName, urlPattern: route.urlPattern, hasDynamicSegments })

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
          `  registerPage(app, '${basePath}', ${varName}, [${layoutChain}], [${middlewareChain}], ${errorModule || 'null'}, ${notFoundModule || 'null'}, '${route.urlPattern}')`
        )
      }

      pageRegistrations.push(
        `  registerPage(app, '${route.urlPattern}', ${varName}, [${layoutChain}], [${middlewareChain}], ${errorModule || 'null'}, ${notFoundModule || 'null'}, '${route.urlPattern}')`
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
  // Production: Built asset path from asset manifest (includes content hash)
  let clientEntryPath = '/@id/__x00__virtual:cloudwerk/client-entry'
  if (options.isProduction && assetManifest) {
    const clientEntry = assetManifest['virtual:cloudwerk/client-entry']
    if (clientEntry?.file) {
      clientEntryPath = `/${clientEntry.file}`
    } else {
      // Fallback if manifest doesn't have the entry
      clientEntryPath = `${options.hydrationEndpoint}/client.js`
    }
  } else if (options.isProduction) {
    // Fallback for production without manifest
    clientEntryPath = `${options.hydrationEndpoint}/client.js`
  }

  // Generate CSS links for production (from asset manifest) OR dev (from cssImports)
  // This prevents flash of unstyled content (FOUC) by injecting CSS links server-side
  let cssLinksCode = ''
  if (options.isProduction && assetManifest) {
    // Production: Find the client entry in the manifest
    const clientEntry = assetManifest['virtual:cloudwerk/client-entry']
    if (clientEntry?.css && clientEntry.css.length > 0) {
      const cssLinks = clientEntry.css
        .map((css: string) => `<link rel="stylesheet" href="/${css}" />`)
        .join('')
      cssLinksCode = `const CSS_LINKS = '${cssLinks}'`
    }
  } else if (!options.isProduction && entryOptions?.cssImports) {
    // Dev mode: Generate links from cssImports to prevent FOUC
    // Use /@fs prefix so Vite serves the CSS with HMR support
    const allCss = new Set<string>()
    for (const imports of entryOptions.cssImports.values()) {
      for (const info of imports) {
        allCss.add(info.absolutePath)
      }
    }
    if (allCss.size > 0) {
      const cssLinks = Array.from(allCss)
        .map(css => `<link rel="stylesheet" href="/@fs${css}" />`)
        .join('')
      cssLinksCode = `const CSS_LINKS = '${cssLinks}'`
    }
  }
  if (!cssLinksCode) {
    cssLinksCode = `const CSS_LINKS = ''`
  }

  // In dev mode, inject Vite client for HMR
  const viteClientScript = options.isProduction
    ? ''
    : '<script type="module" src="/@vite/client"></script>'

  return `/**
 * Generated Cloudwerk Server Entry
 * This file is auto-generated by @cloudwerk/vite-plugin - do not edit
 */

import { Hono } from 'hono'
import { ssgParams } from 'hono/ssg'
import { contextMiddleware, createHandlerAdapter, createMiddlewareAdapter, setRouteConfig, NotFoundError, RedirectError } from '@cloudwerk/core/runtime'
import { setActiveRenderer${rendererName === 'react' ? ', initReactRenderer' : ''} } from '@cloudwerk/ui'

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
// Asset Injection Configuration
// ============================================================================

// CSS links from asset manifest (production) or empty (dev - CSS served by Vite)
${cssLinksCode}

// Vite client script for HMR (dev only)
const VITE_CLIENT = '${viteClientScript}'

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

  return await renderWithHydration(element, 500)
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

  return await renderWithHydration(element, 404)
}

// ============================================================================
// Route Registration Helpers
// ============================================================================

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']

function registerPage(app, pattern, pageModule, layoutModules, middlewareModules, errorModule, notFoundModule, routeId) {
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

  // Apply SSG params middleware if page has generateStaticParams (for static generation)
  if (typeof pageModule.generateStaticParams === 'function') {
    app.use(pattern, ssgParams(pageModule.generateStaticParams))
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
      return await renderWithHydration(element, 200, routeId, pageProps, layoutLoaderData)
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
 * Render element to a Response, injecting CSS and scripts.
 * - CSS links are injected before </head>
 * - Vite client (dev) and hydration script are injected before </body>
 */
async function renderWithHydration(element, status = 200, routeId, pageProps, layoutData) {
  // Render element to HTML string using the active renderer
  ${rendererName === 'react' ? `// React: use renderToString from react-dom/server
  const { renderToString } = await import('react-dom/server')
  let html = '<!DOCTYPE html>' + renderToString(element)` : `// Hono JSX elements have toString() for synchronous rendering
  let html = '<!DOCTYPE html>' + String(element)`}

  // Inject CSS links before </head> if present
  if (CSS_LINKS) {
    const headCloseRegex = /<\\/head>/i
    if (headCloseRegex.test(html)) {
      html = html.replace(headCloseRegex, CSS_LINKS + '</head>')
    }
  }

  // Inject scripts before </body>
  // - Vite client for HMR (dev only)
  // - Hydration script for client components
  let scripts = VITE_CLIENT
  ${rendererName === 'react' ? `// React: embed serialized page data for full-tree hydration
  if (routeId) {
    const pageData = JSON.stringify({ routeId, pageProps: pageProps || {}, layoutData: layoutData || [] }).replace(/</g, '\\\\u003c')
    scripts += '<script id="__CLOUDWERK_DATA__" type="application/json">' + pageData + '</script>'
  }` : ''}
  scripts += '<script type="module" src="${clientEntryPath}"></script>'
  const bodyCloseRegex = /<\\/body>/i
  if (bodyCloseRegex.test(html)) {
    html = html.replace(bodyCloseRegex, scripts + '</body>')
  } else {
    html = html + scripts
  }

  return new Response(html, {
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
      const h = createHandlerAdapter(handler)
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
${rendererName === 'react' ? `await initReactRenderer()\n` : ''}setActiveRenderer('${rendererName}')

// Create Hono app
const app = new Hono({ strict: false })

// Add context middleware
app.use('*', contextMiddleware())
${rootMiddlewareVarName ? `
// Apply root middleware globally (for all routes including auth)
app.use('*', createMiddlewareAdapter(${rootMiddlewareVarName}))
` : ''}${options.isProduction ? `
// Serve static assets using Workers Static Assets binding (production only)
app.use('*', async (c, next) => {
  // Check if ASSETS binding is available
  if (!c.env?.ASSETS) {
    await next()
    return
  }

  // Skip static asset serving during SSG — the ASSETS binding from getPlatformProxy
  // is not a real Workers Static Assets binding and does not support fetch(Request)
  if (c.env?.HONO_SSG_CONTEXT) {
    await next()
    return
  }

  // Only serve static assets for GET/HEAD requests
  // Other methods (POST, PUT, etc.) should go directly to route handlers
  // to avoid consuming the request body
  const method = c.req.method
  if (method !== 'GET' && method !== 'HEAD') {
    await next()
    return
  }

  // Try to serve the request as a static asset
  let response
  try {
    response = await c.env.ASSETS.fetch(c.req.raw)
  } catch {
    // ASSETS.fetch can fail during SSG or when the binding is a proxy
    // that doesn't support fetch(Request) — fall through to routes
    await next()
    return
  }

  // If asset found (not 404), return it with cache headers
  if (response.status !== 404) {
    const path = new URL(c.req.url).pathname

    // Check if this is a hashed asset (Vite adds content hash to filename)
    // Hashed assets are immutable and can be cached forever
    const isHashedAsset = path.startsWith('/__cloudwerk/') ||
      /-[a-zA-Z0-9]{8,}\\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp|avif|ico)$/.test(path)

    const cacheControl = isHashedAsset
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=3600'

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        'Cache-Control': cacheControl,
      },
    })
  }

  // Asset not found, continue to routes
  await next()
})
` : ''}
// Register all routes
${pageRegistrations.join('\n')}
${routeRegistrations.join('\n')}

// Register auth routes
${generateAuthRouteRegistrations(authManifest)}

// SSG routes endpoint - returns all static routes for build-time generation
app.get('/__ssg/routes', async (c) => {
  const routes = []
${generateSSGRouteChecks(ssgPageInfo)}
  return c.json({ routes })
})

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
 * Generate the SSG route check code for each page.
 * For dynamic routes, calls generateStaticParams to get all params.
 * For static routes, checks if config.rendering === 'static'.
 */
function generateSSGRouteChecks(
  pages: Array<{ varName: string; urlPattern: string; hasDynamicSegments: boolean }>
): string {
  const lines: string[] = []

  for (const page of pages) {
    if (page.hasDynamicSegments) {
      // Dynamic route - need to call generateStaticParams
      lines.push(`  // ${page.urlPattern}`)
      lines.push(`  if (typeof ${page.varName}.generateStaticParams === 'function') {`)
      lines.push(`    try {`)
      lines.push(`      const params = await ${page.varName}.generateStaticParams()`)
      lines.push(`      if (Array.isArray(params)) {`)
      lines.push(`        for (const p of params) {`)
      lines.push(`          let url = '${page.urlPattern}'`)
      lines.push(`          for (const [key, value] of Object.entries(p)) {`)
      lines.push(`            url = url.replace(':' + key, String(value))`)
      lines.push(`          }`)
      lines.push(`          routes.push(url)`)
      lines.push(`        }`)
      lines.push(`      }`)
      lines.push(`    } catch (e) {`)
      lines.push(`      console.error('SSG: Failed to get params for ${page.urlPattern}:', e)`)
      lines.push(`    }`)
      lines.push(`  }`)
    } else {
      // Static route - check if it has config.rendering === 'static'
      lines.push(`  // ${page.urlPattern}`)
      lines.push(`  if ('config' in ${page.varName} && ${page.varName}.config?.rendering === 'static') {`)
      lines.push(`    routes.push('${page.urlPattern}')`)
      lines.push(`  }`)
    }
  }

  return lines.join('\n')
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

/**
 * Generate auth route registrations for standard auth routes and providers.
 */
function generateAuthRouteRegistrations(authManifest: AuthManifest | null | undefined): string {
  if (!authManifest) {
    return ''
  }

  const lines: string[] = []
  const imports: string[] = []
  const basePath = authManifest.config?.basePath || '/auth'

  lines.push('')
  lines.push('// ============================================================================')
  lines.push('// Auth Route Registration')
  lines.push('// ============================================================================')
  lines.push('')

  // Import standard auth handlers
  imports.push(`import {
  handleSession,
  handleProviders,
  handleSignIn,
  handleSignInProvider,
  handleSignOutGet,
  handleSignOutPost,
} from '@cloudwerk/auth/routes'`)

  // Import session management
  imports.push(`import { createSessionManager, createKVSessionAdapter } from '@cloudwerk/auth/session'`)

  // Check if there are any passkey providers
  const passkeyProviders = authManifest.providers.filter(p => p.type === 'passkey' && !p.disabled)

  if (passkeyProviders.length > 0) {
    // Import passkey handlers and storage factories
    imports.push(`import {
  handlePasskeyRegisterOptions,
  handlePasskeyRegisterVerify,
  handlePasskeyAuthenticateOptions,
  handlePasskeyAuthenticateVerify,
} from '@cloudwerk/auth/routes'`)

    imports.push(`import {
  createKVChallengeStorage,
  createD1CredentialStorage,
} from '@cloudwerk/auth/providers'`)

    // Import each passkey provider definition
    for (let i = 0; i < passkeyProviders.length; i++) {
      const provider = passkeyProviders[i]
      imports.push(`import passkeyProviderDef_${i} from '${provider.filePath}'`)
    }
  }

  lines.push(imports.join('\n'))
  lines.push('')

  // Generate helper function to build auth context for standard routes
  lines.push(`
/**
 * Build auth context for standard auth routes.
 */
function buildAuthContext(c) {
  const env = c.env || {}

  // Get KV binding - fall back to common binding names
  let kvBinding = undefined
  for (const name of ['FLAGSHIP_AUTH_SESSIONS', 'AUTH_KV', 'AUTH_SESSIONS', 'KV']) {
    const binding = env[name]
    if (binding && typeof binding.get === 'function') {
      kvBinding = binding
      break
    }
  }

  // Create session manager from KV
  const sessionAdapter = kvBinding ? createKVSessionAdapter({ binding: kvBinding, enableUserIndex: true }) : undefined
  const sessionManager = sessionAdapter ? createSessionManager({ adapter: sessionAdapter }) : undefined

  // Build providers map
  const providers = new Map()

  return {
    request: c.req.raw,
    env,
    config: { basePath: '${basePath}', session: { strategy: '${authManifest.config?.sessionStrategy || 'database'}' } },
    sessionManager,
    providers,
    user: c.get?.('user') ?? null,
    session: c.get?.('session') ?? null,
    url: new URL(c.req.url),
    responseHeaders: new Headers(),
  }
}
`)

  // Register standard auth routes
  lines.push(`
// Standard auth routes
app.get('${basePath}/session', async (c) => {
  const ctx = buildAuthContext(c)
  return handleSession(ctx)
})

app.get('${basePath}/providers', async (c) => {
  const ctx = buildAuthContext(c)
  return handleProviders(ctx)
})

app.get('${basePath}/signin', async (c) => {
  const ctx = buildAuthContext(c)
  return handleSignIn(ctx)
})

app.get('${basePath}/signin/:provider', async (c) => {
  const ctx = buildAuthContext(c)
  const providerId = c.req.param('provider')
  return handleSignInProvider(ctx, providerId)
})

app.get('${basePath}/signout', async (c) => {
  const ctx = buildAuthContext(c)
  return handleSignOutGet(ctx)
})

app.post('${basePath}/signout', async (c) => {
  const ctx = buildAuthContext(c)
  return handleSignOutPost(ctx)
})
`)

  // Generate passkey-specific routes if there are passkey providers
  if (passkeyProviders.length > 0) {
    // Generate helper function to build auth context for passkey handlers
    lines.push(`
/**
 * Build auth context for passkey handlers.
 */
function buildPasskeyAuthContext(c, passkeyProvider) {
  const env = c.env || {}

  // Get KV binding for challenges - use provider config or fall back to common names
  const kvBindingName = passkeyProvider.kvBinding
  let kvBinding = kvBindingName ? env[kvBindingName] : undefined
  if (!kvBinding) {
    // Fall back to common binding names
    for (const name of ['AUTH_KV', 'AUTH_SESSIONS', 'KV']) {
      const binding = env[name]
      if (binding && typeof binding.get === 'function') {
        kvBinding = binding
        break
      }
    }
  }
  const challengeStorage = kvBinding ? createKVChallengeStorage(kvBinding, 'auth:challenge:') : undefined

  // Get D1 binding for credentials - use provider config or fall back to common names
  const d1BindingName = passkeyProvider.d1Binding
  const d1Binding = d1BindingName ? env[d1BindingName] : (env.DB || env.D1 || env.DATABASE)
  const credentialStorage = d1Binding ? createD1CredentialStorage(d1Binding, 'webauthn_credentials') : undefined

  // Create user adapter from D1
  const userAdapter = d1Binding ? {
    async getUserByEmail(email) {
      const user = await d1Binding.prepare(
        'SELECT id, email, email_verified, name, image, created_at, updated_at FROM users WHERE email = ?'
      ).bind(email).first()
      if (!user) return null
      return {
        id: user.id,
        email: user.email,
        emailVerified: user.email_verified ? new Date(user.email_verified) : null,
        name: user.name,
        image: user.image,
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at),
      }
    },
    async createUser(userData) {
      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      await d1Binding.prepare(
        'INSERT INTO users (id, email, email_verified, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(id, userData.email, userData.emailVerified?.toISOString() ?? null, userData.name ?? null, now, now).run()
      return { id, email: userData.email, emailVerified: userData.emailVerified, name: userData.name ?? null, image: null, createdAt: new Date(now), updatedAt: new Date(now) }
    },
    async getUser(id) {
      const user = await d1Binding.prepare(
        'SELECT id, email, email_verified, name, image, created_at, updated_at FROM users WHERE id = ?'
      ).bind(id).first()
      if (!user) return null
      return {
        id: user.id,
        email: user.email,
        emailVerified: user.email_verified ? new Date(user.email_verified) : null,
        name: user.name,
        image: user.image,
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at),
      }
    },
  } : undefined

  // Create session manager from KV
  const sessionAdapter = kvBinding ? createKVSessionAdapter({ binding: kvBinding, enableUserIndex: true }) : undefined
  const sessionManager = sessionAdapter ? createSessionManager({ adapter: sessionAdapter }) : undefined

  // Build providers map
  const providers = new Map()
  providers.set(passkeyProvider.id, passkeyProvider)

  return {
    request: c.req.raw,
    env,
    config: { basePath: '${basePath}', session: { strategy: '${authManifest.config?.sessionStrategy || 'database'}' } },
    sessionManager,
    providers,
    user: null,
    session: null,
    url: new URL(c.req.url),
    responseHeaders: new Headers(),
    challengeStorage,
    credentialStorage,
    userAdapter,
  }
}
`)

    // Generate route registrations for each passkey provider
    for (let i = 0; i < passkeyProviders.length; i++) {
      const provider = passkeyProviders[i]

      // Build the provider from the definition
      lines.push(`
// Get provider from definition
const passkeyProvider_${i} = passkeyProviderDef_${i}.provider || passkeyProviderDef_${i}
`)

      // Register passkey routes
      lines.push(`
// Passkey registration routes
app.post('${basePath}/passkey/register/options', async (c) => {
  const ctx = buildPasskeyAuthContext(c, passkeyProvider_${i})
  return handlePasskeyRegisterOptions(ctx, '${provider.id}')
})

app.post('${basePath}/passkey/register/verify', async (c) => {
  const ctx = buildPasskeyAuthContext(c, passkeyProvider_${i})
  return handlePasskeyRegisterVerify(ctx, '${provider.id}')
})

app.post('${basePath}/passkey/authenticate/options', async (c) => {
  const ctx = buildPasskeyAuthContext(c, passkeyProvider_${i})
  return handlePasskeyAuthenticateOptions(ctx, '${provider.id}')
})

app.post('${basePath}/passkey/authenticate/verify', async (c) => {
  const ctx = buildPasskeyAuthContext(c, passkeyProvider_${i})
  return handlePasskeyAuthenticateVerify(ctx, '${provider.id}')
})
`)
    }
  }

  return lines.join('\n')
}
