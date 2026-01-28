/**
 * @cloudwerk/cli - Build Command
 *
 * Builds the project for production deployment to Cloudflare Workers using Vite.
 */

import { builtinModules } from 'node:module'
import * as path from 'node:path'
import * as fs from 'node:fs'
import { build as viteBuild, type InlineConfig } from 'vite'
import cloudwerk, { generateServerEntry } from '@cloudwerk/vite-plugin'
import {
  scanRoutes,
  buildRouteManifest,
  resolveLayouts,
  resolveMiddleware,
  loadConfig,
  resolveRoutesPath,
} from '@cloudwerk/core'

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
      root: cwd,
    })

    const tempEntryPath = path.join(tempDir, '_server-entry.ts')
    fs.writeFileSync(tempEntryPath, serverEntryCode)
    logger.debug(`Generated temp entry: ${tempEntryPath}`)

    // ========================================================================
    // Phase 1: Build client assets (optional)
    // ========================================================================
    logger.debug(`Building client assets...`)

    const clientConfig: InlineConfig = {
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
    const serverConfig: InlineConfig = {
      root: cwd,
      mode: 'production',
      logLevel: verbose ? 'info' : 'warn',
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

    await viteBuild(serverConfig)
    logger.debug(`Server bundle built successfully`)

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
    printBuildSummary(serverSize, clientSize, buildDuration, logger)
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
