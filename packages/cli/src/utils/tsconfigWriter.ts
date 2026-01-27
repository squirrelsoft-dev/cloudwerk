/**
 * @cloudwerk/cli - TSConfig Writer Utility
 *
 * Read and write tsconfig.json configuration.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

// ============================================================================
// Types
// ============================================================================

/**
 * Parsed tsconfig values.
 */
export interface ParsedTsConfig {
  jsxImportSource?: string
  [key: string]: unknown
}

/**
 * TSConfig update options.
 */
export interface TsConfigUpdate {
  jsxImportSource?: string
}

// ============================================================================
// TSConfig Operations
// ============================================================================

/**
 * Find tsconfig.json in a directory.
 *
 * @param cwd - Directory to search in
 * @returns Path to tsconfig.json or null if not found
 */
export function findTsConfig(cwd: string): string | null {
  const tsconfigPath = path.join(cwd, 'tsconfig.json')
  if (fs.existsSync(tsconfigPath)) {
    return tsconfigPath
  }
  return null
}

/**
 * Read tsconfig.json values.
 *
 * @param cwd - Directory containing tsconfig.json
 * @returns Parsed tsconfig values
 */
export function readTsConfig(cwd: string): ParsedTsConfig {
  const tsconfigPath = findTsConfig(cwd)

  if (!tsconfigPath) {
    return {}
  }

  try {
    const content = fs.readFileSync(tsconfigPath, 'utf-8')
    const config = JSON.parse(content)

    return {
      jsxImportSource: config.compilerOptions?.jsxImportSource,
      ...config.compilerOptions,
    }
  } catch {
    return {}
  }
}

/**
 * Update tsconfig.json with new values.
 *
 * @param cwd - Directory containing tsconfig.json
 * @param updates - Configuration updates to apply
 * @returns true if successful, false if file not found
 */
export function updateTsConfig(cwd: string, updates: TsConfigUpdate): boolean {
  const tsconfigPath = findTsConfig(cwd)

  if (!tsconfigPath) {
    return false
  }

  try {
    const content = fs.readFileSync(tsconfigPath, 'utf-8')
    const config = JSON.parse(content)

    // Ensure compilerOptions exists
    if (!config.compilerOptions) {
      config.compilerOptions = {}
    }

    // Apply updates
    if (updates.jsxImportSource !== undefined) {
      config.compilerOptions.jsxImportSource = updates.jsxImportSource
    }

    // Write back with formatting preserved (2 space indent)
    fs.writeFileSync(tsconfigPath, JSON.stringify(config, null, 2) + '\n', 'utf-8')
    return true
  } catch {
    return false
  }
}
