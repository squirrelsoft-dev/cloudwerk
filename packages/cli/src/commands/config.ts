/**
 * @cloudwerk/cli - Config Command
 *
 * Manage Cloudwerk configuration (renderer switching, etc.)
 */

import * as readline from 'node:readline'
import pc from 'picocolors'

import {
  readCloudwerkConfig,
  writeCloudwerkConfig,
  type RendererType,
} from '../utils/configWriter.js'
import { readTsConfig, updateTsConfig } from '../utils/tsconfigWriter.js'
import {
  addDependencies,
  removeDependencies,
  hasReactDependencies,
  detectIncompatibleReactLibs,
} from '../utils/dependencyManager.js'

// ============================================================================
// Constants
// ============================================================================

const VALID_RENDERERS: readonly RendererType[] = ['react', 'hono-jsx', 'preact'] as const

// ============================================================================
// Config Get Command
// ============================================================================

/**
 * Get a configuration value.
 *
 * @param key - Configuration key to get (e.g., 'renderer')
 */
export function configGet(key: string): void {
  const cwd = process.cwd()

  switch (key) {
    case 'renderer': {
      const config = readCloudwerkConfig(cwd)
      const tsconfig = readTsConfig(cwd)

      if (config.renderer) {
        console.log(config.renderer)
      } else if (tsconfig.jsxImportSource) {
        // Infer from tsconfig
        const jsxSource = tsconfig.jsxImportSource
        if (jsxSource === 'react') {
          console.log('react')
        } else if (jsxSource === 'hono/jsx') {
          console.log('hono-jsx')
        } else if (jsxSource === 'preact') {
          console.log('preact')
        } else {
          console.log(pc.yellow('unknown') + pc.dim(` (jsxImportSource: ${jsxSource})`))
        }
      } else {
        console.log('hono-jsx' + pc.dim(' (default)'))
      }
      break
    }

    default:
      console.log(pc.red(`Error: Unknown config key '${key}'`))
      console.log()
      console.log(pc.dim('Available keys:'))
      console.log(pc.dim('  - renderer'))
      process.exit(1)
  }
}

// ============================================================================
// Config Set Command
// ============================================================================

/**
 * Set a configuration value.
 *
 * @param key - Configuration key to set (e.g., 'renderer')
 * @param value - Value to set
 */
export async function configSet(key: string, value: string): Promise<void> {
  const cwd = process.cwd()

  switch (key) {
    case 'renderer': {
      await setRenderer(cwd, value)
      break
    }

    default:
      console.log(pc.red(`Error: Unknown config key '${key}'`))
      console.log()
      console.log(pc.dim('Available keys:'))
      console.log(pc.dim('  - renderer'))
      process.exit(1)
  }
}

// ============================================================================
// Renderer Switching
// ============================================================================

/**
 * Switch the renderer to a new value.
 *
 * @param cwd - Current working directory
 * @param renderer - New renderer value
 */
async function setRenderer(cwd: string, renderer: string): Promise<void> {
  // Validate renderer value
  if (!VALID_RENDERERS.includes(renderer as RendererType)) {
    console.log(pc.red(`Error: Invalid renderer '${renderer}'`))
    console.log()
    console.log(pc.dim('Valid renderers:'))
    console.log(pc.dim('  - react'))
    console.log(pc.dim('  - hono-jsx'))
    console.log(pc.dim('  - preact (limited support)'))
    process.exit(1)
  }

  const rendererType = renderer as RendererType

  // Preact is not fully implemented yet
  if (rendererType === 'preact') {
    console.log(pc.yellow('Warning: Preact renderer is not fully implemented yet.'))
    console.log(pc.yellow('Only configuration will be updated.'))
    console.log()
  }

  // Check current renderer
  const currentConfig = readCloudwerkConfig(cwd)
  if (currentConfig.renderer === rendererType) {
    console.log(pc.yellow(`Renderer is already set to '${rendererType}'`))
    return
  }

  console.log()

  if (rendererType === 'react') {
    await switchToReact(cwd)
  } else if (rendererType === 'hono-jsx') {
    await switchToHonoJsx(cwd)
  } else if (rendererType === 'preact') {
    await switchToPreact(cwd)
  }
}

// ============================================================================
// Switch to React
// ============================================================================

/**
 * Switch renderer to React.
 *
 * @param cwd - Current working directory
 */
async function switchToReact(cwd: string): Promise<void> {
  // 1. Update cloudwerk.config.ts
  writeCloudwerkConfig(cwd, { renderer: 'react' })
  console.log(pc.green('\u2713') + ' Updated cloudwerk.config.ts')

  // 2. Update tsconfig.json
  const tsconfigUpdated = updateTsConfig(cwd, { jsxImportSource: 'react' })
  if (tsconfigUpdated) {
    console.log(pc.green('\u2713') + ' Updated tsconfig.json ' + pc.dim('(jsxImportSource: react)'))
  } else {
    console.log(pc.yellow('\u26A0') + ' tsconfig.json not found, skipping')
  }

  // 3. Install React dependencies
  console.log(pc.cyan('\u2713') + ' Installing dependencies...')

  const { hasReact, hasReactDom, hasTypes } = hasReactDependencies(cwd)

  // Install runtime dependencies
  const runtimeDeps: string[] = []
  if (!hasReact) runtimeDeps.push('react')
  if (!hasReactDom) runtimeDeps.push('react-dom')

  if (runtimeDeps.length > 0) {
    const success = addDependencies(cwd, runtimeDeps, false)
    if (success) {
      console.log(pc.green('\u2713') + ' Added ' + runtimeDeps.join(', '))
    } else {
      console.log(pc.red('\u2717') + ' Failed to install ' + runtimeDeps.join(', '))
    }
  }

  // Install type definitions
  if (!hasTypes) {
    const typesDeps = ['@types/react', '@types/react-dom']
    const success = addDependencies(cwd, typesDeps, true)
    if (success) {
      console.log(pc.green('\u2713') + ' Added ' + typesDeps.join(', ') + pc.dim(' (dev)'))
    } else {
      console.log(pc.red('\u2717') + ' Failed to install type definitions')
    }
  }

  // Print success message
  console.log()
  console.log(pc.green(pc.bold('Renderer switched to React.')))
  console.log()
  console.log(pc.dim('Note: Most Hono JSX code works with React unchanged.'))
  console.log(pc.dim('See migration guide: https://cloudwerk.dev/docs/migration'))
  console.log()
}

// ============================================================================
// Switch to Hono JSX
// ============================================================================

/**
 * Switch renderer to Hono JSX.
 *
 * @param cwd - Current working directory
 */
async function switchToHonoJsx(cwd: string): Promise<void> {
  // Check for potentially incompatible libraries
  const incompatibleLibs = detectIncompatibleReactLibs(cwd)

  if (incompatibleLibs.length > 0) {
    console.log(pc.yellow('\u26A0') + ' ' + pc.bold('Compatibility warnings:'))
    console.log()
    console.log(pc.dim('  The following dependencies may not work with Hono JSX:'))
    console.log()
    for (const lib of incompatibleLibs) {
      console.log(pc.yellow('  - ') + lib + pc.dim(' (uses React internals)'))
    }
    console.log()
    console.log(pc.dim('  Consider keeping the React renderer or finding alternatives.'))
    console.log()

    const proceed = await askConfirmation('Continue anyway?', false)
    if (!proceed) {
      console.log(pc.dim('Aborted.'))
      return
    }
    console.log()
  }

  // 1. Update cloudwerk.config.ts
  writeCloudwerkConfig(cwd, { renderer: 'hono-jsx' })
  console.log(pc.green('\u2713') + ' Updated cloudwerk.config.ts')

  // 2. Update tsconfig.json
  const tsconfigUpdated = updateTsConfig(cwd, { jsxImportSource: 'hono/jsx' })
  if (tsconfigUpdated) {
    console.log(pc.green('\u2713') + ' Updated tsconfig.json ' + pc.dim('(jsxImportSource: hono/jsx)'))
  } else {
    console.log(pc.yellow('\u26A0') + ' tsconfig.json not found, skipping')
  }

  // 3. Optionally remove React dependencies
  const { installedPackages } = hasReactDependencies(cwd)

  if (installedPackages.length > 0) {
    console.log()
    const removeReact = await askConfirmation('Remove React dependencies?', false)

    if (removeReact) {
      const success = removeDependencies(cwd, installedPackages)
      if (success) {
        console.log(pc.green('\u2713') + ' Removed ' + installedPackages.join(', '))
      } else {
        console.log(pc.red('\u2717') + ' Failed to remove React dependencies')
      }
    }
  }

  // Print success message
  console.log()
  console.log(pc.green(pc.bold('Renderer switched to Hono JSX.')))
  console.log()
  console.log(pc.bold('Benefits:'))
  console.log(pc.dim('- Smaller bundle size (~3kb vs ~45kb)'))
  console.log(pc.dim('- Workers-optimized'))
  console.log(pc.dim('- No external dependencies'))
  console.log()

  if (incompatibleLibs.length > 0) {
    console.log(pc.bold('Potential issues:'))
    console.log(pc.dim('- React-specific libraries won\'t work'))
    console.log(pc.dim('- Some Context API differences'))
    console.log(pc.dim('- forwardRef pattern may differ'))
    console.log()
  }

  console.log(pc.dim('See migration guide: https://cloudwerk.dev/docs/migration'))
  console.log()
}

// ============================================================================
// Switch to Preact
// ============================================================================

/**
 * Switch renderer to Preact.
 *
 * @param cwd - Current working directory
 */
async function switchToPreact(cwd: string): Promise<void> {
  // 1. Update cloudwerk.config.ts
  writeCloudwerkConfig(cwd, { renderer: 'preact' })
  console.log(pc.green('\u2713') + ' Updated cloudwerk.config.ts')

  // 2. Update tsconfig.json
  const tsconfigUpdated = updateTsConfig(cwd, { jsxImportSource: 'preact' })
  if (tsconfigUpdated) {
    console.log(pc.green('\u2713') + ' Updated tsconfig.json ' + pc.dim('(jsxImportSource: preact)'))
  } else {
    console.log(pc.yellow('\u26A0') + ' tsconfig.json not found, skipping')
  }

  // Note: We don't install/remove dependencies for preact as it's not fully implemented

  console.log()
  console.log(pc.yellow(pc.bold('Preact configuration applied.')))
  console.log()
  console.log(pc.yellow('Note: Full Preact support is coming in a future release.'))
  console.log(pc.yellow('You may need to manually install preact:'))
  console.log(pc.dim('  pnpm add preact'))
  console.log()
}

// ============================================================================
// User Prompts
// ============================================================================

/**
 * Ask user for confirmation.
 *
 * @param question - Question to ask
 * @param defaultValue - Default value if user presses Enter
 * @returns true if user confirms
 */
async function askConfirmation(question: string, defaultValue: boolean): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const hint = defaultValue ? 'Y/n' : 'y/N'

  return new Promise((resolve) => {
    rl.question(pc.cyan('? ') + question + pc.dim(` (${hint}) `), (answer) => {
      rl.close()

      const normalized = answer.trim().toLowerCase()

      if (normalized === '') {
        resolve(defaultValue)
      } else if (normalized === 'y' || normalized === 'yes') {
        resolve(true)
      } else {
        resolve(false)
      }
    })
  })
}
