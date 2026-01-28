/**
 * @cloudwerk/core - Configuration Loader
 *
 * Type-safe configuration management for Cloudwerk.
 */

import * as path from 'node:path'
import * as fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import type { CloudwerkConfig, CloudwerkUserConfig, SupportedExtension } from './types.js'

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default configuration values.
 */
export const DEFAULT_CONFIG: CloudwerkConfig = {
  appDir: 'app',
  routesDir: 'app',
  extensions: ['.ts', '.tsx'] as SupportedExtension[],
  strict: true,
  basePath: '/',
  debug: false,
}

// ============================================================================
// Configuration Definition
// ============================================================================

/**
 * Type-safe configuration helper.
 * Use this function to define your Cloudwerk configuration.
 *
 * @param config - User configuration options
 * @returns Fully typed configuration object
 *
 * @example
 * // cloudwerk.config.ts
 * import { defineConfig } from '@cloudwerk/core'
 *
 * export default defineConfig({
 *   routesDir: 'app',
 *   extensions: ['.ts', '.tsx'],
 *   strict: true,
 * })
 */
export function defineConfig(config: CloudwerkUserConfig): CloudwerkConfig {
  return mergeConfig(DEFAULT_CONFIG, config)
}

// ============================================================================
// Configuration Merging
// ============================================================================

/**
 * Merge user configuration with defaults.
 *
 * @param defaults - Default configuration
 * @param user - User provided configuration
 * @returns Merged configuration
 */
export function mergeConfig(
  defaults: CloudwerkConfig,
  user: CloudwerkUserConfig
): CloudwerkConfig {
  return {
    appDir: user.appDir ?? defaults.appDir,
    routesDir: user.routesDir ?? defaults.routesDir,
    extensions: user.extensions ?? defaults.extensions,
    strict: user.strict ?? defaults.strict,
    globalMiddleware: user.globalMiddleware ?? defaults.globalMiddleware,
    basePath: user.basePath ?? defaults.basePath,
    debug: user.debug ?? defaults.debug,
    ui: user.ui ?? defaults.ui,
  }
}

// ============================================================================
// Configuration Loading
// ============================================================================

/**
 * Configuration file names to search for (in order of priority).
 */
const CONFIG_FILE_NAMES = [
  'cloudwerk.config.ts',
  'cloudwerk.config.js',
  'cloudwerk.config.mjs',
]

/**
 * Find the configuration file in a directory.
 *
 * @param cwd - Directory to search in
 * @returns Path to config file or null if not found
 */
export function findConfigFile(cwd: string): string | null {
  for (const filename of CONFIG_FILE_NAMES) {
    const configPath = path.join(cwd, filename)
    if (fs.existsSync(configPath)) {
      return configPath
    }
  }
  return null
}

/**
 * Compile a TypeScript config file to JavaScript using esbuild.
 *
 * @param configPath - Path to the TypeScript config file
 * @returns Path to the compiled temporary JavaScript file
 */
async function compileTypeScriptConfig(configPath: string): Promise<string> {
  const result = await build({
    entryPoints: [configPath],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    external: ['@cloudwerk/core'], // Don't bundle the core package
  })

  // Write temp file in the same directory as the config so it can resolve node_modules
  const configDir = path.dirname(configPath)
  const tempPath = path.join(configDir, `.cloudwerk-config-${Date.now()}.mjs`)
  fs.writeFileSync(tempPath, result.outputFiles[0].text)
  return tempPath
}

/**
 * Load configuration from a file or use defaults.
 *
 * @param cwd - Working directory to search for config
 * @returns Loaded configuration with defaults applied
 *
 * @example
 * const config = await loadConfig(process.cwd())
 */
export async function loadConfig(cwd: string): Promise<CloudwerkConfig> {
  const configPath = findConfigFile(cwd)

  if (!configPath) {
    // No config file found, use defaults
    return { ...DEFAULT_CONFIG }
  }

  let importPath = configPath
  let tempFile: string | null = null

  try {
    // Compile TypeScript configs
    if (configPath.endsWith('.ts')) {
      tempFile = await compileTypeScriptConfig(configPath)
      importPath = pathToFileURL(tempFile).href
    }

    const configModule = await import(importPath)
    const userConfig = configModule.default as CloudwerkUserConfig

    return mergeConfig(DEFAULT_CONFIG, userConfig)
  } catch (error) {
    // If we can't load the config, use defaults with a warning
    console.warn(`Warning: Could not load config from ${configPath}:`, error)
    return { ...DEFAULT_CONFIG }
  } finally {
    // Clean up temp file
    if (tempFile) {
      try {
        fs.unlinkSync(tempFile)
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Load configuration synchronously (for simple use cases).
 * Note: This only works with .js config files, not .ts files.
 *
 * @param cwd - Working directory to search for config
 * @returns Loaded configuration with defaults applied
 */
export function loadConfigSync(cwd: string): CloudwerkConfig {
  const configPath = findConfigFile(cwd)

  if (!configPath) {
    return { ...DEFAULT_CONFIG }
  }

  // For sync loading, we only support .js files
  if (!configPath.endsWith('.js') && !configPath.endsWith('.mjs')) {
    console.warn(`Warning: Sync config loading only supports .js files. Using defaults.`)
    return { ...DEFAULT_CONFIG }
  }

  try {
    // Use require for sync loading (only works in CJS context)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const configModule = require(configPath)
    const userConfig = configModule.default || configModule

    return mergeConfig(DEFAULT_CONFIG, userConfig)
  } catch (error) {
    console.warn(`Warning: Could not load config from ${configPath}:`, error)
    return { ...DEFAULT_CONFIG }
  }
}

// ============================================================================
// Configuration Validation
// ============================================================================

/**
 * Validate a configuration object.
 *
 * @param config - Configuration to validate
 * @returns Array of validation error messages (empty if valid)
 */
export function validateConfig(config: CloudwerkConfig): string[] {
  const errors: string[] = []

  // Validate routesDir
  if (!config.routesDir || typeof config.routesDir !== 'string') {
    errors.push('routesDir must be a non-empty string')
  }

  // Validate extensions
  if (!Array.isArray(config.extensions) || config.extensions.length === 0) {
    errors.push('extensions must be a non-empty array')
  } else {
    const validExtensions = ['.ts', '.tsx', '.js', '.jsx']
    for (const ext of config.extensions) {
      if (!validExtensions.includes(ext)) {
        errors.push(`Invalid extension: ${ext}. Valid extensions are: ${validExtensions.join(', ')}`)
      }
    }
  }

  // Validate basePath
  if (typeof config.basePath !== 'string') {
    errors.push('basePath must be a string')
  } else if (!config.basePath.startsWith('/')) {
    errors.push('basePath must start with /')
  }

  return errors
}

// ============================================================================
// Configuration Utilities
// ============================================================================

/**
 * Resolve the routes directory to an absolute path.
 *
 * @param config - Configuration object
 * @param cwd - Current working directory
 * @returns Absolute path to routes directory
 * @deprecated Use resolveRoutesPath instead for consistent behavior with appDir
 */
export function resolveRoutesDir(config: CloudwerkConfig, cwd: string): string {
  if (path.isAbsolute(config.routesDir)) {
    return config.routesDir
  }
  return path.resolve(cwd, config.routesDir)
}

/**
 * Resolve the full routes path, handling both absolute paths and paths relative to appDir.
 *
 * If routesDir contains a path separator or is absolute, it's resolved directly from cwd.
 * Otherwise, it's resolved relative to appDir (e.g., 'app/routes').
 *
 * @param routesDir - Routes directory from config (e.g., 'routes' or 'app/routes')
 * @param appDir - Application directory (e.g., 'app')
 * @param cwd - Current working directory
 * @returns Absolute path to routes directory
 *
 * @example
 * // routesDir: 'routes', appDir: 'app' => '/cwd/app/routes'
 * resolveRoutesPath('routes', 'app', '/cwd')
 *
 * @example
 * // routesDir: 'app/routes', appDir: 'app' => '/cwd/app/routes'
 * resolveRoutesPath('app/routes', 'app', '/cwd')
 */
export function resolveRoutesPath(routesDir: string, appDir: string, cwd: string): string {
  // If routesDir contains a path separator or is absolute, resolve directly from cwd
  if (routesDir.includes('/') || routesDir.includes(path.sep) || path.isAbsolute(routesDir)) {
    return path.resolve(cwd, routesDir)
  }
  // Otherwise, resolve relative to appDir
  return path.resolve(cwd, appDir, routesDir)
}

/**
 * Check if a file extension is supported.
 *
 * @param ext - File extension to check (including dot)
 * @param config - Configuration object
 * @returns True if extension is supported
 */
export function isSupportedExtension(ext: string, config: CloudwerkConfig): boolean {
  return config.extensions.includes(ext as SupportedExtension)
}
