/**
 * @cloudwerk/core - Trigger Compiler
 *
 * Compiles scanned trigger files into a TriggerManifest.
 */

import type { ScannedTrigger, TriggerScanResult } from './trigger-scanner.js'
import {
  fileNameToTriggerName,
  triggerNameToBindingName,
} from './trigger-scanner.js'

// ============================================================================
// Types
// ============================================================================

/**
 * Retry configuration for triggers.
 */
export interface TriggerRetryConfig {
  maxAttempts?: number
  delay?: string
  backoff?: 'linear' | 'exponential'
}

/**
 * Queue trigger source configuration.
 */
export interface QueueTriggerSource {
  type: 'queue'
  queue: string
  batch?: { size?: number; timeout?: string }
}

/**
 * Scheduled trigger source configuration.
 */
export interface ScheduledTriggerSource {
  type: 'scheduled'
  cron: string
}

/**
 * R2 trigger source configuration.
 */
export interface R2TriggerSource {
  type: 'r2'
  bucket: string
  events: ('object-create' | 'object-delete')[]
  prefix?: string
  suffix?: string
}

/**
 * Webhook trigger source configuration.
 */
export interface WebhookTriggerSource {
  type: 'webhook'
  path: string
  methods?: ('POST' | 'PUT' | 'PATCH')[]
}

/**
 * Email trigger source configuration.
 */
export interface EmailTriggerSource {
  type: 'email'
  address: string
}

/**
 * D1 trigger source configuration.
 */
export interface D1TriggerSource {
  type: 'd1'
  database: string
  table: string
  events: ('insert' | 'update' | 'delete')[]
}

/**
 * Tail trigger source configuration.
 */
export interface TailTriggerSource {
  type: 'tail'
  consumers: string[]
}

/**
 * Union of all trigger source types.
 */
export type TriggerSource =
  | QueueTriggerSource
  | ScheduledTriggerSource
  | R2TriggerSource
  | WebhookTriggerSource
  | EmailTriggerSource
  | D1TriggerSource
  | TailTriggerSource

/**
 * A compiled trigger entry in the manifest.
 */
export interface TriggerEntry {
  /** Trigger name derived from filename (e.g., 'dailyCleanup') */
  name: string

  /** Binding name (e.g., 'DAILY_CLEANUP_TRIGGER') */
  bindingName: string

  /** Relative path to the trigger definition file */
  filePath: string

  /** Absolute path to the trigger definition file */
  absolutePath: string

  /** Trigger source configuration (populated after loading module) */
  source?: TriggerSource

  /** Whether onError handler is defined */
  hasOnError: boolean

  /** Retry configuration */
  retry?: TriggerRetryConfig

  /** Execution timeout in milliseconds */
  timeout?: number

  /** Fan-out group name (if part of a fan-out) */
  fanOutGroup?: string
}

/**
 * Error codes for trigger validation.
 */
export type TriggerErrorCode =
  | 'NO_HANDLER'
  | 'INVALID_SOURCE'
  | 'DUPLICATE_NAME'
  | 'INVALID_CRON'
  | 'INVALID_WEBHOOK_PATH'
  | 'INVALID_CONFIG'
  | 'INVALID_NAME'
  | 'MISSING_SOURCE'

/**
 * Warning codes for trigger validation.
 */
export type TriggerWarningCode =
  | 'NO_ERROR_HANDLER'
  | 'DUPLICATE_CRON'
  | 'SHORT_TIMEOUT'
  | 'MISSING_RETRY'
  | 'WEBHOOK_NO_VERIFY'

/**
 * Validation error for a trigger definition.
 */
export interface TriggerValidationError {
  /** Trigger file path */
  file: string

  /** Error message */
  message: string

  /** Error code for programmatic handling */
  code: TriggerErrorCode
}

/**
 * Validation warning for a trigger definition.
 */
export interface TriggerValidationWarning {
  /** Trigger file path */
  file: string

  /** Warning message */
  message: string

  /** Warning code */
  code: TriggerWarningCode
}

/**
 * Complete trigger manifest generated during build.
 */
export interface TriggerManifest {
  /** All compiled trigger entries */
  triggers: TriggerEntry[]

  /** Scheduled triggers grouped by cron expression */
  scheduled: Map<string, TriggerEntry[]>

  /** Queue triggers grouped by queue name */
  queues: Map<string, TriggerEntry[]>

  /** R2 triggers grouped by bucket name */
  r2: Map<string, TriggerEntry[]>

  /** Webhook triggers mapped by path */
  webhooks: Map<string, TriggerEntry>

  /** Email triggers mapped by address pattern */
  emails: Map<string, TriggerEntry>

  /** Fan-out groups (group name -> trigger entries) */
  fanOutGroups: Map<string, TriggerEntry[]>

  /** Validation errors (trigger won't be registered) */
  errors: TriggerValidationError[]

  /** Validation warnings (trigger will be registered with warning) */
  warnings: TriggerValidationWarning[]

  /** When the manifest was generated */
  generatedAt: Date

  /** Root directory of the app */
  rootDir: string
}

/**
 * Options for building the trigger manifest.
 */
export interface BuildTriggerManifestOptions {
  /** Skip loading trigger modules (for static analysis only) */
  skipModuleLoad?: boolean
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_RETRY_CONFIG: Required<TriggerRetryConfig> = {
  maxAttempts: 3,
  delay: '1m',
  backoff: 'linear',
}

const DEFAULT_TIMEOUT = 30000 // 30 seconds

// ============================================================================
// Compilation
// ============================================================================

/**
 * Compile a scanned trigger file into a TriggerEntry.
 *
 * This creates a basic entry from file information. The actual config
 * values are loaded separately via loadTriggerDefinition.
 *
 * @param scannedTrigger - Scanned trigger file
 * @returns Compiled trigger entry
 */
export function compileTrigger(scannedTrigger: ScannedTrigger): TriggerEntry {
  const name = fileNameToTriggerName(scannedTrigger.name)
  const bindingName = triggerNameToBindingName(name)

  return {
    name,
    bindingName,
    filePath: scannedTrigger.relativePath,
    absolutePath: scannedTrigger.absolutePath,
    source: undefined, // Populated after loading module
    hasOnError: false,
    retry: { ...DEFAULT_RETRY_CONFIG },
    timeout: DEFAULT_TIMEOUT,
    fanOutGroup: scannedTrigger.fanOutGroup,
  }
}

/**
 * Validate a trigger name.
 *
 * @param name - Trigger name to validate
 * @returns Error message if invalid, null if valid
 */
function validateTriggerName(name: string): string | null {
  if (name.length === 0) {
    return 'Trigger name cannot be empty'
  }

  // Names should start with lowercase letter
  if (!/^[a-z]/.test(name)) {
    return 'Trigger name must start with a lowercase letter'
  }

  // Names should be camelCase (no hyphens, underscores)
  if (/[-_]/.test(name)) {
    return 'Trigger name should be camelCase (file can be kebab-case)'
  }

  return null
}

/**
 * Build the complete trigger manifest from scan results.
 *
 * @param scanResult - Result from scanTriggers()
 * @param rootDir - Root directory of the app
 * @param options - Build options
 * @returns Complete trigger manifest
 */
export function buildTriggerManifest(
  scanResult: TriggerScanResult,
  rootDir: string,
  _options: BuildTriggerManifestOptions = {}
): TriggerManifest {
  const triggers: TriggerEntry[] = []
  const errors: TriggerValidationError[] = []
  const warnings: TriggerValidationWarning[] = []
  const seenNames = new Set<string>()

  // Group maps (populated after module loading)
  const scheduled = new Map<string, TriggerEntry[]>()
  const queues = new Map<string, TriggerEntry[]>()
  const r2 = new Map<string, TriggerEntry[]>()
  const webhooks = new Map<string, TriggerEntry>()
  const emails = new Map<string, TriggerEntry>()
  const fanOutGroups = new Map<string, TriggerEntry[]>()

  for (const scannedTrigger of scanResult.triggers) {
    const entry = compileTrigger(scannedTrigger)

    // Validate name
    const nameError = validateTriggerName(entry.name)
    if (nameError) {
      errors.push({
        file: scannedTrigger.relativePath,
        message: nameError,
        code: 'INVALID_NAME',
      })
      continue
    }

    // Check for duplicate names
    if (seenNames.has(entry.name)) {
      errors.push({
        file: scannedTrigger.relativePath,
        message: `Duplicate trigger name '${entry.name}'`,
        code: 'DUPLICATE_NAME',
      })
      continue
    }
    seenNames.add(entry.name)

    // Add warnings for best practices
    if (!entry.hasOnError) {
      warnings.push({
        file: scannedTrigger.relativePath,
        message: `Trigger '${entry.name}' has no error handler defined`,
        code: 'NO_ERROR_HANDLER',
      })
    }

    // Track fan-out groups
    if (entry.fanOutGroup) {
      const group = fanOutGroups.get(entry.fanOutGroup) || []
      group.push(entry)
      fanOutGroups.set(entry.fanOutGroup, group)
    }

    triggers.push(entry)
  }

  return {
    triggers,
    scheduled,
    queues,
    r2,
    webhooks,
    emails,
    fanOutGroups,
    errors,
    warnings,
    generatedAt: new Date(),
    rootDir,
  }
}

/**
 * Update a trigger entry with loaded module information.
 *
 * Call this after dynamically importing the trigger module to fill in
 * source, hasOnError, retry, timeout, etc.
 *
 * @param entry - Trigger entry to update
 * @param definition - Loaded trigger definition from the module
 * @returns Updated trigger entry
 */
export function updateTriggerEntryFromDefinition(
  entry: TriggerEntry,
  definition: {
    name?: string
    source?: TriggerSource
    retry?: TriggerRetryConfig
    timeout?: number
    handle?: unknown
    onError?: unknown
  }
): TriggerEntry {
  return {
    ...entry,
    // Use explicit name if provided
    name: definition.name || entry.name,
    // Set source
    source: definition.source,
    // Merge retry config
    retry: {
      ...DEFAULT_RETRY_CONFIG,
      ...definition.retry,
    },
    // Set timeout
    timeout: definition.timeout ?? DEFAULT_TIMEOUT,
    // Set handler flags
    hasOnError: typeof definition.onError === 'function',
  }
}

/**
 * Add warnings based on trigger configuration.
 *
 * @param entry - Trigger entry to check
 * @param warnings - Warnings array to append to
 */
export function addTriggerWarnings(
  entry: TriggerEntry,
  warnings: TriggerValidationWarning[]
): void {
  if (!entry.hasOnError) {
    warnings.push({
      file: entry.filePath,
      message: `Trigger '${entry.name}' has no error handler defined`,
      code: 'NO_ERROR_HANDLER',
    })
  }

  if (entry.timeout && entry.timeout < 5000) {
    warnings.push({
      file: entry.filePath,
      message: `Trigger '${entry.name}' has a short timeout (${entry.timeout}ms). Consider at least 5000ms.`,
      code: 'SHORT_TIMEOUT',
    })
  }

  // Note: Webhook verify warning is added during module loading
  // since we can't check for the verify function at compile time
}

/**
 * Populate source-specific groupings in the manifest.
 *
 * Call this after all trigger definitions have been loaded.
 *
 * @param manifest - The manifest to populate
 */
export function populateTriggerGroups(manifest: TriggerManifest): void {
  // Clear existing groups
  manifest.scheduled.clear()
  manifest.queues.clear()
  manifest.r2.clear()
  manifest.webhooks.clear()
  manifest.emails.clear()

  for (const entry of manifest.triggers) {
    if (!entry.source) continue

    switch (entry.source.type) {
      case 'scheduled': {
        const source = entry.source as ScheduledTriggerSource
        const group = manifest.scheduled.get(source.cron) || []
        group.push(entry)
        manifest.scheduled.set(source.cron, group)
        break
      }
      case 'queue': {
        const source = entry.source as QueueTriggerSource
        const group = manifest.queues.get(source.queue) || []
        group.push(entry)
        manifest.queues.set(source.queue, group)
        break
      }
      case 'r2': {
        const source = entry.source as R2TriggerSource
        const group = manifest.r2.get(source.bucket) || []
        group.push(entry)
        manifest.r2.set(source.bucket, group)
        break
      }
      case 'webhook': {
        const source = entry.source as WebhookTriggerSource
        manifest.webhooks.set(source.path, entry)
        break
      }
      case 'email': {
        const source = entry.source as EmailTriggerSource
        manifest.emails.set(source.address, entry)
        break
      }
    }
  }

  // Check for duplicate cron expressions and add warnings
  for (const [cron, entries] of manifest.scheduled) {
    if (entries.length > 1) {
      // Multiple triggers for same cron - could be intentional for fan-out
      // Only warn if they're not in the same fan-out group
      const groups = new Set(entries.map((e) => e.fanOutGroup).filter(Boolean))
      if (groups.size > 1 || (groups.size === 0 && entries.length > 1)) {
        for (const entry of entries) {
          manifest.warnings.push({
            file: entry.filePath,
            message: `Multiple triggers use the same cron expression '${cron}'`,
            code: 'DUPLICATE_CRON',
          })
        }
      }
    }
  }
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format trigger validation errors for display.
 *
 * @param errors - Validation errors
 * @returns Formatted error string
 */
export function formatTriggerErrors(errors: TriggerValidationError[]): string {
  if (errors.length === 0) {
    return ''
  }

  const lines = ['Trigger validation errors:']
  for (const error of errors) {
    lines.push(`  - ${error.file}: ${error.message}`)
  }
  return lines.join('\n')
}

/**
 * Format trigger validation warnings for display.
 *
 * @param warnings - Validation warnings
 * @returns Formatted warning string
 */
export function formatTriggerWarnings(
  warnings: TriggerValidationWarning[]
): string {
  if (warnings.length === 0) {
    return ''
  }

  const lines = ['Trigger validation warnings:']
  for (const warning of warnings) {
    lines.push(`  - ${warning.file}: ${warning.message}`)
  }
  return lines.join('\n')
}

/**
 * Check if the manifest has errors.
 *
 * @param manifest - Trigger manifest
 * @returns true if there are errors
 */
export function hasTriggerErrors(manifest: TriggerManifest): boolean {
  return manifest.errors.length > 0
}

/**
 * Check if the manifest has warnings.
 *
 * @param manifest - Trigger manifest
 * @returns true if there are warnings
 */
export function hasTriggerWarnings(manifest: TriggerManifest): boolean {
  return manifest.warnings.length > 0
}

/**
 * Get a summary of triggers by type.
 *
 * @param manifest - Trigger manifest
 * @returns Summary object with counts by type
 */
export function getTriggerSummary(manifest: TriggerManifest): {
  total: number
  scheduled: number
  queue: number
  r2: number
  webhook: number
  email: number
  other: number
} {
  let scheduled = 0
  let queue = 0
  let r2Count = 0
  let webhook = 0
  let email = 0
  let other = 0

  for (const trigger of manifest.triggers) {
    switch (trigger.source?.type) {
      case 'scheduled':
        scheduled++
        break
      case 'queue':
        queue++
        break
      case 'r2':
        r2Count++
        break
      case 'webhook':
        webhook++
        break
      case 'email':
        email++
        break
      default:
        other++
    }
  }

  return {
    total: manifest.triggers.length,
    scheduled,
    queue,
    r2: r2Count,
    webhook,
    email,
    other,
  }
}
