/**
 * @cloudwerk/core - Queue Scanner
 *
 * Scans the app/queues/ directory for queue definition files.
 */

import * as path from 'node:path'
import fg from 'fast-glob'
import type { SupportedExtension, CloudwerkConfig } from './types.js'
import { SUPPORTED_EXTENSIONS } from './types.js'

// ============================================================================
// Types
// ============================================================================

/**
 * A scanned queue file from the app/queues/ directory.
 */
export interface ScannedQueue {
  /** Relative path from app/queues/ (e.g., 'email.ts') */
  relativePath: string

  /** Absolute filesystem path */
  absolutePath: string

  /** File name without extension (e.g., 'email') */
  name: string

  /** File extension (e.g., '.ts') */
  extension: SupportedExtension
}

/**
 * Result of scanning the app/queues/ directory.
 */
export interface QueueScanResult {
  /** All discovered queue files */
  queues: ScannedQueue[]
}

// ============================================================================
// Constants
// ============================================================================

/** Default directory name for queues */
export const QUEUES_DIR = 'queues'

// ============================================================================
// File Detection
// ============================================================================

/**
 * Check if a file is a valid queue file.
 *
 * @param filename - File name to check
 * @returns True if this is a valid queue file
 */
export function isQueueFile(filename: string): boolean {
  const parsed = path.parse(filename)
  const ext = parsed.ext as SupportedExtension

  // Must have a supported extension
  if (!SUPPORTED_EXTENSIONS.includes(ext as typeof SUPPORTED_EXTENSIONS[number])) {
    return false
  }

  // Queue files should not be test files
  if (parsed.name.endsWith('.test') || parsed.name.endsWith('.spec')) {
    return false
  }

  // Queue files should not be type definition files
  if (parsed.base.endsWith('.d.ts')) {
    return false
  }

  return true
}

/**
 * Convert a filename to a queue name.
 *
 * Converts kebab-case to camelCase.
 *
 * @param filename - File name without extension
 * @returns Queue name in camelCase
 *
 * @example
 * fileNameToQueueName('email')            // 'email'
 * fileNameToQueueName('image-processing') // 'imageProcessing'
 * fileNameToQueueName('send-notifications') // 'sendNotifications'
 */
export function fileNameToQueueName(filename: string): string {
  return filename.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Convert a queue name to a binding name.
 *
 * Converts camelCase to SCREAMING_SNAKE_CASE with _QUEUE suffix.
 *
 * @param queueName - Queue name in camelCase
 * @returns Binding name in SCREAMING_SNAKE_CASE
 *
 * @example
 * queueNameToBindingName('email')            // 'EMAIL_QUEUE'
 * queueNameToBindingName('imageProcessing')  // 'IMAGE_PROCESSING_QUEUE'
 */
export function queueNameToBindingName(queueName: string): string {
  const screaming = queueName
    .replace(/([A-Z])/g, '_$1')
    .toUpperCase()
    .replace(/^_/, '')

  return `${screaming}_QUEUE`
}

/**
 * Convert a queue name to the actual Cloudflare queue name.
 *
 * Converts camelCase to kebab-case with cloudwerk- prefix.
 *
 * @param queueName - Queue name in camelCase
 * @param appName - Optional app name prefix (defaults to 'cloudwerk')
 * @returns Cloudflare queue name
 *
 * @example
 * queueNameToCloudflareQueueName('email')           // 'cloudwerk-email'
 * queueNameToCloudflareQueueName('imageProcessing') // 'cloudwerk-image-processing'
 * queueNameToCloudflareQueueName('email', 'myapp')  // 'myapp-email'
 */
export function queueNameToCloudflareQueueName(
  queueName: string,
  appName: string = 'cloudwerk'
): string {
  const kebab = queueName.replace(/([A-Z])/g, '-$1').toLowerCase()
  return `${appName}-${kebab}`
}

// ============================================================================
// Queue Scanning
// ============================================================================

/**
 * Create a ScannedQueue object from a file path.
 *
 * @param filePath - Absolute path to the file
 * @param queuesDir - Root queues directory for relative path calculation
 * @returns ScannedQueue object
 */
function createScannedQueue(filePath: string, queuesDir: string): ScannedQueue {
  const absolutePath = path.resolve(filePath)
  const relativePath = path
    .relative(queuesDir, absolutePath)
    .split(path.sep)
    .join(path.posix.sep)
  const parsed = path.parse(filePath)

  return {
    relativePath,
    absolutePath,
    name: parsed.name,
    extension: parsed.ext as SupportedExtension,
  }
}

/**
 * Scan the queues directory for all queue files.
 *
 * @param rootDir - App root directory (should contain queues/ subdirectory)
 * @param config - Configuration options
 * @returns QueueScanResult with discovered queue files
 *
 * @example
 * const result = await scanQueues('./app', {
 *   extensions: ['.ts', '.tsx'],
 * })
 */
export async function scanQueues(
  rootDir: string,
  config: Pick<CloudwerkConfig, 'extensions'>
): Promise<QueueScanResult> {
  const queuesDir = path.resolve(rootDir, QUEUES_DIR)
  const extensions = config.extensions.map((ext) => ext.slice(1)).join(',')

  // Build glob pattern for queue files (direct children only, no subdirectories)
  const pattern = `*.{${extensions}}`

  // Find all matching files
  const files = await fg(pattern, {
    cwd: queuesDir,
    absolute: true,
    onlyFiles: true,
    ignore: [
      '**/*.test.*',
      '**/*.spec.*',
      '**/*.d.ts',
      '**/index.ts',
      '**/index.tsx',
    ],
  })

  // Create scanned queue objects
  const queues: ScannedQueue[] = []

  for (const filePath of files) {
    const parsed = path.parse(filePath)
    if (isQueueFile(parsed.base)) {
      queues.push(createScannedQueue(filePath, queuesDir))
    }
  }

  return { queues }
}

/**
 * Scan queues synchronously (for testing or simple use cases).
 *
 * @param rootDir - App root directory (should contain queues/ subdirectory)
 * @param config - Configuration options
 * @returns QueueScanResult with discovered queue files
 */
export function scanQueuesSync(
  rootDir: string,
  config: Pick<CloudwerkConfig, 'extensions'>
): QueueScanResult {
  const queuesDir = path.resolve(rootDir, QUEUES_DIR)
  const extensions = config.extensions.map((ext) => ext.slice(1)).join(',')

  // Build glob pattern for queue files (direct children only, no subdirectories)
  const pattern = `*.{${extensions}}`

  // Find all matching files
  const files = fg.sync(pattern, {
    cwd: queuesDir,
    absolute: true,
    onlyFiles: true,
    ignore: [
      '**/*.test.*',
      '**/*.spec.*',
      '**/*.d.ts',
      '**/index.ts',
      '**/index.tsx',
    ],
  })

  // Create scanned queue objects
  const queues: ScannedQueue[] = []

  for (const filePath of files) {
    const parsed = path.parse(filePath)
    if (isQueueFile(parsed.base)) {
      queues.push(createScannedQueue(filePath, queuesDir))
    }
  }

  return { queues }
}
