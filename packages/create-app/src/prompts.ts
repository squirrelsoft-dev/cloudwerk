/**
 * create-cloudwerk-app - Interactive Prompts
 *
 * Interactive prompts for CLI configuration using @clack/prompts.
 */

import * as p from '@clack/prompts'

// ============================================================================
// Types
// ============================================================================

/**
 * Available UI renderer choices.
 */
export type RendererChoice = 'hono-jsx' | 'react' | 'none'

// ============================================================================
// Prompts
// ============================================================================

/**
 * Prompt the user to select a UI renderer.
 *
 * @returns The selected renderer choice
 */
export async function promptRenderer(): Promise<RendererChoice> {
  const renderer = await p.select({
    message: 'Select UI renderer:',
    options: [
      {
        value: 'hono-jsx',
        label: 'Hono JSX (recommended)',
        hint: 'Lightweight (~3kb), Workers-optimized',
      },
      {
        value: 'react',
        label: 'React',
        hint: 'Full ecosystem, larger bundle (~45kb)',
      },
      {
        value: 'none',
        label: 'None (API only)',
        hint: 'No UI rendering, pure API routes',
      },
    ],
  })

  if (p.isCancel(renderer)) {
    p.cancel('Operation cancelled')
    process.exit(0)
  }

  return renderer as RendererChoice
}

/**
 * Check if running in interactive mode.
 *
 * Returns false if:
 * - CI environment detected
 * - Not running in a TTY
 * - --renderer flag was explicitly passed
 *
 * @param args - Command line arguments
 * @returns True if interactive mode should be used
 */
export function isInteractiveMode(args: string[]): boolean {
  // Check for CI environment
  if (process.env.CI === 'true' || process.env.CI === '1') {
    return false
  }

  // Check if renderer was explicitly specified
  if (args.includes('--renderer') || args.includes('-r')) {
    return false
  }

  // Check if running in a TTY
  if (!process.stdin.isTTY) {
    return false
  }

  return true
}
