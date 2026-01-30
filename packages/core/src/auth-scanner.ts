/**
 * @cloudwerk/core - Auth Scanner
 *
 * Scans the app/auth/ directory for authentication configuration files.
 */

import * as path from 'node:path'
import fg from 'fast-glob'
import type { SupportedExtension, CloudwerkConfig } from './types.js'
import { SUPPORTED_EXTENSIONS } from './types.js'

// ============================================================================
// Types
// ============================================================================

/**
 * Type of auth file discovered by the scanner.
 */
export type AuthFileType =
  | 'provider'
  | 'config'
  | 'callbacks'
  | 'pages'
  | 'rbac'
  | 'unknown'

/**
 * A scanned auth file from the app/auth/ directory.
 */
export interface ScannedAuthFile {
  /** Relative path from app/auth/ (e.g., 'providers/github.ts') */
  relativePath: string

  /** Absolute filesystem path */
  absolutePath: string

  /** File name without extension (e.g., 'github') */
  name: string

  /** File extension (e.g., '.ts') */
  extension: SupportedExtension

  /** Type of auth file */
  type: AuthFileType

  /** For provider files, the provider ID (derived from filename) */
  providerId?: string
}

/**
 * Result of scanning the app/auth/ directory.
 */
export interface AuthScanResult {
  /** All discovered auth files */
  files: ScannedAuthFile[]

  /** Config file if present */
  configFile?: ScannedAuthFile

  /** Callbacks file if present */
  callbacksFile?: ScannedAuthFile

  /** Pages file if present */
  pagesFile?: ScannedAuthFile

  /** RBAC file if present */
  rbacFile?: ScannedAuthFile

  /** Provider files */
  providerFiles: ScannedAuthFile[]

  /** Whether any auth files were found */
  hasAuth: boolean
}

// ============================================================================
// Constants
// ============================================================================

/** Default directory name for auth configuration */
export const AUTH_DIR = 'auth'

/** Subdirectory for provider definitions */
export const PROVIDERS_DIR = 'providers'

/** Known config file names (without extension) */
const CONFIG_FILE_NAMES = ['config']

/** Known callbacks file names (without extension) */
const CALLBACKS_FILE_NAMES = ['callbacks']

/** Known pages file names (without extension) */
const PAGES_FILE_NAMES = ['pages']

/** Known RBAC file names (without extension) */
const RBAC_FILE_NAMES = ['rbac']

// ============================================================================
// File Detection
// ============================================================================

/**
 * Check if a file is a valid auth file.
 *
 * @param filename - File name to check
 * @returns True if this is a valid auth file
 */
export function isAuthFile(filename: string): boolean {
  const parsed = path.parse(filename)
  const ext = parsed.ext as SupportedExtension

  // Must have a supported extension
  if (!SUPPORTED_EXTENSIONS.includes(ext as (typeof SUPPORTED_EXTENSIONS)[number])) {
    return false
  }

  // Auth files should not be test files
  if (parsed.name.endsWith('.test') || parsed.name.endsWith('.spec')) {
    return false
  }

  // Auth files should not be type definition files
  if (parsed.base.endsWith('.d.ts')) {
    return false
  }

  return true
}

/**
 * Determine the type of auth file based on its path.
 *
 * @param relativePath - Path relative to app/auth/
 * @param fileName - File name without extension
 * @returns The auth file type
 */
export function getAuthFileType(relativePath: string, fileName: string): AuthFileType {
  const dir = path.dirname(relativePath)

  // Provider files are in providers/ subdirectory
  if (dir === PROVIDERS_DIR || dir.startsWith(`${PROVIDERS_DIR}/`)) {
    return 'provider'
  }

  // Check for known config file types at root level
  if (dir === '.') {
    if (CONFIG_FILE_NAMES.includes(fileName)) return 'config'
    if (CALLBACKS_FILE_NAMES.includes(fileName)) return 'callbacks'
    if (PAGES_FILE_NAMES.includes(fileName)) return 'pages'
    if (RBAC_FILE_NAMES.includes(fileName)) return 'rbac'
  }

  return 'unknown'
}

/**
 * Convert a provider filename to a provider ID.
 *
 * @param filename - File name without extension (e.g., 'github')
 * @returns Provider ID in camelCase
 *
 * @example
 * fileNameToProviderId('github')         // 'github'
 * fileNameToProviderId('my-custom-sso')  // 'myCustomSso'
 */
export function fileNameToProviderId(filename: string): string {
  return filename.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
}

// ============================================================================
// Auth Scanning
// ============================================================================

/**
 * Create a ScannedAuthFile object from a file path.
 *
 * @param filePath - Absolute path to the file
 * @param authDir - Root auth directory for relative path calculation
 * @returns ScannedAuthFile object
 */
function createScannedAuthFile(
  filePath: string,
  authDir: string
): ScannedAuthFile {
  const absolutePath = path.resolve(filePath)
  const relativePath = path
    .relative(authDir, absolutePath)
    .split(path.sep)
    .join(path.posix.sep)
  const parsed = path.parse(filePath)

  const type = getAuthFileType(relativePath, parsed.name)
  const providerId = type === 'provider' ? fileNameToProviderId(parsed.name) : undefined

  return {
    relativePath,
    absolutePath,
    name: parsed.name,
    extension: parsed.ext as SupportedExtension,
    type,
    providerId,
  }
}

/**
 * Scan the auth directory for all auth configuration files.
 *
 * Directory structure:
 * - `app/auth/config.ts` - Global auth configuration
 * - `app/auth/callbacks.ts` - Auth callbacks
 * - `app/auth/pages.ts` - Custom page paths
 * - `app/auth/rbac.ts` - Role-based access control
 * - `app/auth/providers/*.ts` - Provider definitions
 *
 * @param rootDir - App root directory (should contain auth/ subdirectory)
 * @param config - Configuration options
 * @returns AuthScanResult with discovered auth files
 *
 * @example
 * const result = await scanAuth('./app', {
 *   extensions: ['.ts', '.tsx'],
 * })
 */
export async function scanAuth(
  rootDir: string,
  config: Pick<CloudwerkConfig, 'extensions'>
): Promise<AuthScanResult> {
  const authDir = path.resolve(rootDir, AUTH_DIR)
  const extensions = config.extensions.map((ext) => ext.slice(1)).join(',')

  // Build glob pattern for auth files
  const pattern = `**/*.{${extensions}}`

  // Find all matching files
  let files: string[] = []
  try {
    files = await fg(pattern, {
      cwd: authDir,
      absolute: true,
      onlyFiles: true,
      ignore: [
        '**/*.test.*',
        '**/*.spec.*',
        '**/*.d.ts',
        // Ignore deeply nested provider files
        `${PROVIDERS_DIR}/**/**/*`,
      ],
    })
  } catch {
    // Directory doesn't exist or is inaccessible
    return createEmptyResult()
  }

  // Create scanned auth file objects
  const scannedFiles: ScannedAuthFile[] = []

  for (const filePath of files) {
    const parsed = path.parse(filePath)
    if (isAuthFile(parsed.base)) {
      const scannedFile = createScannedAuthFile(filePath, authDir)
      scannedFiles.push(scannedFile)
    }
  }

  return categorizeAuthFiles(scannedFiles)
}

/**
 * Synchronous version of scanAuth.
 *
 * @param rootDir - App root directory
 * @param config - Configuration options
 * @returns AuthScanResult with discovered auth files
 */
export function scanAuthSync(
  rootDir: string,
  config: Pick<CloudwerkConfig, 'extensions'>
): AuthScanResult {
  const authDir = path.resolve(rootDir, AUTH_DIR)
  const extensions = config.extensions.map((ext) => ext.slice(1)).join(',')

  // Build glob pattern for auth files
  const pattern = `**/*.{${extensions}}`

  // Find all matching files
  let files: string[] = []
  try {
    files = fg.sync(pattern, {
      cwd: authDir,
      absolute: true,
      onlyFiles: true,
      ignore: [
        '**/*.test.*',
        '**/*.spec.*',
        '**/*.d.ts',
        `${PROVIDERS_DIR}/**/**/*`,
      ],
    })
  } catch {
    // Directory doesn't exist or is inaccessible
    return createEmptyResult()
  }

  // Create scanned auth file objects
  const scannedFiles: ScannedAuthFile[] = []

  for (const filePath of files) {
    const parsed = path.parse(filePath)
    if (isAuthFile(parsed.base)) {
      const scannedFile = createScannedAuthFile(filePath, authDir)
      scannedFiles.push(scannedFile)
    }
  }

  return categorizeAuthFiles(scannedFiles)
}

/**
 * Categorize scanned files into their types.
 */
function categorizeAuthFiles(files: ScannedAuthFile[]): AuthScanResult {
  const result: AuthScanResult = {
    files,
    providerFiles: [],
    hasAuth: files.length > 0,
  }

  for (const file of files) {
    switch (file.type) {
      case 'config':
        result.configFile = file
        break
      case 'callbacks':
        result.callbacksFile = file
        break
      case 'pages':
        result.pagesFile = file
        break
      case 'rbac':
        result.rbacFile = file
        break
      case 'provider':
        result.providerFiles.push(file)
        break
    }
  }

  return result
}

/**
 * Create an empty scan result.
 */
function createEmptyResult(): AuthScanResult {
  return {
    files: [],
    providerFiles: [],
    hasAuth: false,
  }
}

/**
 * Check if an auth directory exists in the given root.
 *
 * @param rootDir - App root directory
 * @returns True if auth directory exists
 */
export function hasAuthDirectory(rootDir: string): boolean {
  const authDir = path.resolve(rootDir, AUTH_DIR)
  try {
    const stats = require('node:fs').statSync(authDir)
    return stats.isDirectory()
  } catch {
    return false
  }
}
