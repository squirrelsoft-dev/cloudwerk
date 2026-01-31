/**
 * @cloudwerk/cli - Build Command
 *
 * Builds the project for production deployment to Cloudflare Workers using Vite.
 */

import { builtinModules } from 'node:module'
import * as path from 'node:path'
import * as fs from 'node:fs'
import { build as viteBuild, mergeConfig as mergeViteConfig, type InlineConfig, type PluginOption } from 'vite'
import { getPlatformProxy } from 'wrangler'
import cloudwerk, { generateServerEntry } from '@cloudwerk/vite-plugin'
import {
  scanRoutes,
  buildRouteManifest,
  resolveLayouts,
  resolveMiddleware,
  loadConfig,
  resolveRoutesPath,
  // Queue scanning
  scanQueues,
  buildQueueManifest,
  QUEUES_DIR,
  // Service scanning
  scanServices,
  buildServiceManifest,
  SERVICES_DIR,
} from '@cloudwerk/core/build'
import type { RouteManifest } from '@cloudwerk/core/build'

import type { BuildCommandOptions, Logger } from '../types.js'
import { CliError } from '../types.js'
import { createLogger, printError } from '../utils/logger.js'

// ============================================================================
// Constants
// ============================================================================

/** Default output directory for build output */
const DEFAULT_OUTPUT_DIR = './dist'

/** Temporary build directory for generated files */
const BUILD_TEMP_DIR = '.cloudwerk-build'

// ============================================================================
// Build Command
// ============================================================================

/**
 * Build the project for production.
 *
 * Build pipeline:
 * 1. Generate temporary entry file
 * 2. Build client assets (if any client components)
 * 3. Build server bundle for Cloudflare Workers
 * 4. Clean up temporary files
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

  // Track temp files for cleanup
  let tempDir: string | null = null

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
    // Generate temporary entry file
    // ========================================================================
    // @hono/vite-build needs a real file path with actual code, not a virtual module
    // So we generate the server entry content directly
    tempDir = path.join(cwd, BUILD_TEMP_DIR)
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    // Load config and scan routes to generate server entry
    const cloudwerkConfig = await loadConfig(cwd)
    const appDir = cloudwerkConfig.appDir
    const routesDir = cloudwerkConfig.routesDir ?? 'routes'
    const routesPath = resolveRoutesPath(routesDir, appDir, cwd)

    logger.debug(`Scanning routes from: ${routesPath}`)

    const scanResult = await scanRoutes(routesPath, {
      extensions: cloudwerkConfig.extensions,
    })

    const manifest = buildRouteManifest(
      scanResult,
      routesPath,
      resolveLayouts,
      resolveMiddleware
    )

    logger.debug(`Found ${manifest.routes.length} routes`)

    // Scan queues if queues directory exists
    const queuesPath = path.resolve(cwd, appDir, QUEUES_DIR)
    let queueManifest = null
    if (fs.existsSync(queuesPath)) {
      const queueScanResult = await scanQueues(
        path.resolve(cwd, appDir),
        { extensions: cloudwerkConfig.extensions }
      )
      queueManifest = buildQueueManifest(queueScanResult, cwd, { appName: 'cloudwerk' })
      if (queueManifest.queues.length > 0) {
        logger.debug(`Found ${queueManifest.queues.length} queue(s)`)
      }
    }

    // Scan services if services directory exists
    const servicesPath = path.resolve(cwd, appDir, SERVICES_DIR)
    let serviceManifest = null
    if (fs.existsSync(servicesPath)) {
      const serviceScanResult = await scanServices(
        path.resolve(cwd, appDir),
        { extensions: cloudwerkConfig.extensions }
      )
      serviceManifest = buildServiceManifest(serviceScanResult, cwd)
      if (serviceManifest.services.length > 0) {
        logger.debug(`Found ${serviceManifest.services.length} service(s)`)
      }
    }

    // Generate the server entry code
    const renderer = (cloudwerkConfig.ui?.renderer as 'hono-jsx' | 'react') ?? 'hono-jsx'
    const serverEntryCode = generateServerEntry(manifest, scanResult, {
      appDir,
      routesDir,
      config: cloudwerkConfig,
      serverEntry: null,
      clientEntry: null,
      verbose,
      hydrationEndpoint: '/__cloudwerk',
      renderer,
      publicDir: cloudwerkConfig.publicDir ?? 'public',
      root: cwd,
      isProduction: true,
    }, {
      queueManifest,
      serviceManifest,
    })

    const tempEntryPath = path.join(tempDir, '_server-entry.ts')
    fs.writeFileSync(tempEntryPath, serverEntryCode)
    logger.debug(`Generated temp entry: ${tempEntryPath}`)

    // ========================================================================
    // Phase 1: Build client assets (optional)
    // ========================================================================
    logger.debug(`Building client assets...`)

    const baseClientConfig: InlineConfig = {
      root: cwd,
      mode: 'production',
      logLevel: verbose ? 'info' : 'warn',
      plugins: [
        cloudwerk({ verbose }),
      ],
      build: {
        outDir: path.join(outputDir, 'static'),
        emptyOutDir: true,
        minify: minify ? 'esbuild' : false,
        sourcemap,
        rollupOptions: {
          input: 'virtual:cloudwerk/client-entry',
          output: {
            entryFileNames: '__cloudwerk/client.js',
            chunkFileNames: '__cloudwerk/[name]-[hash].js',
            assetFileNames: '__cloudwerk/[name]-[hash][extname]',
          },
        },
      },
    }

    // Merge user's vite config if provided
    let clientConfig: InlineConfig = baseClientConfig
    if (cloudwerkConfig.vite) {
      const userPlugins = cloudwerkConfig.vite.plugins as PluginOption[] | undefined
      const { plugins: _, ...userConfigWithoutPlugins } = cloudwerkConfig.vite

      // Merge non-plugin config
      clientConfig = mergeViteConfig(baseClientConfig, userConfigWithoutPlugins)

      // Prepend user plugins before our plugins
      if (userPlugins) {
        clientConfig.plugins = [...userPlugins, ...(baseClientConfig.plugins ?? [])]
      }
    }

    try {
      await viteBuild(clientConfig)
      logger.debug(`Client assets built successfully`)
    } catch (error) {
      // Client build might fail if there are no client components
      // That's ok - we'll continue with server build
      if (verbose) {
        logger.debug(`Client build skipped or failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    // ========================================================================
    // Phase 2: Build server for Cloudflare Workers
    // ========================================================================
    logger.debug(`Building server bundle...`)

    // Build configuration optimized for Cloudflare Workers
    // Based on @hono/vite-build settings for minimal bundle size
    const baseServerConfig: InlineConfig = {
      root: cwd,
      mode: 'production',
      logLevel: verbose ? 'info' : 'warn',
      // Disable publicDir for server build - static assets are already in dist/static/ from client build
      publicDir: false,
      plugins: [
        cloudwerk({ verbose }),
      ],
      build: {
        outDir: outputDir,
        emptyOutDir: false, // Don't clear - client assets are already there
        minify: minify ? 'esbuild' : false,
        sourcemap,
        ssr: true,
        rollupOptions: {
          input: tempEntryPath,
          // Externalize Node.js builtins (polyfilled by nodejs_compat in Workers)
          external: [...builtinModules, /^node:/],
          output: {
            entryFileNames: 'index.js',
          },
        },
      },
      ssr: {
        target: 'webworker',
        noExternal: true, // Bundle all dependencies
      },
      resolve: {
        // Prefer browser/worker fields in package.json
        conditions: ['workerd', 'worker', 'browser', 'import', 'module', 'default'],
      },
    }

    // Merge user's vite config if provided
    let serverConfig: InlineConfig = baseServerConfig
    if (cloudwerkConfig.vite) {
      const userPlugins = cloudwerkConfig.vite.plugins as PluginOption[] | undefined
      const { plugins: _, ...userConfigWithoutPlugins } = cloudwerkConfig.vite

      // Merge non-plugin config
      serverConfig = mergeViteConfig(baseServerConfig, userConfigWithoutPlugins)

      // Prepend user plugins before our plugins
      if (userPlugins) {
        serverConfig.plugins = [...userPlugins, ...(baseServerConfig.plugins ?? [])]
      }
    }

    await viteBuild(serverConfig)
    logger.debug(`Server bundle built successfully`)

    // ========================================================================
    // Phase 3: Static Site Generation (optional)
    // ========================================================================
    let ssgPaths: string[] = []
    if (options.ssg) {
      logger.info(`Generating static pages...`)
      ssgPaths = await generateStaticPages(
        manifest,
        cwd,
        outputDir,
        logger,
        verbose
      )
      if (ssgPaths.length > 0) {
        logger.debug(`Generated ${ssgPaths.length} static page(s)`)
      }
    }

    // ========================================================================
    // Final Report
    // ========================================================================
    const buildDuration = Date.now() - startTime

    // Get bundle sizes
    const serverBundlePath = path.join(outputDir, 'index.js')
    const serverSize = fs.existsSync(serverBundlePath)
      ? fs.statSync(serverBundlePath).size
      : 0

    const clientDir = path.join(outputDir, 'static', '__cloudwerk')
    let clientSize = 0
    if (fs.existsSync(clientDir)) {
      const clientFiles = fs.readdirSync(clientDir)
      for (const file of clientFiles) {
        const filePath = path.join(clientDir, file)
        const stat = fs.statSync(filePath)
        if (stat.isFile()) {
          clientSize += stat.size
        }
      }
    }

    console.log()
    printBuildSummary(serverSize, clientSize, ssgPaths.length, buildDuration, logger)
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
  } finally {
    // Clean up temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true })
        if (verbose) {
          logger.debug(`Cleaned up temp directory: ${tempDir}`)
        }
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

// ============================================================================
// Output Helpers
// ============================================================================

/**
 * Print build summary.
 */
function printBuildSummary(
  serverSize: number,
  clientSize: number,
  ssgPageCount: number,
  buildDuration: number,
  logger: Logger
): void {
  logger.log('Build Output:')
  logger.log('')

  // Server bundle
  logger.log('  Server:')
  logger.log(`    Bundle:     ${formatSize(serverSize)}`)
  logger.log('')

  // Client bundles (if any)
  if (clientSize > 0) {
    logger.log('  Client:')
    logger.log(`    Total:      ${formatSize(clientSize)}`)
    logger.log('')
  }

  // SSG pages (if any)
  if (ssgPageCount > 0) {
    logger.log('  Static Pages:')
    logger.log(`    Generated:  ${ssgPageCount}`)
    logger.log('')
  }

  // Totals
  const totalSize = serverSize + clientSize
  logger.log(`  Total:        ${formatSize(totalSize)}`)
  logger.log(`  Duration:     ${buildDuration}ms`)
}

/**
 * Format a byte size for human-readable display.
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

// ============================================================================
// Static Site Generation
// ============================================================================

/**
 * Generate static pages for routes with `generateStaticParams` exports.
 *
 * Uses getPlatformProxy to get Cloudflare bindings, then uses Hono's toSSG
 * helper to generate static HTML files.
 */
async function generateStaticPages(
  _manifest: RouteManifest,
  cwd: string,
  outputDir: string,
  logger: Logger,
  verbose: boolean
): Promise<string[]> {
  const generatedPaths: string[] = []

  // Get Cloudflare bindings via getPlatformProxy
  // This provides D1, KV, R2, etc. that work in Node.js
  // Let wrangler use its default persist path so it matches where migrations are applied
  const { env, dispose } = await getPlatformProxy({
    configPath: path.join(cwd, 'wrangler.toml'),
  })

  if (verbose) {
    logger.debug(`SSG env bindings: ${Object.keys(env as Record<string, unknown>).join(', ')}`)
  }

  try {
    // Create a Vite server in SSR mode to load modules
    const { createServer } = await import('vite')
    const { toSSG } = await import('hono/ssg')
    const fsPromises = await import('node:fs/promises')

    const vite = await createServer({
      root: cwd,
      server: { middlewareMode: true },
      appType: 'custom',
      logLevel: verbose ? 'info' : 'warn',
      plugins: [cloudwerk({ verbose })],
    })

    try {
      // Load the server entry module via Vite SSR
      const tempEntryPath = path.join(cwd, '.cloudwerk-build', '_server-entry.ts')

      // Load the app module
      const appModule = await vite.ssrLoadModule(
        fs.existsSync(tempEntryPath) ? tempEntryPath : 'virtual:cloudwerk/server-entry'
      )

      // Get the Hono app instance
      const app = appModule.default

      if (!app || typeof app.fetch !== 'function') {
        logger.debug('No valid Hono app found for SSG')
        return generatedPaths
      }

      // Monkey-patch the app's fetch method to inject our bindings
      // This ensures ALL fetch calls (including internal ones from toSSG) get our bindings
      const originalFetch = app.fetch.bind(app)
      app.fetch = (request: Request, passedEnv?: Record<string, unknown>, executionCtx?: unknown) => {
        // Merge our bindings with any env passed (e.g., HONO_SSG_CONTEXT from toSSG)
        const mergedEnv = { ...env, ...passedEnv }
        if (verbose) {
          const envKeys = Object.keys(mergedEnv)
          logger.debug(`SSG fetch ${request.url} with env: ${envKeys.join(', ')}`)
        }
        return originalFetch(request, mergedEnv, executionCtx)
      }

      // Use Hono's toSSG helper to generate static files
      const staticDir = path.join(outputDir, 'static')

      const result = await toSSG(app, fsPromises, {
        dir: staticDir,
        // Only generate pages that have ssgParams middleware
        // (pages with generateStaticParams export)
      })

      // Track generated paths
      if (result.files) {
        for (const file of result.files) {
          // Convert file path back to URL path
          const relativePath = path.relative(staticDir, file)
          const urlPath = '/' + relativePath.replace(/\/index\.html$/, '').replace(/\.html$/, '')
          generatedPaths.push(urlPath || '/')

          if (verbose) {
            logger.debug(`Generated: ${urlPath || '/'} -> ${relativePath}`)
          }
        }
      }

      if (generatedPaths.length > 0) {
        logger.info(`Generated ${generatedPaths.length} static page(s)`)
      }
    } finally {
      await vite.close()
    }
  } catch (error) {
    if (verbose) {
      logger.debug(`SSG error: ${error instanceof Error ? error.message : String(error)}`)
    }
    // Don't fail the build, just warn
    logger.warn(`Static generation failed: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    // Clean up platform proxy
    await dispose()
  }

  return generatedPaths
}
