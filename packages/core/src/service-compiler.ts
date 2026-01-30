/**
 * @cloudwerk/core - Service Compiler
 *
 * Compiles scanned service files into a ServiceManifest.
 */

import type { ScannedService, ServiceScanResult } from './service-scanner.js'
import {
  directoryNameToServiceName,
  serviceNameToBindingName,
  serviceNameToWorkerName,
  serviceNameToEntrypointClass,
} from './service-scanner.js'

// ============================================================================
// Types
// ============================================================================

/**
 * Extraction mode for a service.
 */
export type ServiceMode = 'local' | 'extracted'

/**
 * Processing configuration for a service.
 */
export interface ServiceProcessingConfig {
  extraction?: {
    workerName?: string
    bindings?: string[]
  }
}

/**
 * A compiled service entry in the manifest.
 */
export interface ServiceEntry {
  /** Service name derived from directory (e.g., 'email', 'userManagement') */
  name: string

  /** Binding name for wrangler.toml (e.g., 'EMAIL_SERVICE') */
  bindingName: string

  /** Worker name when extracted (e.g., 'email-service') */
  workerName: string

  /** Entrypoint class name for WorkerEntrypoint (e.g., 'EmailService') */
  entrypointClass: string

  /** Relative path to the service definition file */
  filePath: string

  /** Absolute path to the service definition file */
  absolutePath: string

  /** Current extraction mode */
  mode: ServiceMode

  /** List of method names exposed by this service */
  methodNames: string[]

  /** Bindings required by this service */
  requiredBindings: string[]

  /** Whether hooks are defined */
  hasHooks: boolean
}

/**
 * Validation error for a service definition.
 */
export interface ServiceValidationError {
  /** Service file path */
  file: string

  /** Error message */
  message: string

  /** Error code for programmatic handling */
  code:
    | 'NO_METHODS'
    | 'INVALID_CONFIG'
    | 'DUPLICATE_NAME'
    | 'INVALID_NAME'
    | 'INVALID_METHOD'
}

/**
 * Validation warning for a service definition.
 */
export interface ServiceValidationWarning {
  /** Service file path */
  file: string

  /** Warning message */
  message: string

  /** Warning code */
  code: 'NO_HOOKS' | 'MISSING_BINDINGS' | 'EMPTY_METHODS'
}

/**
 * Complete service manifest generated during build.
 */
export interface ServiceManifest {
  /** All compiled service entries */
  services: ServiceEntry[]

  /** Validation errors (service won't be registered) */
  errors: ServiceValidationError[]

  /** Validation warnings (service will be registered with warning) */
  warnings: ServiceValidationWarning[]

  /** When the manifest was generated */
  generatedAt: Date

  /** Root directory of the app */
  rootDir: string
}

/**
 * Options for building the service manifest.
 */
export interface BuildServiceManifestOptions {
  /** Default mode for all services */
  defaultMode?: ServiceMode

  /** Per-service mode overrides */
  serviceModes?: Record<string, ServiceMode>

  /** Skip loading service modules (for static analysis only) */
  skipModuleLoad?: boolean
}

// ============================================================================
// Compilation
// ============================================================================

/**
 * Compile a scanned service file into a ServiceEntry.
 *
 * This creates a basic entry from file information. The actual config
 * values are loaded separately via loadServiceDefinition.
 *
 * @param scannedService - Scanned service file
 * @param mode - Extraction mode for this service
 * @returns Compiled service entry
 */
export function compileService(
  scannedService: ScannedService,
  mode: ServiceMode = 'local'
): ServiceEntry {
  const name = scannedService.name
  const bindingName = serviceNameToBindingName(name)
  const workerName = serviceNameToWorkerName(name)
  const entrypointClass = serviceNameToEntrypointClass(name)

  return {
    name,
    bindingName,
    workerName,
    entrypointClass,
    filePath: scannedService.relativePath,
    absolutePath: scannedService.absolutePath,
    mode,
    methodNames: [],
    requiredBindings: [],
    hasHooks: false,
  }
}

/**
 * Validate a service name.
 *
 * @param name - Service name to validate
 * @returns Error message if invalid, null if valid
 */
function validateServiceName(name: string): string | null {
  if (name.length === 0) {
    return 'Service name cannot be empty'
  }

  // Names should start with lowercase letter
  if (!/^[a-z]/.test(name)) {
    return 'Service name must start with a lowercase letter'
  }

  // Names should be camelCase (converted from kebab-case directory)
  if (/-/.test(name)) {
    return 'Service name should be camelCase (directory can be kebab-case)'
  }

  return null
}

/**
 * Build the complete service manifest from scan results.
 *
 * @param scanResult - Result from scanServices()
 * @param rootDir - Root directory of the app
 * @param options - Build options
 * @returns Complete service manifest
 */
export function buildServiceManifest(
  scanResult: ServiceScanResult,
  rootDir: string,
  options: BuildServiceManifestOptions = {}
): ServiceManifest {
  const { defaultMode = 'local', serviceModes = {} } = options

  const services: ServiceEntry[] = []
  const errors: ServiceValidationError[] = []
  const warnings: ServiceValidationWarning[] = []
  const seenNames = new Set<string>()

  for (const scannedService of scanResult.services) {
    // Determine mode for this service
    const mode = serviceModes[scannedService.name] ?? defaultMode

    const entry = compileService(scannedService, mode)

    // Validate name
    const nameError = validateServiceName(entry.name)
    if (nameError) {
      errors.push({
        file: scannedService.relativePath,
        message: nameError,
        code: 'INVALID_NAME',
      })
      continue
    }

    // Check for duplicate names
    if (seenNames.has(entry.name)) {
      errors.push({
        file: scannedService.relativePath,
        message: `Duplicate service name '${entry.name}'`,
        code: 'DUPLICATE_NAME',
      })
      continue
    }
    seenNames.add(entry.name)

    services.push(entry)
  }

  return {
    services,
    errors,
    warnings,
    generatedAt: new Date(),
    rootDir,
  }
}

/**
 * Update a service entry with loaded module information.
 *
 * Call this after dynamically importing the service module to fill in
 * methodNames, hasHooks, requiredBindings, etc.
 *
 * @param entry - Service entry to update
 * @param definition - Loaded service definition from the module
 * @returns Updated service entry
 */
export function updateServiceEntryFromDefinition(
  entry: ServiceEntry,
  definition: {
    name?: string
    methods?: Record<string, unknown>
    hooks?: {
      onInit?: unknown
      onBefore?: unknown
      onAfter?: unknown
      onError?: unknown
    }
    config?: ServiceProcessingConfig
  }
): ServiceEntry {
  // Extract method names
  const methodNames = definition.methods
    ? Object.keys(definition.methods).filter(
        (key) => typeof definition.methods![key] === 'function'
      )
    : []

  // Check if any hooks are defined
  const hasHooks = Boolean(
    definition.hooks?.onInit ||
      definition.hooks?.onBefore ||
      definition.hooks?.onAfter ||
      definition.hooks?.onError
  )

  // Extract required bindings
  const requiredBindings = definition.config?.extraction?.bindings ?? []

  // Get worker name from config or derive from service name
  const workerName =
    definition.config?.extraction?.workerName ??
    serviceNameToWorkerName(definition.name ?? entry.name)

  return {
    ...entry,
    // Use explicit name if provided
    name: definition.name ?? entry.name,
    workerName,
    methodNames,
    requiredBindings,
    hasHooks,
  }
}

/**
 * Add validation warnings based on service entry state.
 *
 * Call this after updateServiceEntryFromDefinition to add appropriate warnings.
 *
 * @param entry - Service entry to check
 * @param warnings - Warnings array to append to
 */
export function addServiceWarnings(
  entry: ServiceEntry,
  warnings: ServiceValidationWarning[]
): void {
  // Warn if no methods
  if (entry.methodNames.length === 0) {
    warnings.push({
      file: entry.filePath,
      message: `Service '${entry.name}' has no methods defined`,
      code: 'EMPTY_METHODS',
    })
  }

  // Warn if no hooks for extracted services
  if (entry.mode === 'extracted' && !entry.hasHooks) {
    warnings.push({
      file: entry.filePath,
      message: `Extracted service '${entry.name}' has no lifecycle hooks (consider adding for observability)`,
      code: 'NO_HOOKS',
    })
  }

  // Warn if extracted but no bindings specified
  if (entry.mode === 'extracted' && entry.requiredBindings.length === 0) {
    warnings.push({
      file: entry.filePath,
      message: `Extracted service '${entry.name}' has no bindings specified (will only have access to standard APIs)`,
      code: 'MISSING_BINDINGS',
    })
  }
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format service validation errors for display.
 *
 * @param errors - Validation errors
 * @returns Formatted error string
 */
export function formatServiceErrors(errors: ServiceValidationError[]): string {
  if (errors.length === 0) {
    return ''
  }

  const lines = ['Service validation errors:']
  for (const error of errors) {
    lines.push(`  - ${error.file}: ${error.message}`)
  }
  return lines.join('\n')
}

/**
 * Format service validation warnings for display.
 *
 * @param warnings - Validation warnings
 * @returns Formatted warning string
 */
export function formatServiceWarnings(
  warnings: ServiceValidationWarning[]
): string {
  if (warnings.length === 0) {
    return ''
  }

  const lines = ['Service validation warnings:']
  for (const warning of warnings) {
    lines.push(`  - ${warning.file}: ${warning.message}`)
  }
  return lines.join('\n')
}

/**
 * Check if the manifest has errors.
 *
 * @param manifest - Service manifest
 * @returns true if there are errors
 */
export function hasServiceErrors(manifest: ServiceManifest): boolean {
  return manifest.errors.length > 0
}

/**
 * Check if the manifest has warnings.
 *
 * @param manifest - Service manifest
 * @returns true if there are warnings
 */
export function hasServiceWarnings(manifest: ServiceManifest): boolean {
  return manifest.warnings.length > 0
}
