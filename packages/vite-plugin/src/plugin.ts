/**
 * @cloudwerk/vite-plugin - Core Plugin
 *
 * Vite plugin that provides file-based routing for Cloudwerk with
 * virtual module generation for server and client entry points.
 */

import type { Plugin, ViteDevServer, ResolvedConfig } from 'vite'
import * as path from 'node:path'
import * as fs from 'node:fs'
import {
  scanRoutes,
  buildRouteManifest,
  resolveLayouts,
  resolveMiddleware,
  resolveErrorBoundary,
  resolveNotFoundBoundary,
  loadConfig,
  resolveRoutesPath,
  hasUseClientDirective,
  generateComponentId,
  ROUTE_FILE_NAMES,
  type CloudwerkConfig,
} from '@cloudwerk/core/build'
import type {
  CloudwerkVitePluginOptions,
  ResolvedCloudwerkOptions,
  PluginState,
  ClientComponentInfo,
} from './types.js'
import {
  VIRTUAL_MODULE_IDS,
  RESOLVED_VIRTUAL_IDS,
} from './types.js'
import { generateServerEntry } from './virtual-modules/server-entry.js'
import { generateClientEntry } from './virtual-modules/client-entry.js'
import { transformClientComponent } from './transform-client-component.js'
import {
  regenerateCloudwerkTypes,
  findWranglerTomlPath,
} from './wrangler-watcher.js'

/**
 * Recursively scan a directory for .tsx files with 'use client' directive.
 */
async function scanClientComponents(root: string, state: PluginState): Promise<void> {
  const appDir = path.resolve(root, state.options.appDir)

  try {
    await fs.promises.access(appDir)
  } catch {
    return // Directory does not exist or is not accessible
  }

  async function scanDir(dir: string): Promise<void> {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true })

    await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          // Skip node_modules and hidden directories
          if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
            await scanDir(fullPath)
          }
        } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
          // Read file and check for 'use client' directive
          const content = await fs.promises.readFile(fullPath, 'utf-8')

          if (hasUseClientDirective(content)) {
            const componentId = generateComponentId(fullPath, root)
            const bundlePath = `${state.options.hydrationEndpoint}/${componentId}.js`

            const info: ClientComponentInfo = {
              componentId,
              bundlePath,
              absolutePath: fullPath,
            }

            state.clientComponents.set(fullPath, info)

            if (state.options.verbose) {
              console.log(`[cloudwerk] Pre-scanned client component: ${componentId}`)
            }
          }
        }
      })
    )
  }

  await scanDir(appDir)
}

/**
 * Create the Cloudwerk Vite plugin.
 *
 * @param options - Plugin configuration options
 * @returns Vite plugin
 *
 * @example
 * ```typescript
 * // vite.config.ts
 * import { defineConfig } from 'vite'
 * import devServer from '@hono/vite-dev-server'
 * import cloudwerk from '@cloudwerk/vite-plugin'
 *
 * export default defineConfig({
 *   plugins: [
 *     cloudwerk(),
 *     devServer({ entry: 'virtual:cloudwerk/server-entry' }),
 *   ],
 * })
 * ```
 */
export function cloudwerkPlugin(options: CloudwerkVitePluginOptions = {}): Plugin {
  // Plugin state
  let state: PluginState | null = null
  let server: ViteDevServer | null = null

  /**
   * Build or rebuild the route manifest.
   */
  async function buildManifest(root: string): Promise<void> {
    if (!state) {
      throw new Error('Plugin state not initialized')
    }

    // Resolve routes path using shared utility
    const routesPath = resolveRoutesPath(
      state.options.routesDir,
      state.options.appDir,
      root
    )

    // Scan routes
    state.scanResult = await scanRoutes(routesPath, {
      extensions: state.options.config.extensions,
    })

    // Build manifest
    state.manifest = buildRouteManifest(
      state.scanResult,
      routesPath,
      resolveLayouts,
      resolveMiddleware,
      resolveErrorBoundary,
      resolveNotFoundBoundary
    )

    // Invalidate caches
    state.serverEntryCache = null
    state.clientEntryCache = null

    if (state.options.verbose) {
      console.log(`[cloudwerk] Found ${state.manifest.routes.length} routes`)
    }
  }

  /**
   * Check if a file is a route file that should trigger rebuild.
   */
  function isRouteFile(filePath: string): boolean {
    if (!state) return false

    const appDir = path.resolve(state.options.root, state.options.appDir)
    if (!filePath.startsWith(appDir)) return false

    const basename = path.basename(filePath)
    const nameWithoutExt = basename.replace(/\.(ts|tsx|js|jsx)$/, '')

    return ROUTE_FILE_NAMES.includes(nameWithoutExt as typeof ROUTE_FILE_NAMES[number])
  }

  /**
   * Invalidate virtual modules to trigger HMR.
   */
  function invalidateVirtualModules(): void {
    if (!server) return

    const idsToInvalidate = [
      RESOLVED_VIRTUAL_IDS.SERVER_ENTRY,
      RESOLVED_VIRTUAL_IDS.CLIENT_ENTRY,
      RESOLVED_VIRTUAL_IDS.MANIFEST,
    ]

    for (const id of idsToInvalidate) {
      const mod = server.moduleGraph.getModuleById(id)
      if (mod) {
        server.moduleGraph.invalidateModule(mod)
      }
    }

    // Trigger full reload for now (can optimize to use HMR later)
    server.ws.send({ type: 'full-reload', path: '*' })
  }

  return {
    name: 'cloudwerk',

    /**
     * Pass publicDir configuration to Vite.
     * This enables Vite's built-in static file serving for the public directory.
     */
    async config(userConfig) {
      // Don't override if user explicitly set publicDir in vite.config.ts
      if (userConfig.publicDir !== undefined) {
        return {}
      }

      // Load config to respect cloudwerk.config.ts
      const root = userConfig.root ?? process.cwd()
      const cloudwerkConfig = await loadConfig(root)

      // Use plugin option, Cloudwerk config, or default
      return {
        publicDir: options.publicDir ?? cloudwerkConfig.publicDir ?? 'public',
      }
    },

    /**
     * Resolve configuration and build initial manifest.
     */
    async configResolved(config: ResolvedConfig) {
      const root = config.root

      // Check for user-provided server entry
      let detectedServerEntry: string | null = options.serverEntry
        ? path.resolve(root, options.serverEntry)
        : null

      // Also check for conventional locations if not explicitly provided
      if (!detectedServerEntry) {
        const conventionalPaths = [
          path.resolve(root, 'app/server.ts'),
          path.resolve(root, 'app/server.tsx'),
          path.resolve(root, 'src/server.ts'),
          path.resolve(root, 'src/server.tsx'),
        ]

        for (const p of conventionalPaths) {
          if (fs.existsSync(p)) {
            detectedServerEntry = p
            if (options.verbose) {
              console.log(`[cloudwerk] Detected custom server entry: ${p}`)
            }
            break
          }
        }
      }

      // Load Cloudwerk config
      const cloudwerkConfig = await loadConfig(root)

      // Detect production mode from Vite's config
      const isProduction = config.command === 'build' || config.mode === 'production'

      // Resolve options
      const resolvedOptions: ResolvedCloudwerkOptions = {
        appDir: options.appDir ?? cloudwerkConfig.appDir,
        routesDir: options.routesDir ?? cloudwerkConfig.routesDir ?? 'routes',
        config: { ...cloudwerkConfig, ...options.config } as CloudwerkConfig,
        serverEntry: detectedServerEntry,
        clientEntry: options.clientEntry ?? null,
        verbose: options.verbose ?? false,
        hydrationEndpoint: options.hydrationEndpoint ?? '/__cloudwerk',
        renderer: options.renderer ?? (cloudwerkConfig.ui?.renderer as 'hono-jsx' | 'react') ?? 'hono-jsx',
        publicDir: options.publicDir ?? cloudwerkConfig.publicDir ?? 'public',
        root,
        isProduction,
      }

      // Initialize state with placeholder values
      state = {
        options: resolvedOptions,
        manifest: {
          routes: [],
          layouts: new Map(),
          middleware: new Map(),
          errorBoundaries: new Map(),
          notFoundBoundaries: new Map(),
          errors: [],
          warnings: [],
          generatedAt: new Date(),
          rootDir: '',
        },
        scanResult: {
          routes: [],
          layouts: [],
          middleware: [],
          loading: [],
          errors: [],
          notFound: [],
        },
        clientComponents: new Map(),
        serverEntryCache: null,
        clientEntryCache: null,
      }

      // Build initial manifest
      await buildManifest(root)

      // Pre-scan for client components (needed for production builds)
      await scanClientComponents(root, state)
    },

    /**
     * Configure the dev server with file watching.
     */
    configureServer(devServer: ViteDevServer) {
      server = devServer

      if (!state) return

      const appDir = path.resolve(state.options.root, state.options.appDir)
      const root = state.options.root
      const verbose = state.options.verbose

      // Watch for route file changes
      devServer.watcher.on('add', async (filePath: string) => {
        if (isRouteFile(filePath)) {
          if (state?.options.verbose) {
            console.log(`[cloudwerk] Route added: ${path.relative(appDir, filePath)}`)
          }
          await buildManifest(state!.options.root)
          invalidateVirtualModules()
        }
      })

      devServer.watcher.on('unlink', async (filePath: string) => {
        if (isRouteFile(filePath)) {
          if (state?.options.verbose) {
            console.log(`[cloudwerk] Route removed: ${path.relative(appDir, filePath)}`)
          }
          await buildManifest(state!.options.root)
          invalidateVirtualModules()
        }
      })

      devServer.watcher.on('change', async (filePath: string) => {
        if (isRouteFile(filePath)) {
          if (state?.options.verbose) {
            console.log(`[cloudwerk] Route changed: ${path.relative(appDir, filePath)}`)
          }
          await buildManifest(state!.options.root)
          invalidateVirtualModules()
        }

        // Watch for wrangler.toml changes to regenerate .cloudwerk/types/
        const wranglerPath = findWranglerTomlPath(root)
        if (wranglerPath && filePath === wranglerPath) {
          if (verbose) {
            console.log(`[cloudwerk] wrangler.toml changed, regenerating types...`)
          }
          const result = regenerateCloudwerkTypes(root)
          if (result && verbose) {
            console.log(`[cloudwerk] Regenerated .cloudwerk/types/ with ${result.bindingCount} binding(s)`)
          }
        }
      })

      // Add wrangler.toml to the watcher if it exists
      const wranglerPath = findWranglerTomlPath(root)
      if (wranglerPath) {
        devServer.watcher.add(wranglerPath)
      }
    },

    /**
     * Resolve virtual module IDs.
     */
    resolveId(id: string) {
      if (id === VIRTUAL_MODULE_IDS.SERVER_ENTRY) {
        return RESOLVED_VIRTUAL_IDS.SERVER_ENTRY
      }
      if (id === VIRTUAL_MODULE_IDS.CLIENT_ENTRY) {
        return RESOLVED_VIRTUAL_IDS.CLIENT_ENTRY
      }
      if (id === VIRTUAL_MODULE_IDS.MANIFEST) {
        return RESOLVED_VIRTUAL_IDS.MANIFEST
      }
      return null
    },

    /**
     * Load virtual module content.
     */
    load(id: string) {
      if (!state) return null

      // Handle virtual:cloudwerk/server-entry
      if (id === RESOLVED_VIRTUAL_IDS.SERVER_ENTRY) {
        // If user provides custom server entry, re-export it
        if (state.options.serverEntry) {
          return `export { default } from '${state.options.serverEntry}'`
        }

        // Generate virtual server entry
        if (!state.serverEntryCache) {
          state.serverEntryCache = generateServerEntry(
            state.manifest,
            state.scanResult,
            state.options
          )
        }
        return state.serverEntryCache
      }

      // Handle virtual:cloudwerk/client-entry
      if (id === RESOLVED_VIRTUAL_IDS.CLIENT_ENTRY) {
        // If user provides custom client entry, re-export it
        if (state.options.clientEntry) {
          return `export * from '${state.options.clientEntry}'`
        }

        // Generate virtual client entry
        if (!state.clientEntryCache) {
          state.clientEntryCache = generateClientEntry(
            state.clientComponents,
            state.options
          )
        }
        return state.clientEntryCache
      }

      // Handle virtual:cloudwerk/manifest (for debugging)
      if (id === RESOLVED_VIRTUAL_IDS.MANIFEST) {
        return `export default ${JSON.stringify(
          {
            routes: state.manifest.routes.map((r) => ({
              urlPattern: r.urlPattern,
              filePath: r.filePath,
              fileType: r.fileType,
            })),
            generatedAt: state.manifest.generatedAt.toISOString(),
          },
          null,
          2
        )}`
      }

      return null
    },

    /**
     * Transform hook to detect and wrap client components.
     */
    transform(code: string, id: string) {
      if (!state) return null

      // Skip node_modules
      if (id.includes('node_modules')) return null
      if (!id.endsWith('.tsx') && !id.endsWith('.ts')) return null

      // Check for 'use client' directive
      if (hasUseClientDirective(code)) {
        const componentId = generateComponentId(id, state.options.root)
        const bundlePath = `${state.options.hydrationEndpoint}/${componentId}.js`

        const info: ClientComponentInfo = {
          componentId,
          bundlePath,
          absolutePath: id,
        }

        state.clientComponents.set(id, info)

        // Invalidate client entry cache
        state.clientEntryCache = null

        if (state.options.verbose) {
          console.log(`[cloudwerk] Detected client component: ${componentId}`)
        }

        // Transform the client component to wrap its default export
        // This adds the hydration wrapper for server-side rendering
        // Use the actual file path for Vite to resolve in dev mode
        const result = transformClientComponent(code, {
          componentId,
          bundlePath: id, // Use file path for Vite to resolve in dev mode
        })

        if (!result.success && state.options.verbose) {
          console.warn(`[cloudwerk] ${result.error}`)
        }

        return {
          code: result.code,
          map: null,
        }
      }

      return null
    },
  }
}
