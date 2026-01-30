/**
 * @cloudwerk/core - Service Scanner
 *
 * Scans the app/services/ directory for service definition files.
 * Services are discovered via the convention: app/services/<name>/service.ts
 */

import * as path from 'node:path'
import fg from 'fast-glob'
import type { SupportedExtension, CloudwerkConfig } from './types.js'
import { SUPPORTED_EXTENSIONS } from './types.js'

// ============================================================================
// Types
// ============================================================================

/**
 * A scanned service from the app/services/ directory.
 */
export interface ScannedService {
  /** Service name derived from directory (e.g., 'email', 'userManagement') */
  name: string

  /** Relative path from app/services/ (e.g., 'email/service.ts') */
  relativePath: string

  /** Absolute filesystem path */
  absolutePath: string

  /** Directory name (e.g., 'email') */
  directoryName: string

  /** File extension (e.g., '.ts') */
  extension: SupportedExtension
}

/**
 * Result of scanning the app/services/ directory.
 */
export interface ServiceScanResult {
  /** All discovered service files */
  services: ScannedService[]
}

// ============================================================================
// Constants
// ============================================================================

/** Default directory name for services */
export const SERVICES_DIR = 'services'

/** Service file name (without extension) */
export const SERVICE_FILE_NAME = 'service'

// ============================================================================
// File Detection
// ============================================================================

/**
 * Check if a file is a valid service file.
 *
 * @param filename - File name to check
 * @returns True if this is a valid service file
 */
export function isServiceFile(filename: string): boolean {
  const parsed = path.parse(filename)
  const ext = parsed.ext as SupportedExtension

  // Must have a supported extension
  if (!SUPPORTED_EXTENSIONS.includes(ext as typeof SUPPORTED_EXTENSIONS[number])) {
    return false
  }

  // Service files should be named 'service'
  if (parsed.name !== SERVICE_FILE_NAME) {
    return false
  }

  // Service files should not be test files
  if (parsed.name.endsWith('.test') || parsed.name.endsWith('.spec')) {
    return false
  }

  // Service files should not be type definition files
  if (parsed.base.endsWith('.d.ts')) {
    return false
  }

  return true
}

/**
 * Convert a directory name to a service name.
 *
 * Converts kebab-case to camelCase.
 *
 * @param directoryName - Directory name
 * @returns Service name in camelCase
 *
 * @example
 * directoryNameToServiceName('email')            // 'email'
 * directoryNameToServiceName('user-management') // 'userManagement'
 * directoryNameToServiceName('send-emails')      // 'sendEmails'
 */
export function directoryNameToServiceName(directoryName: string): string {
  return directoryName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Convert a service name to a binding name.
 *
 * Converts camelCase to SCREAMING_SNAKE_CASE with _SERVICE suffix.
 *
 * @param serviceName - Service name in camelCase
 * @returns Binding name in SCREAMING_SNAKE_CASE
 *
 * @example
 * serviceNameToBindingName('email')            // 'EMAIL_SERVICE'
 * serviceNameToBindingName('userManagement')   // 'USER_MANAGEMENT_SERVICE'
 */
export function serviceNameToBindingName(serviceName: string): string {
  const screaming = serviceName
    .replace(/([A-Z])/g, '_$1')
    .toUpperCase()
    .replace(/^_/, '')

  return `${screaming}_SERVICE`
}

/**
 * Convert a service name to the worker name for extraction.
 *
 * Converts camelCase to kebab-case with -service suffix.
 *
 * @param serviceName - Service name in camelCase
 * @returns Worker name in kebab-case
 *
 * @example
 * serviceNameToWorkerName('email')            // 'email-service'
 * serviceNameToWorkerName('userManagement')   // 'user-management-service'
 */
export function serviceNameToWorkerName(serviceName: string): string {
  const kebab = serviceName.replace(/([A-Z])/g, '-$1').toLowerCase()
  return `${kebab}-service`
}

/**
 * Convert a service name to the entrypoint class name.
 *
 * Converts camelCase to PascalCase with Service suffix.
 *
 * @param serviceName - Service name in camelCase
 * @returns Entrypoint class name in PascalCase
 *
 * @example
 * serviceNameToEntrypointClass('email')            // 'EmailService'
 * serviceNameToEntrypointClass('userManagement')   // 'UserManagementService'
 */
export function serviceNameToEntrypointClass(serviceName: string): string {
  const pascal = serviceName.charAt(0).toUpperCase() + serviceName.slice(1)
  return `${pascal}Service`
}

// ============================================================================
// Service Scanning
// ============================================================================

/**
 * Create a ScannedService object from a file path.
 *
 * @param filePath - Absolute path to the file
 * @param servicesDir - Root services directory for relative path calculation
 * @returns ScannedService object
 */
function createScannedService(
  filePath: string,
  servicesDir: string
): ScannedService {
  const absolutePath = path.resolve(filePath)
  const relativePath = path
    .relative(servicesDir, absolutePath)
    .split(path.sep)
    .join(path.posix.sep)
  const parsed = path.parse(filePath)

  // Get the parent directory name (service directory)
  const directoryName = path.basename(path.dirname(absolutePath))
  const name = directoryNameToServiceName(directoryName)

  return {
    name,
    relativePath,
    absolutePath,
    directoryName,
    extension: parsed.ext as SupportedExtension,
  }
}

/**
 * Scan the services directory for all service files.
 *
 * Services are discovered via the convention: app/services/\<name\>/service.ts
 *
 * @param rootDir - App root directory (should contain services/ subdirectory)
 * @param config - Configuration options
 * @returns ServiceScanResult with discovered service files
 *
 * @example
 * const result = await scanServices('./app', {
 *   extensions: ['.ts', '.tsx'],
 * })
 */
export async function scanServices(
  rootDir: string,
  config: Pick<CloudwerkConfig, 'extensions'>
): Promise<ServiceScanResult> {
  const servicesDir = path.resolve(rootDir, SERVICES_DIR)
  const extensions = config.extensions.map((ext) => ext.slice(1)).join(',')

  // Build glob pattern for service files: */service.{ts,tsx,js,jsx}
  const pattern = `*/${SERVICE_FILE_NAME}.{${extensions}}`

  // Find all matching files
  const files = await fg(pattern, {
    cwd: servicesDir,
    absolute: true,
    onlyFiles: true,
    ignore: [
      '**/*.test.*',
      '**/*.spec.*',
      '**/*.d.ts',
    ],
  })

  // Create scanned service objects
  const services: ScannedService[] = []

  for (const filePath of files) {
    const parsed = path.parse(filePath)
    if (isServiceFile(parsed.base)) {
      services.push(createScannedService(filePath, servicesDir))
    }
  }

  return { services }
}

/**
 * Scan services synchronously (for testing or simple use cases).
 *
 * @param rootDir - App root directory (should contain services/ subdirectory)
 * @param config - Configuration options
 * @returns ServiceScanResult with discovered service files
 */
export function scanServicesSync(
  rootDir: string,
  config: Pick<CloudwerkConfig, 'extensions'>
): ServiceScanResult {
  const servicesDir = path.resolve(rootDir, SERVICES_DIR)
  const extensions = config.extensions.map((ext) => ext.slice(1)).join(',')

  // Build glob pattern for service files: */service.{ts,tsx,js,jsx}
  const pattern = `*/${SERVICE_FILE_NAME}.{${extensions}}`

  // Find all matching files
  const files = fg.sync(pattern, {
    cwd: servicesDir,
    absolute: true,
    onlyFiles: true,
    ignore: [
      '**/*.test.*',
      '**/*.spec.*',
      '**/*.d.ts',
    ],
  })

  // Create scanned service objects
  const services: ScannedService[] = []

  for (const filePath of files) {
    const parsed = path.parse(filePath)
    if (isServiceFile(parsed.base)) {
      services.push(createScannedService(filePath, servicesDir))
    }
  }

  return { services }
}
