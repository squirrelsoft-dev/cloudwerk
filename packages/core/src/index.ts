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
  UIConfig,

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

  // Route Config Types
  RouteConfig,
  AuthRequirement,
  RateLimitConfig,
  CacheConfig,

  // Loader Types
  LoaderArgs,
  LoaderFunction,
  InferLoaderData,

  // Action Types
  ActionArgs,
  ActionFunction,
  InferActionData,

  // Error Boundary Types
  ErrorBoundaryProps,
  NotFoundProps,
  ErrorBoundaryComponent,
  NotFoundComponent,

  // Loading Boundary Types
  LoadingProps,
  LoadingComponent,

  // Client Component Types
  ClientComponentInfo,
  ClientComponentMeta,
  HydrationManifest,
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
// Route Config Exports
// ============================================================================

export {
  // Route Config Access (public API)
  getRouteConfig,

  // Route Config Validation (for CLI/internal use)
  validateRouteConfig,

  // Internal constants and functions (for CLI integration)
  // Note: setRouteConfig is intentionally not in public API docs
  // but needs to be exported for internal framework use
  setRouteConfig,
  ROUTE_CONFIG_KEY,
} from './route-config.js'

// ============================================================================
// Error Exports
// ============================================================================

export {
  // Loader Error Classes
  NotFoundError,
  RedirectError,

  // Error Helper Functions
  notFound,
} from './errors.js'

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
  notFoundResponse,
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
