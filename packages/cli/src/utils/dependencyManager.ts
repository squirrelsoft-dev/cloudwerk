/**
 * @cloudwerk/cli - Dependency Manager Utility
 *
 * Manage project dependencies (add, remove, detect).
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { execFileSync } from 'node:child_process'

// ============================================================================
// Types
// ============================================================================

/**
 * Package manager type.
 */
export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun'

/**
 * Installed dependencies.
 */
export interface InstalledDependencies {
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
}

/**
 * Known React-specific libraries that may not work with Hono JSX.
 */
export const REACT_SPECIFIC_LIBRARIES = [
  '@tanstack/react-query',
  'framer-motion',
  'react-hook-form',
  'react-router',
  'react-router-dom',
  '@react-spring/core',
  '@react-spring/web',
  '@react-spring/three',
  'react-redux',
  '@reduxjs/toolkit',
  'react-aria',
  'react-stately',
  '@react-aria/button',
  '@react-aria/focus',
  '@radix-ui/react-dialog',
  '@radix-ui/react-dropdown-menu',
  '@radix-ui/react-popover',
  '@radix-ui/react-tooltip',
  '@radix-ui/react-accordion',
  '@headlessui/react',
  'react-dnd',
  'react-beautiful-dnd',
  'react-virtualized',
  'react-window',
  'react-select',
  'react-datepicker',
  'react-toastify',
  'react-i18next',
  'styled-components',
  '@emotion/react',
  '@emotion/styled',
  'jotai',
  'zustand',
  'recoil',
  'use-gesture',
  '@use-gesture/react',
] as const

// ============================================================================
// Package Manager Detection
// ============================================================================

/**
 * Detect the package manager used in a project.
 *
 * @param cwd - Directory to check
 * @returns Detected package manager
 */
export function detectPackageManager(cwd: string): PackageManager {
  // Check for lock files
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) {
    return 'pnpm'
  }
  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) {
    return 'yarn'
  }
  if (fs.existsSync(path.join(cwd, 'bun.lockb'))) {
    return 'bun'
  }
  if (fs.existsSync(path.join(cwd, 'package-lock.json'))) {
    return 'npm'
  }

  // Check for packageManager field in package.json
  const packageJsonPath = path.join(cwd, 'package.json')
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
      const pm = packageJson.packageManager
      if (pm) {
        if (pm.startsWith('pnpm')) return 'pnpm'
        if (pm.startsWith('yarn')) return 'yarn'
        if (pm.startsWith('bun')) return 'bun'
        if (pm.startsWith('npm')) return 'npm'
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Default to npm
  return 'npm'
}

// ============================================================================
// Dependency Reading
// ============================================================================

/**
 * Get installed dependencies from package.json.
 *
 * @param cwd - Directory containing package.json
 * @returns Installed dependencies
 */
export function getInstalledDependencies(cwd: string): InstalledDependencies {
  const packageJsonPath = path.join(cwd, 'package.json')

  if (!fs.existsSync(packageJsonPath)) {
    return {
      dependencies: {},
      devDependencies: {},
    }
  }

  try {
    const content = fs.readFileSync(packageJsonPath, 'utf-8')
    const packageJson = JSON.parse(content)

    return {
      dependencies: packageJson.dependencies || {},
      devDependencies: packageJson.devDependencies || {},
    }
  } catch {
    return {
      dependencies: {},
      devDependencies: {},
    }
  }
}

/**
 * Check if specific packages are installed.
 *
 * @param cwd - Directory containing package.json
 * @param packages - Package names to check
 * @returns Map of package name to whether it's installed
 */
export function hasPackages(cwd: string, packages: string[]): Record<string, boolean> {
  const { dependencies, devDependencies } = getInstalledDependencies(cwd)
  const allDeps = { ...dependencies, ...devDependencies }

  return packages.reduce(
    (acc, pkg) => {
      acc[pkg] = pkg in allDeps
      return acc
    },
    {} as Record<string, boolean>
  )
}

// ============================================================================
// React Detection
// ============================================================================

/**
 * Check if React dependencies are installed.
 *
 * @param cwd - Directory containing package.json
 * @returns Object with React installation status
 */
export function hasReactDependencies(cwd: string): {
  hasReact: boolean
  hasReactDom: boolean
  hasTypes: boolean
  installedPackages: string[]
} {
  const { dependencies, devDependencies } = getInstalledDependencies(cwd)
  const allDeps = { ...dependencies, ...devDependencies }

  const reactPackages = ['react', 'react-dom', '@types/react', '@types/react-dom']
  const installedPackages = reactPackages.filter((pkg) => pkg in allDeps)

  return {
    hasReact: 'react' in allDeps,
    hasReactDom: 'react-dom' in allDeps,
    hasTypes: '@types/react' in allDeps || '@types/react-dom' in allDeps,
    installedPackages,
  }
}

/**
 * Detect potentially incompatible React-specific libraries.
 *
 * @param cwd - Directory containing package.json
 * @returns List of installed React-specific libraries
 */
export function detectIncompatibleReactLibs(cwd: string): string[] {
  const { dependencies, devDependencies } = getInstalledDependencies(cwd)
  const allDeps = { ...dependencies, ...devDependencies }

  const incompatible: string[] = []

  for (const lib of REACT_SPECIFIC_LIBRARIES) {
    if (lib in allDeps) {
      incompatible.push(lib)
    }
  }

  // Also check for any package starting with @radix-ui/react-
  for (const pkg of Object.keys(allDeps)) {
    if (pkg.startsWith('@radix-ui/react-') && !incompatible.includes(pkg)) {
      incompatible.push(pkg)
    }
  }

  return incompatible.sort()
}

// ============================================================================
// Dependency Installation
// ============================================================================

/**
 * Build the arguments array for the package manager install command.
 *
 * @param pm - Package manager
 * @param packages - Packages to install
 * @param isDev - Whether to install as dev dependencies
 * @returns Arguments array for execFileSync
 */
function buildInstallArgs(pm: PackageManager, packages: string[], isDev: boolean): string[] {
  const args: string[] = []

  switch (pm) {
    case 'pnpm':
      args.push('add')
      if (isDev) args.push('-D')
      args.push(...packages)
      break
    case 'yarn':
      args.push('add')
      if (isDev) args.push('-D')
      args.push(...packages)
      break
    case 'bun':
      args.push('add')
      if (isDev) args.push('-d')
      args.push(...packages)
      break
    case 'npm':
    default:
      args.push('install')
      if (isDev) args.push('--save-dev')
      args.push(...packages)
      break
  }

  return args
}

/**
 * Build the arguments array for the package manager remove command.
 *
 * @param pm - Package manager
 * @param packages - Packages to remove
 * @returns Arguments array for execFileSync
 */
function buildRemoveArgs(pm: PackageManager, packages: string[]): string[] {
  const args: string[] = []

  switch (pm) {
    case 'pnpm':
      args.push('remove', ...packages)
      break
    case 'yarn':
      args.push('remove', ...packages)
      break
    case 'bun':
      args.push('remove', ...packages)
      break
    case 'npm':
    default:
      args.push('uninstall', ...packages)
      break
  }

  return args
}

/**
 * Add dependencies to the project.
 *
 * @param cwd - Directory containing package.json
 * @param packages - Packages to install
 * @param isDev - Whether to install as dev dependencies
 * @returns true if successful
 */
export function addDependencies(cwd: string, packages: string[], isDev: boolean = false): boolean {
  if (packages.length === 0) {
    return true
  }

  const pm = detectPackageManager(cwd)
  const args = buildInstallArgs(pm, packages, isDev)

  try {
    execFileSync(pm, args, {
      cwd,
      stdio: 'pipe',
    })
    return true
  } catch {
    return false
  }
}

/**
 * Remove dependencies from the project.
 *
 * @param cwd - Directory containing package.json
 * @param packages - Packages to remove
 * @returns true if successful
 */
export function removeDependencies(cwd: string, packages: string[]): boolean {
  if (packages.length === 0) {
    return true
  }

  const pm = detectPackageManager(cwd)
  const args = buildRemoveArgs(pm, packages)

  try {
    execFileSync(pm, args, {
      cwd,
      stdio: 'pipe',
    })
    return true
  } catch {
    return false
  }
}
