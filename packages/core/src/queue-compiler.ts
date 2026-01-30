/**
 * @cloudwerk/core - Queue Compiler
 *
 * Compiles scanned queue files into a QueueManifest.
 */

import type { ScannedQueue, QueueScanResult } from './queue-scanner.js'
import {
  fileNameToQueueName,
  queueNameToBindingName,
  queueNameToCloudflareQueueName,
} from './queue-scanner.js'

// ============================================================================
// Types
// ============================================================================

/**
 * Processing configuration for a queue.
 */
export interface QueueProcessingConfig {
  batchSize?: number
  maxRetries?: number
  retryDelay?: string | number
  deadLetterQueue?: string
  batchTimeout?: string | number
}

/**
 * A compiled queue entry in the manifest.
 */
export interface QueueEntry {
  /** Queue name derived from filename (e.g., 'email', 'imageProcessing') */
  name: string

  /** Binding name for wrangler.toml (e.g., 'EMAIL_QUEUE') */
  bindingName: string

  /** Actual queue name in Cloudflare (e.g., 'cloudwerk-email') */
  queueName: string

  /** Relative path to the queue definition file */
  filePath: string

  /** Absolute path to the queue definition file */
  absolutePath: string

  /** Processing configuration from the queue definition */
  config: QueueProcessingConfig

  /** Whether processBatch is defined */
  hasProcessBatch: boolean

  /** Whether onError handler is defined */
  hasOnError: boolean

  /** TypeScript type name for the message body (if extractable) */
  messageType?: string
}

/**
 * Validation error for a queue definition.
 */
export interface QueueValidationError {
  /** Queue file path */
  file: string

  /** Error message */
  message: string

  /** Error code for programmatic handling */
  code: 'NO_HANDLER' | 'INVALID_CONFIG' | 'DUPLICATE_NAME' | 'INVALID_NAME'
}

/**
 * Validation warning for a queue definition.
 */
export interface QueueValidationWarning {
  /** Queue file path */
  file: string

  /** Warning message */
  message: string

  /** Warning code */
  code: 'NO_DLQ' | 'LOW_RETRIES' | 'MISSING_ERROR_HANDLER'
}

/**
 * Complete queue manifest generated during build.
 */
export interface QueueManifest {
  /** All compiled queue entries */
  queues: QueueEntry[]

  /** Validation errors (queue won't be registered) */
  errors: QueueValidationError[]

  /** Validation warnings (queue will be registered with warning) */
  warnings: QueueValidationWarning[]

  /** When the manifest was generated */
  generatedAt: Date

  /** Root directory of the app */
  rootDir: string
}

/**
 * Options for building the queue manifest.
 */
export interface BuildQueueManifestOptions {
  /** App name for Cloudflare queue naming */
  appName?: string

  /** Skip loading queue modules (for static analysis only) */
  skipModuleLoad?: boolean
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_QUEUE_CONFIG: Required<QueueProcessingConfig> = {
  batchSize: 10,
  maxRetries: 3,
  retryDelay: '1m',
  deadLetterQueue: '',
  batchTimeout: '5s',
}

// ============================================================================
// Compilation
// ============================================================================

/**
 * Compile a scanned queue file into a QueueEntry.
 *
 * This creates a basic entry from file information. The actual config
 * values are loaded separately via loadQueueDefinition.
 *
 * @param scannedQueue - Scanned queue file
 * @param appName - App name for Cloudflare queue naming
 * @returns Compiled queue entry
 */
export function compileQueue(
  scannedQueue: ScannedQueue,
  appName: string = 'cloudwerk'
): QueueEntry {
  const name = fileNameToQueueName(scannedQueue.name)
  const bindingName = queueNameToBindingName(name)
  const queueName = queueNameToCloudflareQueueName(name, appName)

  return {
    name,
    bindingName,
    queueName,
    filePath: scannedQueue.relativePath,
    absolutePath: scannedQueue.absolutePath,
    config: { ...DEFAULT_QUEUE_CONFIG },
    hasProcessBatch: false,
    hasOnError: false,
    messageType: undefined,
  }
}

/**
 * Validate a queue name.
 *
 * @param name - Queue name to validate
 * @returns Error message if invalid, null if valid
 */
function validateQueueName(name: string): string | null {
  if (name.length === 0) {
    return 'Queue name cannot be empty'
  }

  // Names should start with lowercase letter
  if (!/^[a-z]/.test(name)) {
    return 'Queue name must start with a lowercase letter'
  }

  // Names should be camelCase (no hyphens, underscores)
  if (/[-_]/.test(name)) {
    return 'Queue name should be camelCase (file can be kebab-case)'
  }

  return null
}

/**
 * Build the complete queue manifest from scan results.
 *
 * @param scanResult - Result from scanQueues()
 * @param rootDir - Root directory of the app
 * @param options - Build options
 * @returns Complete queue manifest
 */
export function buildQueueManifest(
  scanResult: QueueScanResult,
  rootDir: string,
  options: BuildQueueManifestOptions = {}
): QueueManifest {
  const { appName = 'cloudwerk' } = options

  const queues: QueueEntry[] = []
  const errors: QueueValidationError[] = []
  const warnings: QueueValidationWarning[] = []
  const seenNames = new Set<string>()

  for (const scannedQueue of scanResult.queues) {
    const entry = compileQueue(scannedQueue, appName)

    // Validate name
    const nameError = validateQueueName(entry.name)
    if (nameError) {
      errors.push({
        file: scannedQueue.relativePath,
        message: nameError,
        code: 'INVALID_NAME',
      })
      continue
    }

    // Check for duplicate names
    if (seenNames.has(entry.name)) {
      errors.push({
        file: scannedQueue.relativePath,
        message: `Duplicate queue name '${entry.name}'`,
        code: 'DUPLICATE_NAME',
      })
      continue
    }
    seenNames.add(entry.name)

    // Add warnings for best practices
    if (!entry.config.deadLetterQueue) {
      warnings.push({
        file: scannedQueue.relativePath,
        message: `Queue '${entry.name}' has no dead letter queue configured`,
        code: 'NO_DLQ',
      })
    }

    if (entry.config.maxRetries !== undefined && entry.config.maxRetries < 2) {
      warnings.push({
        file: scannedQueue.relativePath,
        message: `Queue '${entry.name}' has low maxRetries (${entry.config.maxRetries}). Consider at least 2.`,
        code: 'LOW_RETRIES',
      })
    }

    queues.push(entry)
  }

  return {
    queues,
    errors,
    warnings,
    generatedAt: new Date(),
    rootDir,
  }
}

/**
 * Update a queue entry with loaded module information.
 *
 * Call this after dynamically importing the queue module to fill in
 * config, hasProcessBatch, hasOnError, etc.
 *
 * @param entry - Queue entry to update
 * @param definition - Loaded queue definition from the module
 * @returns Updated queue entry
 */
export function updateQueueEntryFromDefinition(
  entry: QueueEntry,
  definition: {
    name?: string
    config?: QueueProcessingConfig
    process?: unknown
    processBatch?: unknown
    onError?: unknown
  }
): QueueEntry {
  return {
    ...entry,
    // Use explicit name if provided
    name: definition.name || entry.name,
    // Merge config
    config: {
      ...DEFAULT_QUEUE_CONFIG,
      ...definition.config,
    },
    // Set handler flags
    hasProcessBatch: typeof definition.processBatch === 'function',
    hasOnError: typeof definition.onError === 'function',
  }
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format queue validation errors for display.
 *
 * @param errors - Validation errors
 * @returns Formatted error string
 */
export function formatQueueErrors(errors: QueueValidationError[]): string {
  if (errors.length === 0) {
    return ''
  }

  const lines = ['Queue validation errors:']
  for (const error of errors) {
    lines.push(`  - ${error.file}: ${error.message}`)
  }
  return lines.join('\n')
}

/**
 * Format queue validation warnings for display.
 *
 * @param warnings - Validation warnings
 * @returns Formatted warning string
 */
export function formatQueueWarnings(warnings: QueueValidationWarning[]): string {
  if (warnings.length === 0) {
    return ''
  }

  const lines = ['Queue validation warnings:']
  for (const warning of warnings) {
    lines.push(`  - ${warning.file}: ${warning.message}`)
  }
  return lines.join('\n')
}

/**
 * Check if the manifest has errors.
 *
 * @param manifest - Queue manifest
 * @returns true if there are errors
 */
export function hasQueueErrors(manifest: QueueManifest): boolean {
  return manifest.errors.length > 0
}

/**
 * Check if the manifest has warnings.
 *
 * @param manifest - Queue manifest
 * @returns true if there are warnings
 */
export function hasQueueWarnings(manifest: QueueManifest): boolean {
  return manifest.warnings.length > 0
}
