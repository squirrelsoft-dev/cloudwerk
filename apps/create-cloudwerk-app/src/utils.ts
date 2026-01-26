/**
 * create-cloudwerk-app - Utility Functions
 *
 * Package manager detection and colored logging utilities.
 */

import pc from 'picocolors'

// ============================================================================
// Package Manager Detection
// ============================================================================

/**
 * Supported package managers.
 */
export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun'

/**
 * Detect the package manager being used to run the script.
 *
 * Checks in order:
 * 1. npm_config_user_agent environment variable
 * 2. USER_AGENT environment variable (for some CI environments)
 * 3. Defaults to npm
 *
 * @returns The detected package manager
 */
export function detectPackageManager(): PackageManager {
  // Check npm_config_user_agent (set by npm, yarn, pnpm, bun when running scripts)
  const userAgent = process.env.npm_config_user_agent || process.env.USER_AGENT

  if (userAgent) {
    if (userAgent.includes('pnpm')) {
      return 'pnpm'
    }
    if (userAgent.includes('yarn')) {
      return 'yarn'
    }
    if (userAgent.includes('bun')) {
      return 'bun'
    }
    if (userAgent.includes('npm')) {
      return 'npm'
    }
  }

  // Default to npm
  return 'npm'
}

/**
 * Get the install command for the detected package manager.
 *
 * @param pm - Package manager
 * @returns Install command string
 */
export function getInstallCommand(pm: PackageManager): string {
  switch (pm) {
    case 'yarn':
      return 'yarn'
    case 'pnpm':
      return 'pnpm install'
    case 'bun':
      return 'bun install'
    default:
      return 'npm install'
  }
}

/**
 * Get the dev command for the detected package manager.
 *
 * @param pm - Package manager
 * @returns Dev command string
 */
export function getDevCommand(pm: PackageManager): string {
  switch (pm) {
    case 'yarn':
      return 'yarn dev'
    case 'pnpm':
      return 'pnpm dev'
    case 'bun':
      return 'bun dev'
    default:
      return 'npm run dev'
  }
}

// ============================================================================
// Logging Utilities
// ============================================================================

/**
 * Logger instance for CLI output.
 */
export const logger = {
  /**
   * Log an info message with blue prefix.
   */
  info(message: string): void {
    console.log(pc.blue('info') + ' ' + message)
  },

  /**
   * Log a success message with green prefix.
   */
  success(message: string): void {
    console.log(pc.green('success') + ' ' + message)
  },

  /**
   * Log an error message with red prefix.
   */
  error(message: string): void {
    console.log(pc.red('error') + ' ' + message)
  },

  /**
   * Log a warning message with yellow prefix.
   */
  warn(message: string): void {
    console.log(pc.yellow('warn') + ' ' + message)
  },

  /**
   * Log a plain message without prefix.
   */
  log(message: string): void {
    console.log(message)
  },

  /**
   * Log an empty line.
   */
  blank(): void {
    console.log()
  },
}

// ============================================================================
// Output Formatting
// ============================================================================

/**
 * Print the startup banner after scaffolding.
 *
 * @param projectName - Name of the created project
 * @param projectPath - Path to the created project
 * @param pm - Package manager to use
 */
export function printSuccessBanner(
  projectName: string,
  projectPath: string,
  pm: PackageManager
): void {
  const installCmd = getInstallCommand(pm)
  const devCmd = getDevCommand(pm)

  logger.blank()
  logger.success(`Created ${pc.bold(projectName)} at ${pc.cyan(projectPath)}`)
  logger.blank()
  logger.log(pc.dim('  Next steps:'))
  logger.blank()
  logger.log(`  ${pc.dim('$')} ${pc.cyan(`cd ${projectName}`)}`)
  logger.log(`  ${pc.dim('$')} ${pc.cyan(installCmd)}`)
  logger.log(`  ${pc.dim('$')} ${pc.cyan(devCmd)}`)
  logger.blank()
  logger.log(pc.dim('  Happy hacking!'))
  logger.blank()
}
