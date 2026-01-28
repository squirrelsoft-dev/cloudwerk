/**
 * @cloudwerk/cli - Build Command
 *
 * Builds the project for production deployment to Cloudflare Workers.
 * Includes client asset bundling, server bundling, and optional SSG.
 */

import * as path from 'node:path'
import * as fs from 'node:fs'
import {
  loadConfig,
  scanRoutes,
  buildRouteManifest,
  resolveLayouts,
  resolveMiddleware,
  resolveRoutesDir,
  hasErrors,
  formatErrors,
  formatWarnings,
} from '@cloudwerk/core'

import type { BuildCommandOptions, Logger } from '../types.js'
import { CliError } from '../types.js'
import { createLogger, printError } from '../utils/logger.js'
import { createApp } from '../server/createApp.js'
import { generateStaticSite, getStaticRoutesAsync } from '../server/ssg.js'
import { bundleClientAssets } from '../build/bundleClientAssets.js'
import { bundleServer } from '../build/bundleServer.js'
import { writeManifest } from '../build/writeManifest.js'

// ============================================================================
// Constants
// ============================================================================

/** Default output directory for static files */
const DEFAULT_OUTPUT_DIR = './dist'

/** Subdirectory for static pages within the output directory */
const STATIC_SUBDIR = 'static'

// ============================================================================
// Build Command
// ============================================================================

/**
 * Build the project for production.
 *
 * Build pipeline:
 * 1. Load config and scan routes
 * 2. Validate manifest
 * 3. Discover all client components
 * 4. Bundle client assets -> dist/__cloudwerk/
 * 5. Bundle server -> dist/index.js
 * 6. Generate static pages (if --ssg) -> dist/static/
 * 7. Write build manifest
 * 8. Report bundle sizes and warnings
 *
 * @param pathArg - Optional working directory path
 * @param options - Command options
 */
export async function build(
  pathArg: string | undefined,
  options: BuildCommandOptions
): Promise<void> {
  const startTime = Date.now()
  const verbose = options.verbose ?? false
  const minify = options.minify ?? true
  const sourcemap = options.sourcemap ?? false
  const logger = createLogger(verbose)

  try {
    // Resolve working directory
    const cwd = pathArg
      ? path.resolve(process.cwd(), pathArg)
      : process.cwd()

    // Validate working directory exists
    if (!fs.existsSync(cwd)) {
      throw new CliError(
        `Directory does not exist: ${cwd}`,
        'ENOENT',
        `Make sure the path exists and try again.`
      )
    }

    logger.debug(`Working directory: ${cwd}`)

    // Load configuration
    logger.debug(`Loading configuration...`)
    const config = await loadConfig(cwd)
    logger.debug(`Config loaded: routesDir=${config.routesDir}, extensions=${config.extensions.join(', ')}`)

    // Resolve routes directory
    const routesDir = resolveRoutesDir(config, cwd)
    logger.debug(`Routes directory: ${routesDir}`)

    // Check if routes directory exists
    if (!fs.existsSync(routesDir)) {
      throw new CliError(
        `Routes directory does not exist: ${routesDir}`,
        'ENOENT',
        `Create the "${config.routesDir}" directory or update routesDir in cloudwerk.config.ts`
      )
    }

    // Scan routes
    logger.debug(`Scanning routes...`)
    const scanResult = await scanRoutes(routesDir, config)
    logger.debug(`Found ${scanResult.routes.length} route files`)

    // Build manifest
    logger.debug(`Building route manifest...`)
    const manifest = buildRouteManifest(
      scanResult,
      routesDir,
      resolveLayouts,
      resolveMiddleware
    )

    // Report validation errors
    if (hasErrors(manifest)) {
      const errorMessages = formatErrors(manifest.errors)
      logger.error(errorMessages)
      throw new CliError(
        'Route validation failed',
        'VALIDATION_ERROR',
        'Fix the errors above and try again.'
      )
    }

    // Report warnings (only if there are actual warnings)
    if (manifest.warnings.length > 0) {
      const warningMessages = formatWarnings(manifest.warnings)
      logger.warn(warningMessages)
    }

    // Check for no routes
    if (manifest.routes.length === 0) {
      logger.warn(`No routes found in ${config.routesDir}`)
      logger.warn(`Create a route.ts file to get started.`)
    }

    // Resolve output directory
    const outputBase = options.output ?? DEFAULT_OUTPUT_DIR
    const outputDir = path.isAbsolute(outputBase)
      ? outputBase
      : path.resolve(cwd, outputBase)

    // Clean output directory
    if (fs.existsSync(outputDir)) {
      logger.debug(`Cleaning output directory: ${outputDir}`)
      fs.rmSync(outputDir, { recursive: true, force: true })
    }
    fs.mkdirSync(outputDir, { recursive: true })

    logger.info(`Building to ${outputDir}...`)

    // ========================================================================
    // Phase 1: Bundle client assets
    // ========================================================================
    const appDir = path.dirname(routesDir)
    const rendererName = config.ui?.renderer ?? 'hono-jsx'

    const clientResult = await bundleClientAssets({
      manifest,
      outputDir,
      appDir,
      minify,
      sourcemap,
      renderer: rendererName === 'react' ? 'react' : 'hono-jsx',
      logger,
      verbose,
    })

    // ========================================================================
    // Phase 2: Bundle server
    // ========================================================================
    const serverResult = await bundleServer({
      manifest,
      config,
      outputDir,
      routesDir,
      minify,
      sourcemap,
      logger,
      verbose,
    })

    // ========================================================================
    // Phase 3: Static Site Generation (optional)
    // ========================================================================
    let staticPages: string[] = []

    if (options.ssg) {
      // Load page modules to find static routes
      logger.debug(`Scanning for static routes...`)
      const staticRoutes = await getStaticRoutesAsync(manifest, verbose ? logger : undefined)

      if (staticRoutes.length === 0) {
        logger.warn(`No static routes found. Add rendering: 'static' to route configs to enable SSG.`)
      } else {
        logger.info(`Found ${staticRoutes.length} static route(s)`)

        // Create Hono app for rendering
        logger.debug(`Creating Hono app for SSG...`)
        const { app } = await createApp(manifest, scanResult, config, logger, verbose)

        // Generate static pages
        const staticOutputDir = path.join(outputDir, STATIC_SUBDIR)
        logger.info(`Generating static pages to ${staticOutputDir}...`)

        const ssgStartTime = Date.now()
        const result = await generateStaticSite(app, manifest, staticOutputDir, logger, verbose)
        const ssgDuration = Date.now() - ssgStartTime

        // Report results
        printSSGResults(result, logger, ssgDuration)

        if (result.failureCount > 0) {
          throw new CliError(
            `Failed to generate ${result.failureCount} static page(s)`,
            'SSG_ERROR',
            'Check the errors above and fix any issues.'
          )
        }

        // Collect static page paths
        staticPages = result.routes
          .filter(r => r.success)
          .map(r => r.outputFile)
      }
    } else {
      // Without SSG flag, scan for static routes and report what would be generated
      logger.debug(`Scanning for static routes...`)
      const staticRoutes = await getStaticRoutesAsync(manifest, verbose ? logger : undefined)
      if (staticRoutes.length > 0) {
        logger.info(`Found ${staticRoutes.length} static route(s). Use --ssg to generate static pages.`)
      }
    }

    // ========================================================================
    // Phase 4: Write build manifest
    // ========================================================================
    const buildDuration = Date.now() - startTime

    const manifestPath = await writeManifest({
      outputDir,
      clientResult,
      serverResult,
      staticPages: staticPages.length > 0 ? staticPages : undefined,
      buildDuration,
    })

    if (verbose) {
      logger.debug(`Build manifest written to: ${manifestPath}`)
    }

    // ========================================================================
    // Final Report
    // ========================================================================
    console.log()
    printBuildSummary(clientResult, serverResult, staticPages, buildDuration, logger)
    console.log()
    logger.success(`Build completed in ${buildDuration}ms`)
  } catch (error) {
    if (error instanceof CliError) {
      printError(error.message, error.suggestion)
      process.exit(1)
    }

    if (error instanceof Error) {
      printError(error.message)
      if (verbose && error.stack) {
        console.log(error.stack)
      }
      process.exit(1)
    }

    printError(String(error))
    process.exit(1)
  }
}

// ============================================================================
// Output Helpers
// ============================================================================

/**
 * Print build summary.
 *
 * @param clientResult - Client bundle result
 * @param serverResult - Server bundle result
 * @param staticPages - List of static pages
 * @param buildDuration - Build duration in milliseconds
 * @param logger - Logger for output
 */
function printBuildSummary(
  clientResult: Awaited<ReturnType<typeof bundleClientAssets>>,
  serverResult: Awaited<ReturnType<typeof bundleServer>>,
  staticPages: string[],
  _buildDuration: number,
  logger: Logger
): void {
  logger.log('Build Output:')
  logger.log('')

  // Client bundles
  logger.log('  Client:')
  logger.log(`    Runtime:    ${formatSize(clientResult.runtimeSize)}`)
  if (clientResult.componentBundles.size > 0) {
    logger.log(`    Components: ${clientResult.componentBundles.size} bundles (${formatSize(clientResult.totalSize - clientResult.runtimeSize)})`)
  }
  logger.log(`    Total:      ${formatSize(clientResult.totalSize)}`)
  logger.log('')

  // Server bundle
  logger.log('  Server:')
  logger.log(`    Bundle:     ${formatSize(serverResult.size)}`)
  if (serverResult.compressedSize) {
    logger.log(`    Gzipped:    ${formatSize(serverResult.compressedSize)}`)
  }
  logger.log('')

  // SSG (if applicable)
  if (staticPages.length > 0) {
    logger.log('  Static:')
    logger.log(`    Pages:      ${staticPages.length}`)
    logger.log('')
  }

  // Totals
  const totalUncompressed = clientResult.totalSize + serverResult.size
  const totalCompressed = clientResult.totalSize + (serverResult.compressedSize ?? serverResult.size)
  logger.log(`  Total:        ${formatSize(totalUncompressed)} (${formatSize(totalCompressed)} gzipped)`)
}

/**
 * Format a byte size for human-readable display.
 *
 * @param bytes - Size in bytes
 * @returns Formatted size string (e.g., "14.2 KB")
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * Print SSG generation results.
 *
 * @param result - SSG result object
 * @param logger - Logger for output
 * @param duration - SSG duration in milliseconds
 */
function printSSGResults(
  result: Awaited<ReturnType<typeof generateStaticSite>>,
  logger: Logger,
  duration: number
): void {

  console.log()
  logger.log('Static Site Generation Results:')
  logger.log(`  Total pages: ${result.totalPages}`)
  logger.log(`  Generated: ${result.successCount}`)

  if (result.failureCount > 0) {
    logger.log(`  Failed: ${result.failureCount}`)
  }

  logger.log(`  Output: ${result.outputDir}`)
  logger.log(`  Duration: ${duration}ms`)

  // List generated pages (up to 10)
  const pagesToShow = result.routes.filter((r) => r.success).slice(0, 10)
  if (pagesToShow.length > 0) {
    console.log()
    logger.log('Generated pages:')
    for (const page of pagesToShow) {
      logger.log(`  ${page.urlPath} -> ${page.outputFile}`)
    }
    if (result.successCount > 10) {
      logger.log(`  ... and ${result.successCount - 10} more`)
    }
  }

  // List failed pages
  const failedPages = result.routes.filter((r) => !r.success)
  if (failedPages.length > 0) {
    console.log()
    logger.error('Failed pages:')
    for (const page of failedPages) {
      logger.error(`  ${page.urlPath}: ${page.error}`)
    }
  }
}
