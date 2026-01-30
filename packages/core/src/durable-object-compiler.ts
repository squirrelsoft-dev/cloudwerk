/**
 * @cloudwerk/core - Durable Object Compiler
 *
 * Compiles scanned durable object files into a DurableObjectManifest.
 */

import * as path from 'node:path'
import type { ScannedDurableObject, DurableObjectScanResult } from './durable-object-scanner.js'
import {
  fileNameToObjectName,
  objectNameToBindingName,
  objectNameToClassName,
} from './durable-object-scanner.js'

// ============================================================================
// Types
// ============================================================================

/**
 * A compiled durable object entry in the manifest.
 */
export interface DurableObjectEntry {
  /** Object name derived from filename (e.g., 'counter', 'chatRoom') */
  name: string

  /** Binding name for wrangler.toml (e.g., 'COUNTER', 'CHAT_ROOM') */
  bindingName: string

  /** Class name for the generated DO class (e.g., 'Counter', 'ChatRoom') */
  className: string

  /** Relative path to the definition file */
  filePath: string

  /** Absolute path to the definition file */
  absolutePath: string

  /** Path to the generated DO class file */
  generatedPath: string

  /** Whether SQLite storage is enabled */
  sqlite: boolean

  /** Whether fetch handler is defined */
  hasFetch: boolean

  /** Whether WebSocket handlers are defined */
  hasWebSocket: boolean

  /** Whether alarm handler is defined */
  hasAlarm: boolean

  /** RPC method names extracted from methods config */
  methodNames: string[]
}

/**
 * Validation error for a durable object definition.
 */
export interface DurableObjectValidationError {
  /** Durable object file path */
  file: string

  /** Error message */
  message: string

  /** Error code for programmatic handling */
  code:
    | 'NO_HANDLER'
    | 'INVALID_CONFIG'
    | 'DUPLICATE_NAME'
    | 'INVALID_NAME'
    | 'INVALID_DEFINITION'
}

/**
 * Validation warning for a durable object definition.
 */
export interface DurableObjectValidationWarning {
  /** Durable object file path */
  file: string

  /** Warning message */
  message: string

  /** Warning code */
  code: 'NO_INIT' | 'NO_METHODS' | 'SQLITE_WITHOUT_INIT'
}

/**
 * Complete durable object manifest generated during build.
 */
export interface DurableObjectManifest {
  /** All compiled durable object entries */
  durableObjects: DurableObjectEntry[]

  /** Validation errors (object won't be registered) */
  errors: DurableObjectValidationError[]

  /** Validation warnings (object will be registered with warning) */
  warnings: DurableObjectValidationWarning[]

  /** When the manifest was generated */
  generatedAt: Date

  /** Root directory of the app */
  rootDir: string
}

/**
 * Options for building the durable object manifest.
 */
export interface BuildDurableObjectManifestOptions {
  /** App name for naming conventions */
  appName?: string

  /** Skip loading modules (for static analysis only) */
  skipModuleLoad?: boolean

  /** Output directory for generated files */
  outputDir?: string
}

// ============================================================================
// Compilation
// ============================================================================

/**
 * Compile a scanned durable object file into a DurableObjectEntry.
 *
 * This creates a basic entry from file information. The actual config
 * values are loaded separately via loadDurableObjectDefinition.
 *
 * @param scannedObject - Scanned durable object file
 * @param outputDir - Directory for generated class files
 * @returns Compiled durable object entry
 */
export function compileDurableObject(
  scannedObject: ScannedDurableObject,
  outputDir: string = '.cloudwerk/generated/objects'
): DurableObjectEntry {
  const name = fileNameToObjectName(scannedObject.name)
  const bindingName = objectNameToBindingName(name)
  const className = objectNameToClassName(name)

  return {
    name,
    bindingName,
    className,
    filePath: scannedObject.relativePath,
    absolutePath: scannedObject.absolutePath,
    generatedPath: path.join(outputDir, `${className}.ts`),
    sqlite: false,
    hasFetch: false,
    hasWebSocket: false,
    hasAlarm: false,
    methodNames: [],
  }
}

/**
 * Validate a durable object name.
 *
 * @param name - Object name to validate
 * @returns Error message if invalid, null if valid
 */
function validateObjectName(name: string): string | null {
  if (name.length === 0) {
    return 'Durable object name cannot be empty'
  }

  // Names should start with lowercase letter
  if (!/^[a-z]/.test(name)) {
    return 'Durable object name must start with a lowercase letter'
  }

  // Names should be camelCase (no hyphens, underscores)
  if (/[-_]/.test(name)) {
    return 'Durable object name should be camelCase (file can be kebab-case)'
  }

  return null
}

/**
 * Build the complete durable object manifest from scan results.
 *
 * @param scanResult - Result from scanDurableObjects()
 * @param rootDir - Root directory of the app
 * @param options - Build options
 * @returns Complete durable object manifest
 */
export function buildDurableObjectManifest(
  scanResult: DurableObjectScanResult,
  rootDir: string,
  options: BuildDurableObjectManifestOptions = {}
): DurableObjectManifest {
  const { outputDir = '.cloudwerk/generated/objects' } = options

  const durableObjects: DurableObjectEntry[] = []
  const errors: DurableObjectValidationError[] = []
  const warnings: DurableObjectValidationWarning[] = []
  const seenNames = new Set<string>()

  for (const scannedObject of scanResult.durableObjects) {
    const entry = compileDurableObject(scannedObject, outputDir)

    // Validate name
    const nameError = validateObjectName(entry.name)
    if (nameError) {
      errors.push({
        file: scannedObject.relativePath,
        message: nameError,
        code: 'INVALID_NAME',
      })
      continue
    }

    // Check for duplicate names
    if (seenNames.has(entry.name)) {
      errors.push({
        file: scannedObject.relativePath,
        message: `Duplicate durable object name '${entry.name}'`,
        code: 'DUPLICATE_NAME',
      })
      continue
    }
    seenNames.add(entry.name)

    durableObjects.push(entry)
  }

  return {
    durableObjects,
    errors,
    warnings,
    generatedAt: new Date(),
    rootDir,
  }
}

/**
 * Update a durable object entry with loaded module information.
 *
 * Call this after dynamically importing the durable object module to fill in
 * config, method names, handler flags, etc.
 *
 * @param entry - Durable object entry to update
 * @param definition - Loaded durable object definition from the module
 * @returns Updated durable object entry
 */
export function updateDurableObjectEntryFromDefinition(
  entry: DurableObjectEntry,
  definition: {
    name?: string
    sqlite?: boolean
    config?: {
      fetch?: unknown
      alarm?: unknown
      webSocketMessage?: unknown
      webSocketClose?: unknown
      webSocketError?: unknown
      methods?: Record<string, unknown>
    }
  }
): DurableObjectEntry {
  const config = definition.config || {}
  const methodNames = config.methods ? Object.keys(config.methods) : []

  return {
    ...entry,
    // Use explicit name if provided
    name: definition.name || entry.name,
    // Update SQLite flag
    sqlite: definition.sqlite ?? false,
    // Set handler flags
    hasFetch: typeof config.fetch === 'function',
    hasAlarm: typeof config.alarm === 'function',
    hasWebSocket:
      typeof config.webSocketMessage === 'function' ||
      typeof config.webSocketClose === 'function' ||
      typeof config.webSocketError === 'function',
    // Extract method names
    methodNames,
  }
}

/**
 * Add warnings for a durable object entry based on its definition.
 *
 * @param entry - Durable object entry
 * @param definition - Loaded durable object definition
 * @param warnings - Array to add warnings to
 */
export function addDurableObjectWarnings(
  entry: DurableObjectEntry,
  definition: {
    sqlite?: boolean
    config?: {
      init?: unknown
      methods?: Record<string, unknown>
    }
  },
  warnings: DurableObjectValidationWarning[]
): void {
  const config = definition.config || {}

  // Warn if no init function
  if (typeof config.init !== 'function') {
    warnings.push({
      file: entry.filePath,
      message: `Durable object '${entry.name}' has no init() function. State will be undefined.`,
      code: 'NO_INIT',
    })
  }

  // Warn if sqlite enabled but no init
  if (definition.sqlite && typeof config.init !== 'function') {
    warnings.push({
      file: entry.filePath,
      message: `Durable object '${entry.name}' has SQLite enabled but no init() to set up tables.`,
      code: 'SQLITE_WITHOUT_INIT',
    })
  }

  // Warn if no methods defined
  const methodCount = config.methods ? Object.keys(config.methods).length : 0
  if (methodCount === 0 && !entry.hasFetch && !entry.hasAlarm && !entry.hasWebSocket) {
    warnings.push({
      file: entry.filePath,
      message: `Durable object '${entry.name}' has no methods or handlers defined.`,
      code: 'NO_METHODS',
    })
  }
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format durable object validation errors for display.
 *
 * @param errors - Validation errors
 * @returns Formatted error string
 */
export function formatDurableObjectErrors(errors: DurableObjectValidationError[]): string {
  if (errors.length === 0) {
    return ''
  }

  const lines = ['Durable object validation errors:']
  for (const error of errors) {
    lines.push(`  - ${error.file}: ${error.message}`)
  }
  return lines.join('\n')
}

/**
 * Format durable object validation warnings for display.
 *
 * @param warnings - Validation warnings
 * @returns Formatted warning string
 */
export function formatDurableObjectWarnings(
  warnings: DurableObjectValidationWarning[]
): string {
  if (warnings.length === 0) {
    return ''
  }

  const lines = ['Durable object validation warnings:']
  for (const warning of warnings) {
    lines.push(`  - ${warning.file}: ${warning.message}`)
  }
  return lines.join('\n')
}

/**
 * Check if the manifest has errors.
 *
 * @param manifest - Durable object manifest
 * @returns true if there are errors
 */
export function hasDurableObjectErrors(manifest: DurableObjectManifest): boolean {
  return manifest.errors.length > 0
}

/**
 * Check if the manifest has warnings.
 *
 * @param manifest - Durable object manifest
 * @returns true if there are warnings
 */
export function hasDurableObjectWarnings(manifest: DurableObjectManifest): boolean {
  return manifest.warnings.length > 0
}
