/**
 * @cloudwerk/cli - Config Writer Utility
 *
 * Read and write cloudwerk.config.ts configuration.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { loadConfig } from '@cloudwerk/core/build'

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
 * Uses the core loadConfig function for robust TypeScript/JavaScript parsing.
 *
 * @param cwd - Directory containing config file
 * @returns Parsed config values
 */
export function readCloudwerkConfig(cwd: string): ParsedConfig {
  const configPath = findConfigFile(cwd)

  if (!configPath) {
    return {}
  }

  // For synchronous reading, parse the file content directly
  // This is a simplified parser that handles common config patterns
  const content = fs.readFileSync(configPath, 'utf-8')
  return parseConfigContent(content)
}

/**
 * Read the current renderer from cloudwerk config asynchronously.
 *
 * Uses the core loadConfig function for robust TypeScript/JavaScript parsing.
 *
 * @param cwd - Directory containing config file
 * @returns Parsed config values
 */
export async function readCloudwerkConfigAsync(cwd: string): Promise<ParsedConfig> {
  try {
    const config = await loadConfig(cwd)
    return {
      renderer: config.ui?.renderer as RendererType | undefined,
      routesDir: config.routesDir,
    }
  } catch {
    // Fall back to synchronous parsing if loadConfig fails
    return readCloudwerkConfig(cwd)
  }
}

/**
 * Parse config content to extract values.
 *
 * Handles common patterns in cloudwerk.config.ts files.
 *
 * @param content - File content
 * @returns Parsed config values
 */
function parseConfigContent(content: string): ParsedConfig {
  const result: ParsedConfig = {}

  // Extract renderer value using regex
  // Handles: renderer: 'react', renderer: "hono-jsx", renderer:'preact'
  // Also handles comments and whitespace variations
  const rendererMatch = content.match(/renderer\s*:\s*['"`]([^'"`]+)['"`]/i)
  if (rendererMatch) {
    const value = rendererMatch[1]
    if (value === 'hono-jsx' || value === 'react' || value === 'preact') {
      result.renderer = value
    }
  }

  // Extract routesDir value
  const routesDirMatch = content.match(/routesDir\s*:\s*['"`]([^'"`]+)['"`]/i)
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
 * Strategy:
 * 1. If renderer exists, replace its value
 * 2. If ui section exists without renderer, add renderer to it
 * 3. If no ui section, add it before the closing of defineConfig
 *
 * @param content - Current file content
 * @param renderer - New renderer value
 * @returns Updated content
 */
function updateRenderer(content: string, renderer: RendererType): string {
  // Pattern to match existing renderer value (handles single, double, and backtick quotes)
  const rendererPattern = /(renderer\s*:\s*)['"`][^'"`]*['"`]/

  if (rendererPattern.test(content)) {
    // Case 1: renderer exists - replace its value
    return content.replace(rendererPattern, `$1'${renderer}'`)
  }

  // Pattern to match ui section opening
  const uiSectionPattern = /(ui\s*:\s*\{)/

  if (uiSectionPattern.test(content)) {
    // Case 2: ui section exists but no renderer - add renderer as first property
    return content.replace(uiSectionPattern, `$1\n    renderer: '${renderer}',`)
  }

  // Case 3: no ui section - need to add it
  return addUiSection(content, renderer)
}

/**
 * Add a ui section to the config content.
 *
 * Uses a simple approach: find the closing }) of defineConfig and insert before it.
 *
 * @param content - Current file content
 * @param renderer - Renderer value
 * @returns Updated content
 */
function addUiSection(content: string, renderer: RendererType): string {
  // Check if this is a defineConfig-style file
  if (!content.includes('defineConfig')) {
    // Not a standard config file - generate a new one
    return generateMinimalConfig({ renderer })
  }

  // Strategy: Find the closing `})` of defineConfig and insert ui section before it
  // We look for `})` that's likely the end of defineConfig (at start of line or after whitespace)

  // First, try to find a clean insertion point by looking for the last property
  // A property line typically ends with a comma or has content before `}`

  const lines = content.split('\n')
  const result: string[] = []
  let inserted = false

  // Find the defineConfig closing - look for `})` pattern
  // We scan backwards to find the right place
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]
    const trimmed = line.trim()

    // Found the closing `})` of defineConfig
    if (!inserted && (trimmed === '})' || trimmed.startsWith('})'))) {
      // Insert ui section before this line
      // Detect indentation from surrounding lines
      const indent = detectIndentation(lines, i)

      // When using unshift (prepending), add in reverse order
      // so the final order is: ui: { → renderer → }, → })
      result.unshift(line) // Add the closing line first (we're going backwards)
      result.unshift(`${indent}},`)
      result.unshift(`${indent}  renderer: '${renderer}',`)
      result.unshift(`${indent}ui: {`)
      inserted = true
    } else {
      result.unshift(line)
    }
  }

  if (!inserted) {
    // Fallback: couldn't find insertion point, generate new config
    return generateMinimalConfig({ renderer })
  }

  return result.join('\n')
}

/**
 * Detect the indentation level used in the config file.
 *
 * @param lines - File lines
 * @param closingLineIndex - Index of the closing line
 * @returns Indentation string (spaces or tabs)
 */
function detectIndentation(lines: string[], closingLineIndex: number): string {
  // Look at preceding lines to detect indentation
  for (let i = closingLineIndex - 1; i >= 0; i--) {
    const line = lines[i]
    // Find a line with content that has indentation
    const match = line.match(/^(\s+)\S/)
    if (match) {
      return match[1]
    }
  }
  // Default to 2 spaces
  return '  '
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
