/**
 * @cloudwerk/cli - Worker Entry Point Generator
 *
 * Generates a virtual entry point that:
 * 1. Imports the Hono app factory
 * 2. Registers all routes with pre-compiled handlers
 * 3. Exports the fetch handler for Cloudflare Workers
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import type { RouteManifest, CloudwerkConfig } from '@cloudwerk/core'

// ============================================================================
// Types
// ============================================================================

/**
 * Options for generating the worker entry point.
 */
export interface GenerateWorkerEntryOptions {
  /** Route manifest */
  manifest: RouteManifest
  /** Cloudwerk configuration */
  config: CloudwerkConfig
  /** Output directory for the entry file */
  outputDir: string
  /** Routes directory (absolute path) */
  routesDir: string
  /** Whether static assets are pre-bundled (production build) */
  staticAssets?: boolean
}

/**
 * Result of entry point generation.
 */
export interface GenerateWorkerEntryResult {
  /** Path to the generated entry file */
  entryPath: string
  /** The generated code */
  code: string
}

// ============================================================================
// Entry Point Generation
// ============================================================================

/**
 * Generate a virtual entry point for the Cloudflare Worker.
 *
 * The generated entry point:
 * - Creates a Hono app with all routes pre-registered
 * - Imports all page components, layouts, and handlers
 * - Exports the fetch handler for Workers
 *
 * @param options - Generation options
 * @returns Generated entry point path and code
 *
 * @example
 * ```typescript
 * const { entryPath, code } = await generateWorkerEntry({
 *   manifest,
 *   config,
 *   outputDir: './dist/.build',
 *   routesDir: './app/routes',
 * })
 * ```
 */
export async function generateWorkerEntry(
  options: GenerateWorkerEntryOptions
): Promise<GenerateWorkerEntryResult> {
  const {
    manifest,
    config,
    outputDir,
    routesDir,
    staticAssets = true,
  } = options

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const entryPath = path.join(outputDir, '_worker-entry.ts')
  const code = generateEntryCode(manifest, config, routesDir, outputDir, staticAssets)

  fs.writeFileSync(entryPath, code)

  return { entryPath, code }
}

/**
 * Generate the TypeScript code for the worker entry point.
 *
 * @param manifest - Route manifest
 * @param config - Cloudwerk configuration
 * @param routesDir - Routes directory path
 * @param entryDir - Directory where the entry file will be written
 * @param staticAssets - Whether static assets are pre-bundled
 * @returns Generated TypeScript code
 */
function generateEntryCode(
  manifest: RouteManifest,
  config: CloudwerkConfig,
  routesDir: string,
  entryDir: string,
  staticAssets: boolean
): string {
  const imports: string[] = []
  const pageRegistrations: string[] = []
  const routeRegistrations: string[] = []
  const layoutImports: string[] = []
  const middlewareImports: string[] = []

  // Track imported modules to avoid duplicates
  const importedModules = new Set<string>()
  const layoutModules = new Map<string, string>() // path -> varName
  const middlewareModules = new Map<string, string>() // path -> varName

  let pageIndex = 0
  let routeIndex = 0
  let layoutIndex = 0
  let middlewareIndex = 0

  // Process each route
  for (const route of manifest.routes) {
    // Generate imports for middleware
    for (const middlewarePath of route.middleware) {
      if (!importedModules.has(middlewarePath)) {
        const varName = `middleware_${middlewareIndex++}`
        const relativePath = getRelativePathFromEntry(entryDir, middlewarePath)
        middlewareImports.push(`import ${varName} from '${relativePath}'`)
        middlewareModules.set(middlewarePath, varName)
        importedModules.add(middlewarePath)
      }
    }

    // Generate imports for layouts (pages only)
    if (route.fileType === 'page') {
      for (const layoutPath of route.layouts) {
        if (!importedModules.has(layoutPath)) {
          const varName = `layout_${layoutIndex++}`
          const relativePath = getRelativePathFromEntry(entryDir, layoutPath)
          layoutImports.push(`import * as ${varName} from '${relativePath}'`)
          layoutModules.set(layoutPath, varName)
          importedModules.add(layoutPath)
        }
      }
    }

    if (route.fileType === 'page') {
      // Page route - import page module and register GET handler
      const varName = `page_${pageIndex++}`
      const relativePath = getRelativePathFromEntry(entryDir, route.absolutePath)
      imports.push(`import * as ${varName} from '${relativePath}'`)

      // Generate layout chain for this route
      const layoutChain = route.layouts.map(p => layoutModules.get(p)!).join(', ')
      const middlewareChain = route.middleware.map(p => middlewareModules.get(p)!).join(', ')

      pageRegistrations.push(
        `  registerPage(app, '${route.urlPattern}', ${varName}, [${layoutChain}], [${middlewareChain}])`
      )
    } else if (route.fileType === 'route') {
      // API route - import route module and register HTTP handlers
      const varName = `route_${routeIndex++}`
      const relativePath = getRelativePathFromEntry(entryDir, route.absolutePath)
      imports.push(`import * as ${varName} from '${relativePath}'`)

      const middlewareChain = route.middleware.map(p => middlewareModules.get(p)!).join(', ')

      routeRegistrations.push(
        `  registerRoute(app, '${route.urlPattern}', ${varName}, [${middlewareChain}])`
      )
    }
  }

  // Generate the entry file code
  const rendererName = config.ui?.renderer ?? 'hono-jsx'

  return `/**
 * Generated Cloudflare Worker Entry Point
 * This file is auto-generated by cloudwerk build - do not edit
 */

import { Hono } from 'hono'
import type { Context, MiddlewareHandler } from 'hono'
import { contextMiddleware, createHandlerAdapter, setRouteConfig } from '@cloudwerk/core'
import { render, renderToStream, setActiveRenderer } from '@cloudwerk/ui'
import type { PageProps, LayoutProps, RouteConfig, LoaderArgs, HttpMethod } from '@cloudwerk/core'

// Page and Route Imports
${imports.join('\n')}

// Layout Imports
${layoutImports.join('\n')}

// Middleware Imports
${middlewareImports.join('\n')}

// ============================================================================
// Static Asset Configuration
// ============================================================================

const STATIC_ASSETS_ENABLED = ${staticAssets}

// ============================================================================
// Route Registration Helpers
// ============================================================================

interface PageModule {
  default: (props: PageProps) => unknown
  loader?: (args: LoaderArgs) => unknown
  config?: RouteConfig
}

interface LayoutModule {
  default: (props: LayoutProps) => unknown
  loader?: (args: LoaderArgs) => unknown
}

interface RouteModule {
  GET?: unknown
  POST?: unknown
  PUT?: unknown
  PATCH?: unknown
  DELETE?: unknown
  OPTIONS?: unknown
  HEAD?: unknown
  config?: RouteConfig
}

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']

function registerPage(
  app: Hono,
  pattern: string,
  pageModule: PageModule,
  layoutModules: LayoutModule[],
  middlewareModules: MiddlewareHandler[]
) {
  // Apply middleware
  for (const mw of middlewareModules) {
    app.use(pattern, mw)
  }

  // Apply config middleware if present
  if (pageModule.config) {
    app.use(pattern, async (_c, next) => {
      setRouteConfig(pageModule.config!)
      await next()
    })
  }

  // Register GET handler for page
  app.get(pattern, async (c: Context) => {
    const params = c.req.param()
    const request = c.req.raw
    const url = new URL(request.url)
    const searchParams = Object.fromEntries(url.searchParams.entries())

    // Execute layout loaders
    const layoutLoaderData: Record<string, unknown>[] = []
    const loaderArgs: LoaderArgs = { params, request, context: c }

    for (const layoutModule of layoutModules) {
      if (layoutModule.loader) {
        const data = await Promise.resolve(layoutModule.loader(loaderArgs))
        layoutLoaderData.push((data ?? {}) as Record<string, unknown>)
      } else {
        layoutLoaderData.push({})
      }
    }

    // Execute page loader
    let pageLoaderData: Record<string, unknown> = {}
    if (pageModule.loader) {
      pageLoaderData = (await Promise.resolve(pageModule.loader(loaderArgs))) as Record<string, unknown> ?? {}
    }

    // Build page props
    const pageProps: PageProps = { params, searchParams, ...pageLoaderData }

    // Render page
    let element = await Promise.resolve(pageModule.default(pageProps))

    // Wrap with layouts (inside-out)
    for (let i = layoutModules.length - 1; i >= 0; i--) {
      const Layout = layoutModules[i].default
      const layoutProps: LayoutProps = {
        children: element,
        params,
        ...layoutLoaderData[i],
      }
      element = await Promise.resolve(Layout(layoutProps))
    }

    return renderToStream(element)
  })
}

function registerRoute(
  app: Hono,
  pattern: string,
  routeModule: RouteModule,
  middlewareModules: MiddlewareHandler[]
) {
  // Apply middleware
  for (const mw of middlewareModules) {
    app.use(pattern, mw)
  }

  // Apply config middleware if present
  if (routeModule.config) {
    app.use(pattern, async (_c, next) => {
      setRouteConfig(routeModule.config!)
      await next()
    })
  }

  // Register each HTTP method handler
  for (const method of HTTP_METHODS) {
    const handler = routeModule[method]
    if (handler && typeof handler === 'function') {
      const h = handler.length === 2 ? createHandlerAdapter(handler as any) : handler as any
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

// Register all routes
${pageRegistrations.join('\n')}
${routeRegistrations.join('\n')}

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found', path: c.req.path }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error('Request error:', err.message)
  return c.json({ error: 'Internal Server Error', message: err.message }, 500)
})

// ============================================================================
// Worker Export
// ============================================================================

export default {
  fetch: app.fetch,
}
`
}

/**
 * Get relative path from the generated entry file to target file.
 * Ensures the path starts with ./ for ESM compatibility.
 *
 * @param entryDir - Directory containing the generated entry file
 * @param targetPath - Target file path
 * @returns Relative path with ./ prefix
 */
function getRelativePathFromEntry(entryDir: string, targetPath: string): string {
  const relative = path.relative(entryDir, targetPath)
  // Ensure it starts with ./
  if (!relative.startsWith('.')) {
    return `./${relative}`
  }
  return relative
}
