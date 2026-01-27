/**
 * @cloudwerk/cli - Config Writer Utility
 *
 * Read and write cloudwerk.config.ts configuration.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

// ============================================================================
// Types
// ============================================================================

/**
 * UI renderer type.
 */
export type RendererType = 'hono-jsx' | 'react' | 'preact'

/**
 * Parsed config values.
 */
export interface ParsedConfig {
  renderer?: RendererType
  routesDir?: string
}

/**
 * Config update options.
 */
export interface ConfigUpdate {
  renderer?: RendererType
}

// ============================================================================
// Constants
// ============================================================================

const CONFIG_FILE_NAMES = [
  'cloudwerk.config.ts',
  'cloudwerk.config.js',
  'cloudwerk.config.mjs',
] as const

// ============================================================================
// Config File Operations
// ============================================================================

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
 * Read the current renderer from cloudwerk config.
 *
 * @param cwd - Directory containing config file
 * @returns Parsed config values
 */
export function readCloudwerkConfig(cwd: string): ParsedConfig {
  const configPath = findConfigFile(cwd)

  if (!configPath) {
    return {}
  }

  const content = fs.readFileSync(configPath, 'utf-8')
  const result: ParsedConfig = {}

  // Extract renderer value using regex
  // Match patterns like: renderer: 'react' or renderer: "hono-jsx"
  const rendererMatch = content.match(/renderer\s*:\s*['"]([^'"]+)['"]/i)
  if (rendererMatch) {
    const value = rendererMatch[1]
    if (value === 'hono-jsx' || value === 'react' || value === 'preact') {
      result.renderer = value
    }
  }

  // Extract routesDir value
  const routesDirMatch = content.match(/routesDir\s*:\s*['"]([^'"]+)['"]/i)
  if (routesDirMatch) {
    result.routesDir = routesDirMatch[1]
  }

  return result
}

/**
 * Update cloudwerk.config.ts with new values.
 *
 * @param cwd - Directory containing config file
 * @param updates - Configuration updates to apply
 * @returns true if successful, false if file not found
 */
export function writeCloudwerkConfig(cwd: string, updates: ConfigUpdate): boolean {
  const configPath = findConfigFile(cwd)

  if (!configPath) {
    // Create a minimal config file
    const newConfigPath = path.join(cwd, 'cloudwerk.config.ts')
    const content = generateMinimalConfig(updates)
    fs.writeFileSync(newConfigPath, content, 'utf-8')
    return true
  }

  let content = fs.readFileSync(configPath, 'utf-8')

  if (updates.renderer !== undefined) {
    content = updateRenderer(content, updates.renderer)
  }

  fs.writeFileSync(configPath, content, 'utf-8')
  return true
}

// ============================================================================
// Config Manipulation
// ============================================================================

/**
 * Update the renderer value in config content.
 *
 * @param content - Current file content
 * @param renderer - New renderer value
 * @returns Updated content
 */
function updateRenderer(content: string, renderer: RendererType): string {
  // Check if ui section exists
  const hasUiSection = /ui\s*:\s*\{/.test(content)

  if (hasUiSection) {
    // Check if renderer exists within ui section
    const hasRenderer = /ui\s*:\s*\{[^}]*renderer\s*:/s.test(content)

    if (hasRenderer) {
      // Replace existing renderer value
      return content.replace(
        /(ui\s*:\s*\{[^}]*renderer\s*:\s*)['"][^'"]+['"]/s,
        `$1'${renderer}'`
      )
    } else {
      // Add renderer to existing ui section
      return content.replace(
        /(ui\s*:\s*\{)/,
        `$1\n    renderer: '${renderer}',`
      )
    }
  } else {
    // Check if defineConfig call exists
    const hasDefineConfig = /defineConfig\s*\(\s*\{/.test(content)

    if (hasDefineConfig) {
      // Find the closing of the defineConfig object
      // Look for the pattern where we can insert the ui config
      // We need to add ui: { renderer: '...' } before the closing }

      // Try to find a good insertion point - before the closing }
      // Match the defineConfig({ ... }) pattern and find the last property
      const lines = content.split('\n')
      const result: string[] = []
      let insertedUi = false
      let depth = 0
      let inDefineConfig = false

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        // Track when we enter defineConfig
        if (line.includes('defineConfig(')) {
          inDefineConfig = true
        }

        if (inDefineConfig) {
          // Count braces to track depth
          for (const char of line) {
            if (char === '{') depth++
            if (char === '}') depth--
          }

          // If we're about to close the defineConfig object (depth goes to 0)
          // and we haven't inserted yet, insert before this line
          if (depth === 0 && !insertedUi && line.includes('}')) {
            // Insert ui config before the closing brace
            result.push('  ui: {')
            result.push(`    renderer: '${renderer}',`)
            result.push('  },')
            insertedUi = true
          }
        }

        result.push(line)
      }

      return result.join('\n')
    } else {
      // No defineConfig - wrap with minimal structure
      return generateMinimalConfig({ renderer })
    }
  }
}

/**
 * Generate a minimal config file.
 *
 * @param updates - Configuration values
 * @returns Config file content
 */
function generateMinimalConfig(updates: ConfigUpdate): string {
  const lines = [
    "import { defineConfig } from '@cloudwerk/core'",
    '',
    'export default defineConfig({',
    "  routesDir: 'app',",
  ]

  if (updates.renderer) {
    lines.push('  ui: {')
    lines.push(`    renderer: '${updates.renderer}',`)
    lines.push('  },')
  }

  lines.push('})')
  lines.push('')

  return lines.join('\n')
}
