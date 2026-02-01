/**
 * @cloudwerk/vite-plugin - Types
 *
 * Configuration and internal types for the Cloudwerk Vite plugin.
 */

import type {
  CloudwerkConfig,
  RouteManifest,
  ScanResult,
  QueueManifest,
  QueueScanResult,
  ServiceManifest,
  ServiceScanResult,
} from '@cloudwerk/core/build'

/**
 * Options for the Cloudwerk Vite plugin.
 */
export interface CloudwerkVitePluginOptions {
  /**
   * Directory containing route files.
   * @default 'app'
   */
  appDir?: string

  /**
   * Subdirectory within appDir for routes.
   * @default 'routes'
   */
  routesDir?: string

  /**
   * Override Cloudwerk configuration.
   * If not provided, loads from cloudwerk.config.ts
   */
  config?: Partial<CloudwerkConfig>

  /**
   * Custom server entry file path.
   * If provided, disables virtual:cloudwerk/server-entry generation.
   * Plugin also auto-detects if user provides their own app/server.ts
   */
  serverEntry?: string

  /**
   * Custom client entry file path.
   * If provided, disables virtual:cloudwerk/client-entry generation.
   */
  clientEntry?: string

  /**
   * Enable verbose logging for debugging.
   * @default false
   */
  verbose?: boolean

  /**
   * Hydration endpoint path for client bundles.
   * @default '/__cloudwerk'
   */
  hydrationEndpoint?: string

  /**
   * UI renderer to use.
   * @default 'hono-jsx'
   */
  renderer?: 'hono-jsx' | 'react'

  /**
   * Directory for static assets served at root.
   * @default 'public'
   */
  publicDir?: string
}

/**
 * Resolved plugin options after applying defaults and loading config.
 */
export interface ResolvedCloudwerkOptions {
  /** Directory containing app files (relative to root) */
  appDir: string
  /** Subdirectory within appDir for routes */
  routesDir: string
  /** Loaded Cloudwerk configuration */
  config: CloudwerkConfig
  /** Path to user-provided server entry, or null for generated */
  serverEntry: string | null
  /** Path to user-provided client entry, or null for generated */
  clientEntry: string | null
  /** Whether verbose logging is enabled */
  verbose: boolean
  /** Hydration endpoint path */
  hydrationEndpoint: string
  /** UI renderer name */
  renderer: 'hono-jsx' | 'react'
  /** Directory for static assets (relative to root) */
  publicDir: string
  /** Vite root directory (absolute path) */
  root: string
  /** Whether building for production (affects asset paths) */
  isProduction?: boolean
}

/**
 * Internal plugin state.
 */
export interface PluginState {
  /** Resolved options */
  options: ResolvedCloudwerkOptions
  /** Current route manifest */
  manifest: RouteManifest
  /** Current scan result */
  scanResult: ScanResult
  /** Queue manifest (if queues are enabled) */
  queueManifest: QueueManifest | null
  /** Queue scan result (if queues are enabled) */
  queueScanResult: QueueScanResult | null
  /** Service manifest (if services are enabled) */
  serviceManifest: ServiceManifest | null
  /** Service scan result (if services are enabled) */
  serviceScanResult: ServiceScanResult | null
  /** Map of client component paths to their info */
  clientComponents: Map<string, ClientComponentInfo>
  /** Map of file paths to their CSS imports */
  cssImports: Map<string, CssImportInfo[]>
  /** Cached server entry code */
  serverEntryCache: string | null
  /** Cached client entry code */
  clientEntryCache: string | null
}

/**
 * Information about a detected client component.
 */
export interface ClientComponentInfo {
  /** Component identifier for hydration */
  componentId: string
  /** Path to the component's client bundle */
  bundlePath: string
  /** Absolute file path */
  absolutePath: string
}

/**
 * Information about a CSS import detected in a layout or page.
 */
export interface CssImportInfo {
  /** Absolute path to the CSS file */
  absolutePath: string
  /** File that imports the CSS */
  importedBy: string
  /** Whether the importing file is a layout */
  isLayout: boolean
}

/**
 * Virtual module IDs used by the plugin.
 */
export const VIRTUAL_MODULE_IDS = {
  SERVER_ENTRY: 'virtual:cloudwerk/server-entry',
  CLIENT_ENTRY: 'virtual:cloudwerk/client-entry',
  MANIFEST: 'virtual:cloudwerk/manifest',
} as const

/**
 * Resolved (internal) virtual module IDs with \0 prefix.
 */
export const RESOLVED_VIRTUAL_IDS = {
  SERVER_ENTRY: '\0virtual:cloudwerk/server-entry',
  CLIENT_ENTRY: '\0virtual:cloudwerk/client-entry',
  MANIFEST: '\0virtual:cloudwerk/manifest',
} as const
