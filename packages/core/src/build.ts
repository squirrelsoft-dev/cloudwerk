/**
 * @cloudwerk/core/build
 *
 * Build-time exports for CLI and build tools.
 * This entry point includes Node.js filesystem dependencies (fast-glob, esbuild)
 * and should NOT be imported in Worker runtime code.
 *
 * @packageDocumentation
 */

// ============================================================================
// Compiler Exports
// ============================================================================

export {
  // Segment Parsing
  parseSegment,
  isRouteGroup,

  // Path Conversion
  filePathToRoutePath,

  // Route Sorting
  calculateRoutePriority,
  sortRoutes,

  // Route Compilation
  compileRoute,
  buildRouteManifest,
} from './compiler.js'

// ============================================================================
// Scanner Exports (uses fast-glob)
// ============================================================================

export {
  // File Type Detection
  getFileType,
  isRouteFile,
  isLayoutFile,
  isMiddlewareFile,

  // Route Group Detection
  extractRouteGroups,
  hasRouteGroups,

  // File Scanning
  scanRoutes,
  scanRoutesSync,
} from './scanner.js'

// ============================================================================
// Resolver Exports
// ============================================================================

export {
  // Path Utilities
  getAncestorDirs,

  // Layout Resolution
  resolveLayouts,
  resolveLayoutsWithGroups,

  // Middleware Resolution
  resolveMiddleware,
  resolveMiddlewareWithGroups,

  // Combined Resolution
  resolveRouteContext,

  // Error Boundary Resolution
  resolveErrorBoundary,
  resolveNotFoundBoundary,

  // Loading Boundary Resolution
  resolveLoadingBoundary,
} from './resolver.js'

// ============================================================================
// Validator Exports
// ============================================================================

export {
  // Single Route Validation
  validateRoute,

  // Conflict Detection
  detectPageRouteConflicts,
  detectShadowedRoutes,

  // Manifest Validation
  validateManifest,
  validateScanResult,

  // Utility Functions
  hasErrors,
  hasWarnings,
  formatErrors,
  formatWarnings,
} from './validator.js'

// ============================================================================
// Boundary Validator Exports
// ============================================================================

export {
  // Validation Functions
  validateServerComponent,
  validateClientComponent,
  validateComponentBoundaries,

  // Formatting Functions
  formatBoundaryError,
  formatBoundaryErrors,

  // Utility Functions
  hasBoundaryErrors,
  hasBoundaryWarnings,

  // Integration Helper
  handleBoundaryValidationResult,
} from './boundary-validator.js'

// ============================================================================
// Configuration Exports (uses esbuild)
// ============================================================================

export {
  // Default Configuration
  DEFAULT_CONFIG,

  // Configuration Definition
  defineConfig,
  mergeConfig,

  // Configuration Loading
  findConfigFile,
  loadConfig,
  loadConfigSync,

  // Configuration Validation
  validateConfig,

  // Configuration Utilities
  resolveRoutesDir,
  resolveRoutesPath,
  isSupportedExtension,
} from './config.js'

// ============================================================================
// Client Component Exports
// ============================================================================

export {
  // Use Client Detection
  hasUseClientDirective,
  generateComponentId,

  // Hydration Manifest
  createHydrationManifest,
  addToHydrationManifest,
  serializeHydrationManifest,

  // Props Serialization
  serializeProps,
  deserializeProps,
} from './client.js'

// ============================================================================
// Build-time Type Exports
// ============================================================================

export type {
  // Route Segment Types
  RouteSegment,
  StaticSegment,
  DynamicSegment,
  CatchAllSegment,
  OptionalCatchAllSegment,

  // File Type Definitions
  RouteFileType,
  SupportedExtension,

  // Route Entry Types
  HttpMethod,
  RouteEntry,

  // Route Manifest Types
  RouteValidationError,
  RouteValidationWarning,
  RouteManifest,

  // Configuration Types
  CloudwerkConfig,
  CloudwerkUserConfig,
  UIConfig,

  // Scanner Types
  ScannedFile,
  ScanResult,

  // Client Component Types
  ClientComponentInfo,
  ClientComponentMeta,
  HydrationManifest,

  // Static Site Generation Types
  GenerateStaticParamsArgs,
  GenerateStaticParamsFunction,

  // Component Boundary Validation Types
  BoundaryValidationType,
  BoundaryValidationIssue,
  BoundaryValidationResult,
  BoundaryValidationOptions,
} from './types.js'

// ============================================================================
// Build-time Constants
// ============================================================================

export {
  SUPPORTED_EXTENSIONS,
  ROUTE_FILE_NAMES,
} from './types.js'

// ============================================================================
// Queue Scanner Exports
// ============================================================================

export {
  // File Detection
  isQueueFile,

  // Name Conversion
  fileNameToQueueName,
  queueNameToBindingName,
  queueNameToCloudflareQueueName,

  // Queue Scanning
  scanQueues,
  scanQueuesSync,

  // Constants
  QUEUES_DIR,
} from './queue-scanner.js'

export type { ScannedQueue, QueueScanResult } from './queue-scanner.js'

// ============================================================================
// Queue Compiler Exports
// ============================================================================

export {
  // Queue Compilation
  compileQueue,
  buildQueueManifest,
  updateQueueEntryFromDefinition,

  // Formatting
  formatQueueErrors,
  formatQueueWarnings,

  // Utilities
  hasQueueErrors,
  hasQueueWarnings,
} from './queue-compiler.js'

export type {
  QueueProcessingConfig,
  QueueEntry,
  QueueValidationError,
  QueueValidationWarning,
  QueueManifest,
  BuildQueueManifestOptions,
} from './queue-compiler.js'
