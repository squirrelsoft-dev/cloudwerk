/**
 * @cloudwerk/cli - Static Site Generation (SSG) Helpers
 *
 * Helper functions for generating static pages at build time.
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import type { Hono } from 'hono'
import type { RouteManifest, RouteEntry, RouteSegment } from '@cloudwerk/core'

import type { Logger } from '../types.js'
import { loadPageModule } from './loadPage.js'

// ============================================================================
// Types
// ============================================================================

/**
 * Result of static site generation for a single route.
 */
export interface SSGRouteResult {
  /** URL path for this static page */
  urlPath: string
  /** Output file path relative to output directory */
  outputFile: string
  /** Whether generation was successful */
  success: boolean
  /** Error message if generation failed */
  error?: string
}

/**
 * Result of static site generation for all routes.
 */
export interface SSGResult {
  /** Total number of static pages generated */
  totalPages: number
  /** Number of pages generated successfully */
  successCount: number
  /** Number of pages that failed to generate */
  failureCount: number
  /** Individual route results */
  routes: SSGRouteResult[]
  /** Output directory path */
  outputDir: string
}

// ============================================================================
// Route Filtering
// ============================================================================

/**
 * Get all routes marked for static generation.
 *
 * Note: This is a synchronous filter that only checks the manifest.
 * For a complete check that loads page modules, use getStaticRoutesAsync.
 *
 * @param manifest - Route manifest with all routes
 * @returns Routes with rendering: 'static' config in manifest
 */
export function getStaticRoutes(manifest: RouteManifest): RouteEntry[] {
  return manifest.routes.filter((route) => {
    // Only page routes can be static (not API routes)
    if (route.fileType !== 'page') {
      return false
    }
    // Check for rendering: 'static' in route config
    return route.config?.rendering === 'static'
  })
}

/**
 * Information about a static route including its loaded module.
 */
export interface StaticRouteInfo {
  /** Route entry from manifest */
  route: RouteEntry
  /** Loaded page module with config */
  module: Awaited<ReturnType<typeof loadPageModule>>
}

/**
 * Get all routes marked for static generation by loading their modules.
 *
 * This function loads each page module to check its exported config,
 * which is necessary because the route config is not set in the manifest.
 *
 * @param manifest - Route manifest with all routes
 * @param logger - Optional logger for verbose output
 * @returns Routes with rendering: 'static' config along with their modules
 */
export async function getStaticRoutesAsync(
  manifest: RouteManifest,
  logger?: Logger
): Promise<StaticRouteInfo[]> {
  const staticRoutes: StaticRouteInfo[] = []

  for (const route of manifest.routes) {
    // Only page routes can be static (not API routes)
    if (route.fileType !== 'page') {
      continue
    }

    try {
      // Load the page module to check its config
      const module = await loadPageModule(route.absolutePath)

      // Check for rendering: 'static' in module config
      if (module.config?.rendering === 'static') {
        staticRoutes.push({ route, module })
        logger?.debug(`Found static route: ${route.urlPattern}`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger?.warn(`Failed to load page module for ${route.urlPattern}: ${errorMessage}`)
    }
  }

  return staticRoutes
}

// ============================================================================
// Path Utilities
// ============================================================================

/**
 * Check if route segments contain dynamic parts.
 *
 * @param segments - Route segments to check
 * @returns True if any segment is dynamic, catch-all, or optional catch-all
 */
export function hasDynamicSegments(segments: RouteSegment[]): boolean {
  return segments.some(
    (segment) =>
      segment.type === 'dynamic' ||
      segment.type === 'catchAll' ||
      segment.type === 'optionalCatchAll'
  )
}

/**
 * Interpolate route pattern with actual parameter values.
 *
 * @param urlPattern - URL pattern with :param placeholders (e.g., "/posts/:slug")
 * @param params - Parameter values to substitute
 * @returns Interpolated URL path (e.g., "/posts/hello-world")
 *
 * @example
 * interpolatePath('/posts/:slug', { slug: 'hello-world' })
 * // Returns: '/posts/hello-world'
 *
 * interpolatePath('/users/:id/posts/:postId', { id: '123', postId: 'abc' })
 * // Returns: '/users/123/posts/abc'
 */
export function interpolatePath(
  urlPattern: string,
  params: Record<string, string>
): string {
  let result = urlPattern

  // Replace :param with actual values
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(`:${key}`, encodeURIComponent(value))
  }

  // Handle catch-all segments (*param)
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(`*${key}`, encodeURIComponent(value))
  }

  return result
}

/**
 * Convert URL path to output file path.
 *
 * @param urlPath - URL path (e.g., "/posts/hello-world")
 * @returns Output file path (e.g., "posts/hello-world/index.html")
 */
export function urlPathToOutputFile(urlPath: string): string {
  // Normalize path
  let normalizedPath = urlPath

  // Remove leading slash
  if (normalizedPath.startsWith('/')) {
    normalizedPath = normalizedPath.slice(1)
  }

  // Handle root path
  if (normalizedPath === '' || normalizedPath === '/') {
    return 'index.html'
  }

  // Add index.html for directory-style paths
  return path.join(normalizedPath, 'index.html')
}

// ============================================================================
// Static Site Generation
// ============================================================================

/**
 * Generate static HTML files for all static routes.
 *
 * @param app - Configured Hono application
 * @param manifest - Route manifest with static routes
 * @param outputDir - Output directory for static files
 * @param logger - Logger for output
 * @param verbose - Enable verbose logging
 * @returns SSG result with statistics
 */
export async function generateStaticSite(
  app: Hono,
  manifest: RouteManifest,
  outputDir: string,
  logger: Logger,
  verbose: boolean = false
): Promise<SSGResult> {
  // Load page modules to find static routes
  const staticRoutes = await getStaticRoutesAsync(manifest, verbose ? logger : undefined)
  const results: SSGRouteResult[] = []

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true })

  for (const { route, module } of staticRoutes) {
    try {
      // Get all URL paths for this route
      const urlPaths = await getUrlPathsForRouteWithModule(route, module, verbose ? logger : undefined)

      for (const urlPath of urlPaths) {
        const result = await generateStaticPage(app, urlPath, outputDir, logger, verbose)
        results.push(result)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(`Failed to generate static pages for ${route.urlPattern}: ${errorMessage}`)
      results.push({
        urlPath: route.urlPattern,
        outputFile: urlPathToOutputFile(route.urlPattern),
        success: false,
        error: errorMessage,
      })
    }
  }

  const successCount = results.filter((r) => r.success).length
  const failureCount = results.filter((r) => !r.success).length

  return {
    totalPages: results.length,
    successCount,
    failureCount,
    routes: results,
    outputDir,
  }
}

/**
 * Get all URL paths for a route using an already-loaded module.
 *
 * @param route - Route entry to generate paths for
 * @param module - Already loaded page module
 * @param logger - Optional logger for verbose output
 * @returns Array of URL paths to generate
 */
async function getUrlPathsForRouteWithModule(
  route: RouteEntry,
  module: Awaited<ReturnType<typeof loadPageModule>>,
  logger?: Logger
): Promise<string[]> {
  // For static routes without dynamic segments, return the pattern directly
  if (!hasDynamicSegments(route.segments)) {
    return [route.urlPattern]
  }

  // For dynamic routes, we need generateStaticParams
  if (!module.generateStaticParams) {
    logger?.warn(
      `Static route ${route.urlPattern} has dynamic segments but no generateStaticParams export. Skipping.`
    )
    return []
  }

  // Call generateStaticParams to get all param combinations
  const paramsList = await module.generateStaticParams({})

  if (!Array.isArray(paramsList)) {
    throw new Error(
      `generateStaticParams must return an array, got ${typeof paramsList}`
    )
  }

  // Generate URL paths for each param combination
  const urlPaths = paramsList.map((params) => {
    if (typeof params !== 'object' || params === null) {
      throw new Error(
        `generateStaticParams must return array of objects, got ${typeof params}`
      )
    }
    return interpolatePath(route.urlPattern, params as Record<string, string>)
  })

  logger?.debug(`Generated ${urlPaths.length} paths for ${route.urlPattern}`)

  return urlPaths
}

/**
 * Generate a single static HTML page.
 *
 * @param app - Configured Hono application
 * @param urlPath - URL path to generate (e.g., "/posts/hello-world")
 * @param outputDir - Output directory for static files
 * @param logger - Logger for output
 * @param verbose - Enable verbose logging
 * @returns SSG route result
 */
async function generateStaticPage(
  app: Hono,
  urlPath: string,
  outputDir: string,
  logger: Logger,
  verbose: boolean
): Promise<SSGRouteResult> {
  const outputFile = urlPathToOutputFile(urlPath)
  const outputPath = path.join(outputDir, outputFile)

  try {
    // Create a mock request for this URL
    const url = `http://localhost${urlPath}`
    const request = new Request(url, { method: 'GET' })

    // Fetch the page using the Hono app
    const response = await app.fetch(request)

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`)
    }

    // Get the HTML content
    const html = await response.text()

    // Ensure output directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true })

    // Write the HTML file
    await fs.writeFile(outputPath, html, 'utf-8')

    if (verbose) {
      logger.debug(`Generated: ${outputFile}`)
    }

    return {
      urlPath,
      outputFile,
      success: true,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to generate ${urlPath}: ${errorMessage}`)

    return {
      urlPath,
      outputFile,
      success: false,
      error: errorMessage,
    }
  }
}
