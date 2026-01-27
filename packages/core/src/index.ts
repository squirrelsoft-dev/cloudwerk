/**
 * @cloudwerk/core
 *
 * File-based routing, middleware, and configuration for Cloudwerk.
 *
 * @packageDocumentation
 */

// ============================================================================
// Type Exports
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

  // Handler Types
  PageProps,
  LayoutProps,
  RouteContext,
  RouteHandler,
  PageComponent,
  LayoutComponent,

  // Cloudwerk Native Handler Types
  CloudwerkHandler,
  CloudwerkHandlerContext,

  // Context Types
  CloudwerkContext,
  ExecutionContext,

  // Scanner Types
  ScannedFile,
  ScanResult,

  // Middleware Types
  Middleware,
  LoadedMiddlewareModule,
} from './types.js'

export {
  SUPPORTED_EXTENSIONS,
  ROUTE_FILE_NAMES,
} from './types.js'

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
// Scanner Exports
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
// Configuration Exports
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
  isSupportedExtension,
} from './config.js'

// ============================================================================
// Context Exports
// ============================================================================

export {
  // Context Access
  getContext,

  // Handler Adapter
  createHandlerAdapter,

  // Internal (for middleware integration)
  runWithContext,
  createContext,
  contextMiddleware,
} from './context.js'

// ============================================================================
// Middleware Exports
// ============================================================================

export {
  // Middleware Adapter
  createMiddlewareAdapter,
} from './middleware.js'

// ============================================================================
// Response Helper Exports
// ============================================================================

export {
  // Re-exported from Hono
  Hono,
  type Context,
  type MiddlewareHandler,
  type Next,

  // JSON Response Helpers
  json,
  created,
  noContent,

  // Redirect Helpers
  redirect,
  permanentRedirect,

  // HTML Response Helpers
  html,

  // Error Response Helpers
  notFound,
  badRequest,
  unauthorized,
  forbidden,
  serverError,
  validationError,

  // Stream Response Helpers
  stream,
  sse,

  // Text Response Helpers
  text,

  // Cache Control Helpers
  withCache,
  noCache,
} from './helpers.js'
