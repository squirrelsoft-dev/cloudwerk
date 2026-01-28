/**
 * @cloudwerk/core/runtime
 *
 * Runtime-only exports for Cloudflare Workers.
 * This entry point excludes build-time dependencies (fast-glob, esbuild)
 * to minimize Worker bundle size.
 *
 * @packageDocumentation
 */

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

// ============================================================================
// Runtime Type Exports
// ============================================================================

export type {
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

  // Middleware Types
  Middleware,
  LoadedMiddlewareModule,

  // Route Config Types
  RouteConfig,
  RenderingMode,
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
} from './types.js'
