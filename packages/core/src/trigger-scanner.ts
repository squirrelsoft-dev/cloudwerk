/**
 * @cloudwerk/core - Trigger Scanner
 *
 * Scans the app/triggers/ directory for trigger definition files.
 */

import * as path from 'node:path'
import fg from 'fast-glob'
import type { SupportedExtension, CloudwerkConfig } from './types.js'
import { SUPPORTED_EXTENSIONS } from './types.js'

// ============================================================================
// Types
// ============================================================================

/**
 * A scanned trigger file from the app/triggers/ directory.
 */
export interface ScannedTrigger {
  /** Relative path from app/triggers/ (e.g., 'daily-cleanup.ts') */
  relativePath: string

  /** Absolute filesystem path */
  absolutePath: string

  /** File name without extension (e.g., 'daily-cleanup') */
  name: string

  /** File extension (e.g., '.ts') */
  extension: SupportedExtension

  /** If this is in a fan-out subdirectory, the group name */
  fanOutGroup?: string
}

/**
 * Result of scanning the app/triggers/ directory.
 */
export interface TriggerScanResult {
  /** All discovered trigger files */
  triggers: ScannedTrigger[]

  /** Fan-out groups detected (directory name -> trigger file names) */
  fanOutGroups: Map<string, string[]>
}

// ============================================================================
// Constants
// ============================================================================

/** Default directory name for triggers */
export const TRIGGERS_DIR = 'triggers'

// ============================================================================
// File Detection
// ============================================================================

/**
 * Check if a file is a valid trigger file.
 *
 * @param filename - File name to check
 * @returns True if this is a valid trigger file
 */
export function isTriggerFile(filename: string): boolean {
  const parsed = path.parse(filename)
  const ext = parsed.ext as SupportedExtension

  // Must have a supported extension
  if (!SUPPORTED_EXTENSIONS.includes(ext as typeof SUPPORTED_EXTENSIONS[number])) {
    return false
  }

  // Trigger files should not be test files
  if (parsed.name.endsWith('.test') || parsed.name.endsWith('.spec')) {
    return false
  }

  // Trigger files should not be type definition files
  if (parsed.base.endsWith('.d.ts')) {
    return false
  }

  return true
}

/**
 * Convert a filename to a trigger name.
 *
 * Converts kebab-case to camelCase.
 *
 * @param filename - File name without extension
 * @returns Trigger name in camelCase
 *
 * @example
 * fileNameToTriggerName('daily-cleanup')    // 'dailyCleanup'
 * fileNameToTriggerName('process-uploads')  // 'processUploads'
 * fileNameToTriggerName('email')            // 'email'
 */
export function fileNameToTriggerName(filename: string): string {
  return filename.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Convert a trigger name to a binding name.
 *
 * Converts camelCase to SCREAMING_SNAKE_CASE with _TRIGGER suffix.
 *
 * @param triggerName - Trigger name in camelCase
 * @returns Binding name in SCREAMING_SNAKE_CASE
 *
 * @example
 * triggerNameToBindingName('dailyCleanup')   // 'DAILY_CLEANUP_TRIGGER'
 * triggerNameToBindingName('processUploads') // 'PROCESS_UPLOADS_TRIGGER'
 */
export function triggerNameToBindingName(triggerName: string): string {
  const screaming = triggerName
    .replace(/([A-Z])/g, '_$1')
    .toUpperCase()
    .replace(/^_/, '')

  return `${screaming}_TRIGGER`
}

/**
 * Convert a binding name back to a trigger name.
 *
 * @param bindingName - Binding name in SCREAMING_SNAKE_CASE
 * @returns Trigger name in camelCase
 *
 * @example
 * bindingNameToTriggerName('DAILY_CLEANUP_TRIGGER') // 'dailyCleanup'
 */
export function bindingNameToTriggerName(bindingName: string): string {
  // Remove _TRIGGER suffix
  const withoutSuffix = bindingName.replace(/_TRIGGER$/, '')

  // Convert SCREAMING_SNAKE_CASE to camelCase
  return withoutSuffix
    .toLowerCase()
    .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Convert a directory name to a fan-out group name.
 *
 * @param dirname - Directory name (e.g., 'uploads')
 * @returns Group name in camelCase
 *
 * @example
 * directoryNameToFanOutGroup('uploads')       // 'uploads'
 * directoryNameToFanOutGroup('order-events')  // 'orderEvents'
 */
export function directoryNameToFanOutGroup(dirname: string): string {
  return fileNameToTriggerName(dirname)
}

// ============================================================================
// Trigger Scanning
// ============================================================================

/**
 * Create a ScannedTrigger object from a file path.
 *
 * @param filePath - Absolute path to the file
 * @param triggersDir - Root triggers directory for relative path calculation
 * @returns ScannedTrigger object
 */
function createScannedTrigger(
  filePath: string,
  triggersDir: string
): ScannedTrigger {
  const absolutePath = path.resolve(filePath)
  const relativePath = path
    .relative(triggersDir, absolutePath)
    .split(path.sep)
    .join(path.posix.sep)
  const parsed = path.parse(filePath)

  // Check if this is in a subdirectory (fan-out group)
  const relDir = path.dirname(relativePath)
  const fanOutGroup = relDir !== '.' ? directoryNameToFanOutGroup(relDir) : undefined

  return {
    relativePath,
    absolutePath,
    name: parsed.name,
    extension: parsed.ext as SupportedExtension,
    fanOutGroup,
  }
}

/**
 * Scan the triggers directory for all trigger files.
 *
 * Supports both flat files and fan-out subdirectories:
 * - `app/triggers/daily-cleanup.ts` - Single trigger
 * - `app/triggers/uploads/generate-thumbnail.ts` - Fan-out group
 * - `app/triggers/uploads/index-for-search.ts` - Fan-out group
 *
 * @param rootDir - App root directory (should contain triggers/ subdirectory)
 * @param config - Configuration options
 * @returns TriggerScanResult with discovered trigger files
 *
 * @example
 * const result = await scanTriggers('./app', {
 *   extensions: ['.ts', '.tsx'],
 * })
 */
export async function scanTriggers(
  rootDir: string,
  config: Pick<CloudwerkConfig, 'extensions'>
): Promise<TriggerScanResult> {
  const triggersDir = path.resolve(rootDir, TRIGGERS_DIR)
  const extensions = config.extensions.map((ext) => ext.slice(1)).join(',')

  // Build glob pattern for trigger files (includes subdirectories for fan-out)
  const pattern = `**/*.{${extensions}}`

  // Find all matching files
  const files = await fg(pattern, {
    cwd: triggersDir,
    absolute: true,
    onlyFiles: true,
    ignore: [
      '**/*.test.*',
      '**/*.spec.*',
      '**/*.d.ts',
      '**/index.ts',
      '**/index.tsx',
      // Ignore deeply nested files (only support one level of subdirectories)
      '*/*/*/**/*',
    ],
  })

  // Create scanned trigger objects
  const triggers: ScannedTrigger[] = []
  const fanOutGroups = new Map<string, string[]>()

  for (const filePath of files) {
    const parsed = path.parse(filePath)
    if (isTriggerFile(parsed.base)) {
      const scannedTrigger = createScannedTrigger(filePath, triggersDir)
      triggers.push(scannedTrigger)

      // Track fan-out groups
      if (scannedTrigger.fanOutGroup) {
        const group = fanOutGroups.get(scannedTrigger.fanOutGroup) || []
        group.push(scannedTrigger.name)
        fanOutGroups.set(scannedTrigger.fanOutGroup, group)
      }
    }
  }

  return { triggers, fanOutGroups }
}

/**
 * Scan triggers synchronously (for testing or simple use cases).
 *
 * @param rootDir - App root directory (should contain triggers/ subdirectory)
 * @param config - Configuration options
 * @returns TriggerScanResult with discovered trigger files
 */
export function scanTriggersSync(
  rootDir: string,
  config: Pick<CloudwerkConfig, 'extensions'>
): TriggerScanResult {
  const triggersDir = path.resolve(rootDir, TRIGGERS_DIR)
  const extensions = config.extensions.map((ext) => ext.slice(1)).join(',')

  // Build glob pattern for trigger files (includes subdirectories for fan-out)
  const pattern = `**/*.{${extensions}}`

  // Find all matching files
  const files = fg.sync(pattern, {
    cwd: triggersDir,
    absolute: true,
    onlyFiles: true,
    ignore: [
      '**/*.test.*',
      '**/*.spec.*',
      '**/*.d.ts',
      '**/index.ts',
      '**/index.tsx',
      // Ignore deeply nested files (only support one level of subdirectories)
      '*/*/*/**/*',
    ],
  })

  // Create scanned trigger objects
  const triggers: ScannedTrigger[] = []
  const fanOutGroups = new Map<string, string[]>()

  for (const filePath of files) {
    const parsed = path.parse(filePath)
    if (isTriggerFile(parsed.base)) {
      const scannedTrigger = createScannedTrigger(filePath, triggersDir)
      triggers.push(scannedTrigger)

      // Track fan-out groups
      if (scannedTrigger.fanOutGroup) {
        const group = fanOutGroups.get(scannedTrigger.fanOutGroup) || []
        group.push(scannedTrigger.name)
        fanOutGroups.set(scannedTrigger.fanOutGroup, group)
      }
    }
  }

  return { triggers, fanOutGroups }
}
