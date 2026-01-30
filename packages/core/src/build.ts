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

// ============================================================================
// Service Scanner Exports
// ============================================================================

export {
  // File Detection
  isServiceFile,

  // Name Conversion
  directoryNameToServiceName,
  serviceNameToBindingName,
  serviceNameToWorkerName,
  serviceNameToEntrypointClass,

  // Service Scanning
  scanServices,
  scanServicesSync,

  // Constants
  SERVICES_DIR,
  SERVICE_FILE_NAME,
} from './service-scanner.js'

export type { ScannedService, ServiceScanResult } from './service-scanner.js'

// ============================================================================
// Service Compiler Exports
// ============================================================================

export {
  // Service Compilation
  compileService,
  buildServiceManifest,
  updateServiceEntryFromDefinition,
  addServiceWarnings,

  // Formatting
  formatServiceErrors,
  formatServiceWarnings,

  // Utilities
  hasServiceErrors,
  hasServiceWarnings,
} from './service-compiler.js'

export type {
  ServiceMode,
  ServiceProcessingConfig,
  ServiceEntry,
  ServiceValidationError,
  ServiceValidationWarning,
  ServiceManifest,
  BuildServiceManifestOptions,
} from './service-compiler.js'

// ============================================================================
// Durable Object Scanner Exports
// ============================================================================

export {
  // File Detection
  isDurableObjectFile,

  // Name Conversion
  fileNameToObjectName,
  objectNameToBindingName,
  objectNameToClassName,
  bindingNameToObjectName,

  // Durable Object Scanning
  scanDurableObjects,
  scanDurableObjectsSync,

  // Constants
  OBJECTS_DIR,
} from './durable-object-scanner.js'

export type {
  ScannedDurableObject,
  DurableObjectScanResult,
} from './durable-object-scanner.js'

// ============================================================================
// Durable Object Compiler Exports
// ============================================================================

export {
  // Durable Object Compilation
  compileDurableObject,
  buildDurableObjectManifest,
  updateDurableObjectEntryFromDefinition,
  addDurableObjectWarnings,

  // Formatting
  formatDurableObjectErrors,
  formatDurableObjectWarnings,

  // Utilities
  hasDurableObjectErrors,
  hasDurableObjectWarnings,
} from './durable-object-compiler.js'

export type {
  DurableObjectEntry,
  DurableObjectValidationError,
  DurableObjectValidationWarning,
  DurableObjectManifest,
  BuildDurableObjectManifestOptions,
} from './durable-object-compiler.js'

// ============================================================================
// Trigger Scanner Exports
// ============================================================================

export {
  // File Detection
  isTriggerFile,

  // Name Conversion
  fileNameToTriggerName,
  triggerNameToBindingName,
  bindingNameToTriggerName,
  directoryNameToFanOutGroup,

  // Trigger Scanning
  scanTriggers,
  scanTriggersSync,

  // Constants
  TRIGGERS_DIR,
} from './trigger-scanner.js'

export type { ScannedTrigger, TriggerScanResult } from './trigger-scanner.js'

// ============================================================================
// Trigger Compiler Exports
// ============================================================================

export {
  // Trigger Compilation
  compileTrigger,
  buildTriggerManifest,
  updateTriggerEntryFromDefinition,
  addTriggerWarnings,
  populateTriggerGroups,

  // Formatting
  formatTriggerErrors,
  formatTriggerWarnings,

  // Utilities
  hasTriggerErrors,
  hasTriggerWarnings,
  getTriggerSummary,
} from './trigger-compiler.js'

export type {
  TriggerRetryConfig,
  QueueTriggerSource,
  ScheduledTriggerSource,
  R2TriggerSource,
  WebhookTriggerSource,
  EmailTriggerSource,
  D1TriggerSource,
  TailTriggerSource,
  TriggerSource,
  TriggerEntry,
  TriggerErrorCode,
  TriggerWarningCode,
  TriggerValidationError,
  TriggerValidationWarning,
  TriggerManifest,
  BuildTriggerManifestOptions,
} from './trigger-compiler.js'

// ============================================================================
// Auth Scanner Exports
// ============================================================================

export {
  // File Detection
  isAuthFile,
  getAuthFileType,

  // Name Conversion
  fileNameToProviderId,

  // Auth Scanning
  scanAuth,
  scanAuthSync,

  // Utilities
  hasAuthDirectory,

  // Constants
  AUTH_DIR,
  PROVIDERS_DIR,
} from './auth-scanner.js'

export type {
  AuthFileType,
  ScannedAuthFile,
  AuthScanResult,
} from './auth-scanner.js'

// ============================================================================
// Auth Compiler Exports
// ============================================================================

export {
  // Auth Compilation
  compileProviderEntry,
  generateAuthRoutes,
  buildAuthManifest,

  // Module Loading
  loadProviderModule,
  loadConfigModule,
  loadCallbacksModule,
  loadPagesModule,
  loadRBACModule,
  buildAuthManifestWithModules,

  // Utilities
  hasErrors as hasAuthErrors,
  hasWarnings as hasAuthWarnings,
  getManifestSummary as getAuthManifestSummary,

  // Constants
  DEFAULT_BASE_PATH,
  DEFAULT_SESSION_STRATEGY,
} from './auth-compiler.js'

export type {
  AuthProviderEntry,
  AuthRouteEntry,
  AuthPagesConfig,
  AuthValidationError,
  AuthValidationWarning,
  AuthManifest,
} from './auth-compiler.js'
