/**
 * @cloudwerk/cli - TSConfig Updater
 *
 * Updates user's tsconfig.json with paths mappings and include array
 * for .cloudwerk/types directory.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

// ============================================================================
// Types
// ============================================================================

interface TSConfig {
  compilerOptions?: {
    paths?: Record<string, string[]>
    baseUrl?: string
    [key: string]: unknown
  }
  include?: string[]
  [key: string]: unknown
}

export interface UpdateTsConfigResult {
  /** Path to tsconfig.json */
  tsconfigPath: string
  /** Whether tsconfig.json was modified */
  modified: boolean
  /** Changes made */
  changes: {
    addedIncludes: string[]
    addedPaths: string[]
    setBaseUrl: boolean
  }
}

// ============================================================================
// Constants
// ============================================================================

const CLOUDWERK_TYPES_INCLUDE = '.cloudwerk/types/**/*'
const BINDINGS_PATH_KEY = '@cloudwerk/core/bindings'
const CONTEXT_PATH_KEY = '@cloudwerk/core/context'

// ============================================================================
// Main Function
// ============================================================================

/**
 * Update user's tsconfig.json with Cloudwerk type paths.
 *
 * This function:
 * 1. Adds paths mappings for @cloudwerk/core/bindings and @cloudwerk/core/context
 * 2. Adds .cloudwerk/types to the include array
 * 3. Sets baseUrl to "." if not already set (required for paths)
 */
export function updateTsConfigPaths(cwd: string): UpdateTsConfigResult {
  const tsconfigPath = path.join(cwd, 'tsconfig.json')
  const changes: UpdateTsConfigResult['changes'] = {
    addedIncludes: [],
    addedPaths: [],
    setBaseUrl: false,
  }

  // Check if tsconfig.json exists
  if (!fs.existsSync(tsconfigPath)) {
    // Create minimal tsconfig.json
    const newConfig: TSConfig = {
      compilerOptions: {
        baseUrl: '.',
        paths: {
          [BINDINGS_PATH_KEY]: ['./.cloudwerk/types/bindings.d.ts'],
          [CONTEXT_PATH_KEY]: ['./.cloudwerk/types/context.d.ts'],
        },
      },
      include: [CLOUDWERK_TYPES_INCLUDE],
    }

    fs.writeFileSync(tsconfigPath, JSON.stringify(newConfig, null, 2) + '\n', 'utf-8')

    return {
      tsconfigPath,
      modified: true,
      changes: {
        addedIncludes: [CLOUDWERK_TYPES_INCLUDE],
        addedPaths: [BINDINGS_PATH_KEY, CONTEXT_PATH_KEY],
        setBaseUrl: true,
      },
    }
  }

  // Read existing tsconfig.json
  const content = fs.readFileSync(tsconfigPath, 'utf-8')
  let config: TSConfig

  try {
    config = JSON.parse(content)
  } catch {
    // If JSON is invalid, we can't safely modify it
    throw new Error(
      `Invalid JSON in tsconfig.json. Please fix the syntax and try again.`
    )
  }

  let modified = false

  // Ensure compilerOptions exists
  if (!config.compilerOptions) {
    config.compilerOptions = {}
  }

  // Set baseUrl if not set (required for paths to work)
  if (!config.compilerOptions.baseUrl) {
    config.compilerOptions.baseUrl = '.'
    changes.setBaseUrl = true
    modified = true
  }

  // Ensure paths exists
  if (!config.compilerOptions.paths) {
    config.compilerOptions.paths = {}
  }

  // Add paths for @cloudwerk/core/bindings
  if (!config.compilerOptions.paths[BINDINGS_PATH_KEY]) {
    config.compilerOptions.paths[BINDINGS_PATH_KEY] = [
      './.cloudwerk/types/bindings.d.ts',
    ]
    changes.addedPaths.push(BINDINGS_PATH_KEY)
    modified = true
  }

  // Add paths for @cloudwerk/core/context
  if (!config.compilerOptions.paths[CONTEXT_PATH_KEY]) {
    config.compilerOptions.paths[CONTEXT_PATH_KEY] = [
      './.cloudwerk/types/context.d.ts',
    ]
    changes.addedPaths.push(CONTEXT_PATH_KEY)
    modified = true
  }

  // Ensure include exists and has .cloudwerk/types
  if (!config.include) {
    config.include = []
  }

  if (!config.include.includes(CLOUDWERK_TYPES_INCLUDE)) {
    // Add to beginning of include array for visibility
    config.include.unshift(CLOUDWERK_TYPES_INCLUDE)
    changes.addedIncludes.push(CLOUDWERK_TYPES_INCLUDE)
    modified = true
  }

  // Write updated config if modified
  if (modified) {
    // Preserve original formatting as much as possible
    const newContent = JSON.stringify(config, null, 2) + '\n'
    fs.writeFileSync(tsconfigPath, newContent, 'utf-8')
  }

  return {
    tsconfigPath,
    modified,
    changes,
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if tsconfig.json already has Cloudwerk paths configured.
 */
export function hasTsConfigPaths(cwd: string): boolean {
  const tsconfigPath = path.join(cwd, 'tsconfig.json')

  if (!fs.existsSync(tsconfigPath)) {
    return false
  }

  try {
    const content = fs.readFileSync(tsconfigPath, 'utf-8')
    const config: TSConfig = JSON.parse(content)

    return !!(
      config.compilerOptions?.paths?.[BINDINGS_PATH_KEY] &&
      config.compilerOptions?.paths?.[CONTEXT_PATH_KEY]
    )
  } catch {
    return false
  }
}

/**
 * Check if tsconfig.json includes .cloudwerk/types.
 */
export function hasTsConfigInclude(cwd: string): boolean {
  const tsconfigPath = path.join(cwd, 'tsconfig.json')

  if (!fs.existsSync(tsconfigPath)) {
    return false
  }

  try {
    const content = fs.readFileSync(tsconfigPath, 'utf-8')
    const config: TSConfig = JSON.parse(content)

    return config.include?.includes(CLOUDWERK_TYPES_INCLUDE) ?? false
  } catch {
    return false
  }
}

/**
 * Remove Cloudwerk paths from tsconfig.json.
 */
export function removeTsConfigPaths(cwd: string): boolean {
  const tsconfigPath = path.join(cwd, 'tsconfig.json')

  if (!fs.existsSync(tsconfigPath)) {
    return false
  }

  try {
    const content = fs.readFileSync(tsconfigPath, 'utf-8')
    const config: TSConfig = JSON.parse(content)
    let modified = false

    // Remove paths
    if (config.compilerOptions?.paths) {
      if (config.compilerOptions.paths[BINDINGS_PATH_KEY]) {
        delete config.compilerOptions.paths[BINDINGS_PATH_KEY]
        modified = true
      }
      if (config.compilerOptions.paths[CONTEXT_PATH_KEY]) {
        delete config.compilerOptions.paths[CONTEXT_PATH_KEY]
        modified = true
      }

      // Remove empty paths object
      if (Object.keys(config.compilerOptions.paths).length === 0) {
        delete config.compilerOptions.paths
      }
    }

    // Remove from include
    if (config.include) {
      const index = config.include.indexOf(CLOUDWERK_TYPES_INCLUDE)
      if (index !== -1) {
        config.include.splice(index, 1)
        modified = true
      }
    }

    if (modified) {
      const newContent = JSON.stringify(config, null, 2) + '\n'
      fs.writeFileSync(tsconfigPath, newContent, 'utf-8')
    }

    return modified
  } catch {
    return false
  }
}
