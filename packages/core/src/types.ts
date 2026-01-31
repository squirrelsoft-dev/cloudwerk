/**
 * @cloudwerk/core - Type Definitions
 *
 * Core types for the file-based route compiler.
 */

import type { Context as HonoContext, MiddlewareHandler } from 'hono'
import type { UserConfig as ViteUserConfig } from 'vite'

// Re-export Context for backward compatibility
type Context = HonoContext

// ============================================================================
// Route Segment Types
// ============================================================================

/**
 * Represents a static route segment (e.g., "about", "users")
 */
export interface StaticSegment {
  type: 'static'
  value: string
}

/**
 * Represents a dynamic route segment (e.g., "[id]" -> ":id")
 */
export interface DynamicSegment {
  type: 'dynamic'
  name: string
}

/**
 * Represents a catch-all route segment (e.g., "[...path]" -> "*path")
 */
export interface CatchAllSegment {
  type: 'catchAll'
  name: string
}

/**
 * Represents an optional catch-all route segment (e.g., "[[...cat]]" -> ":cat*")
 */
export interface OptionalCatchAllSegment {
  type: 'optionalCatchAll'
  name: string
}

/**
 * Union type for all route segment types
 */
export type RouteSegment =
  | StaticSegment
  | DynamicSegment
  | CatchAllSegment
  | OptionalCatchAllSegment

// ============================================================================
// File Type Definitions
// ============================================================================

/**
 * Supported route file types
 */
export type RouteFileType =
  | 'page'      // page.tsx, page.ts - UI routes
  | 'route'     // route.ts - API routes
  | 'layout'    // layout.tsx - Shared layouts
  | 'middleware' // middleware.ts - Route middleware
  | 'loading'   // loading.tsx - Loading states
  | 'error'     // error.tsx - Error boundaries
  | 'not-found' // not-found.tsx - 404 pages

/**
 * File extensions we support
 */
export const SUPPORTED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'] as const
export type SupportedExtension = typeof SUPPORTED_EXTENSIONS[number]

/**
 * Route file names we recognize
 */
export const ROUTE_FILE_NAMES = [
  'page',
  'route',
  'layout',
  'middleware',
  'loading',
  'error',
  'not-found',
] as const

// ============================================================================
// Route Entry Types
// ============================================================================

/**
 * HTTP methods supported for route handlers
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD'

/**
 * Represents a single route entry in the manifest
 */
export interface RouteEntry {
  /** The URL pattern for Hono (e.g., "/users/:id") */
  urlPattern: string

  /** Original file path relative to routes directory */
  filePath: string

  /** Absolute file path for importing */
  absolutePath: string

  /** Type of route file */
  fileType: RouteFileType

  /** Parsed route segments */
  segments: RouteSegment[]

  /** HTTP methods this route handles (for route.ts files) */
  methods?: HttpMethod[]

  /** Layout files that wrap this route (in order from root to closest) */
  layouts: string[]

  /** Middleware files that apply to this route (in order from root to closest) */
  middleware: string[]

  /** Priority for route sorting (lower = higher priority) */
  priority: number

  /** Route configuration (auth, rate limiting, caching, custom metadata) */
  config?: RouteConfig

  /** Closest error boundary for this route (absolute path) */
  errorBoundary?: string

  /** Closest not-found boundary for this route (absolute path) */
  notFoundBoundary?: string
}

// ============================================================================
// Route Manifest Types
// ============================================================================

/**
 * Validation error for routes
 */
export interface RouteValidationError {
  /** Type of validation error */
  type: 'conflict' | 'invalid-segment' | 'missing-file' | 'invalid-pattern'

  /** Human-readable error message */
  message: string

  /** File path(s) involved in the error */
  files: string[]
}

/**
 * Validation warning for routes (non-blocking)
 */
export interface RouteValidationWarning {
  /** Type of warning */
  type: 'unused-layout' | 'deep-nesting' | 'naming-convention'

  /** Human-readable warning message */
  message: string

  /** File path(s) involved in the warning */
  files: string[]
}

// ============================================================================
// Component Boundary Validation Types
// ============================================================================

/**
 * Type of component boundary validation issue.
 */
export type BoundaryValidationType =
  | 'client-hook-in-server'      // useState, useEffect, etc. in Server Component
  | 'browser-api-in-server'       // window, document, localStorage in Server Component
  | 'missing-use-client'          // hooks used without 'use client' directive
  | 'non-serializable-props'      // function/class props to Client Component
  | 'server-import-in-client'     // importing Server Component from Client Component
  | 'large-client-dependency'     // warning: large bundle size

/**
 * A component boundary validation issue (error or warning).
 */
export interface BoundaryValidationIssue {
  /** Type of boundary violation */
  type: BoundaryValidationType
  /** Whether this blocks the build (error) or is informational (warning) */
  severity: 'error' | 'warning'
  /** Human-readable error message */
  message: string
  /** File path where the issue was found */
  filePath: string
  /** Location in the source code */
  location?: {
    line: number
    column: number
  }
  /** Code snippet showing the violation */
  codeSnippet?: string
  /** Suggestion for how to fix the issue */
  suggestion?: string
}

/**
 * Result of validating component boundaries.
 */
export interface BoundaryValidationResult {
  /** Whether the component passed all validation (no errors, warnings OK) */
  isValid: boolean
  /** List of validation issues found */
  issues: BoundaryValidationIssue[]
}

/**
 * Options for boundary validation.
 */
export interface BoundaryValidationOptions {
  /** Whether to perform strict validation (fail on any issue) */
  strict?: boolean
  /** Whether to check for large client dependencies */
  checkBundleSize?: boolean
}

/**
 * The complete route manifest generated by the compiler
 */
export interface RouteManifest {
  /** All discovered route entries, sorted by priority */
  routes: RouteEntry[]

  /** All layout files discovered */
  layouts: Map<string, string>

  /** All middleware files discovered */
  middleware: Map<string, string>

  /** All error boundary files discovered (directory path -> absolute path) */
  errorBoundaries: Map<string, string>

  /** All not-found boundary files discovered (directory path -> absolute path) */
  notFoundBoundaries: Map<string, string>

  /** Validation errors that prevent building */
  errors: RouteValidationError[]

  /** Validation warnings (non-blocking) */
  warnings: RouteValidationWarning[]

  /** Timestamp when manifest was generated */
  generatedAt: Date

  /** Root directory that was scanned */
  rootDir: string
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * UI renderer configuration.
 */
export interface UIConfig {
  /**
   * Which renderer to use for JSX components.
   * @default 'hono-jsx'
   */
  renderer?: 'hono-jsx' | 'react' | 'preact'
}

/**
 * Configuration options for the route compiler
 */
export interface CloudwerkConfig {
  /** Directory containing application files (default: "app") */
  appDir: string

  /** Directory containing route files (default: "app") */
  routesDir: string

  /** Directory for static assets served at root (default: "public") */
  publicDir: string

  /** File extensions to scan (default: ['.ts', '.tsx']) */
  extensions: SupportedExtension[]

  /** Whether to enable strict validation (default: true) */
  strict: boolean

  /** Custom middleware to apply to all routes */
  globalMiddleware?: MiddlewareHandler[]

  /** Base path for all routes (default: "/") */
  basePath: string

  /** Whether to enable debug logging (default: false) */
  debug: boolean

  /**
   * UI renderer configuration.
   */
  ui?: UIConfig

  /**
   * Vite configuration to merge with the default Cloudwerk Vite config.
   * Use this to add custom Vite plugins, configure build options, etc.
   *
   * @example
   * ```typescript
   * import { defineConfig } from '@cloudwerk/core'
   * import tailwindcss from '@tailwindcss/vite'
   *
   * export default defineConfig({
   *   vite: {
   *     plugins: [tailwindcss()],
   *   },
   * })
   * ```
   */
  vite?: ViteUserConfig
}

/**
 * Partial config for user-provided options
 */
export type CloudwerkUserConfig = Partial<CloudwerkConfig>

// ============================================================================
// Handler Types
// ============================================================================

/**
 * Page component props
 *
 * @typeParam TParams - Route parameters type (inferred from dynamic segments)
 * @typeParam TActionData - Action data type (from action function return)
 */
export interface PageProps<
  TParams = Record<string, string>,
  TActionData = unknown
> {
  params: TParams
  searchParams: Record<string, string | string[] | undefined>
  /**
   * Data returned from the action function (present after form submission).
   * This is undefined on GET requests and only populated when an action
   * returns data (not a Response).
   */
  actionData?: TActionData
}

/**
 * Layout component props
 */
export interface LayoutProps<TParams = Record<string, string>> {
  children: unknown
  params: TParams
}

/**
 * Route handler context (extends Hono context)
 * @deprecated Use CloudwerkHandlerContext with CloudwerkHandler instead.
 * This type will be removed in a future version.
 */
export type RouteContext<TParams = Record<string, string>> = Context & {
  req: {
    param: () => TParams
  }
}

/**
 * Route handler function signature
 * @deprecated Use CloudwerkHandler instead, which provides a cleaner signature:
 * `(request: Request, context: CloudwerkHandlerContext) => Response`
 * This type will be removed in a future version.
 */
export type RouteHandler<TParams = Record<string, string>> = (
  c: RouteContext<TParams>
) => Response | Promise<Response>

// ============================================================================
// Cloudwerk Native Handler Types
// ============================================================================

/**
 * Handler context passed directly to route handlers.
 * Use getContext() for full context including env and executionCtx.
 */
export interface CloudwerkHandlerContext<TParams = Record<string, string>> {
  /** Route parameters from dynamic segments */
  params: TParams
}

/**
 * Cloudwerk-native route handler signature.
 *
 * **Important**: Both parameters must be declared for automatic detection.
 * Use `_context` if the context parameter is unused.
 *
 * @example
 * // With params
 * export function GET(request: Request, { params }: CloudwerkHandlerContext<{ id: string }>) {
 *   return json({ userId: params.id })
 * }
 *
 * @example
 * // Without params (still need second parameter for detection)
 * export function GET(request: Request, _context: CloudwerkHandlerContext) {
 *   return new Response('Hello Cloudwerk')
 * }
 *
 * @example
 * // Accessing env and request together
 * export function GET(request: Request, context: CloudwerkHandlerContext<{ id: string }>) {
 *   const { id } = context.params
 *   const { env } = getContext<MyEnv>()
 *   return json({ userId: id })
 * }
 */
export type CloudwerkHandler<TParams = Record<string, string>> = (
  request: Request,
  context: CloudwerkHandlerContext<TParams>
) => Response | Promise<Response>

/**
 * Page component signature
 */
export type PageComponent<TParams = Record<string, string>> = (
  props: PageProps<TParams>
) => unknown | Promise<unknown>

/**
 * Layout component signature
 */
export type LayoutComponent<TParams = Record<string, string>> = (
  props: LayoutProps<TParams>
) => unknown | Promise<unknown>

// ============================================================================
// Error Boundary Types
// ============================================================================

/**
 * Props passed to error boundary components.
 *
 * Error boundaries are used to catch and display errors from loaders, actions,
 * and component rendering. They receive the error, its source, and contextual
 * information about the route.
 *
 * @example
 * ```typescript
 * // app/error.tsx
 * import type { ErrorBoundaryProps } from '@cloudwerk/core'
 *
 * export default function ErrorBoundary({
 *   error,
 *   errorType,
 *   reset,
 *   params,
 * }: ErrorBoundaryProps) {
 *   return (
 *     <div>
 *       <h1>Something went wrong!</h1>
 *       <p>{error.message}</p>
 *       {error.digest && <p>Error ID: {error.digest}</p>}
 *       <p>Error source: {errorType}</p>
 *     </div>
 *   )
 * }
 * ```
 */
export interface ErrorBoundaryProps<TParams = Record<string, string>> {
  /** The error that was thrown */
  error: Error & {
    /** Hash for matching server logs in production */
    digest?: string
  }
  /** Error source for custom handling */
  errorType: 'loader' | 'action' | 'render' | 'unknown'
  /**
   * Attempt to recover from the error.
   * Note: On server-side rendering, this is a no-op function.
   */
  reset: () => void
  /** Route parameters */
  params: TParams
  /** URL search parameters */
  searchParams: Record<string, string | string[] | undefined>
}

/**
 * Props passed to not-found boundary components.
 *
 * Not-found boundaries are rendered when a NotFoundError is thrown from a
 * loader or action, or when notFound() is called.
 *
 * @example
 * ```typescript
 * // app/not-found.tsx
 * import type { NotFoundProps } from '@cloudwerk/core'
 *
 * export default function NotFound({ params }: NotFoundProps) {
 *   return (
 *     <div>
 *       <h1>404 - Not Found</h1>
 *       <p>The requested resource could not be found.</p>
 *     </div>
 *   )
 * }
 * ```
 */
export interface NotFoundProps<TParams = Record<string, string>> {
  /** Route parameters */
  params: TParams
  /** URL search parameters */
  searchParams: Record<string, string | string[] | undefined>
}

/**
 * Error boundary component signature.
 *
 * Error boundary components are rendered when errors occur in loaders,
 * actions, or during component rendering.
 */
export type ErrorBoundaryComponent<TParams = Record<string, string>> = (
  props: ErrorBoundaryProps<TParams>
) => unknown | Promise<unknown>

/**
 * Not-found boundary component signature.
 *
 * Not-found boundary components are rendered when NotFoundError is thrown
 * or notFound() is called.
 */
export type NotFoundComponent<TParams = Record<string, string>> = (
  props: NotFoundProps<TParams>
) => unknown | Promise<unknown>

// ============================================================================
// Context Types
// ============================================================================

/**
 * Cloudflare Workers execution context
 */
export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void
  passThroughOnException(): void
}

/**
 * Request-scoped context accessible via getContext()
 */
export interface CloudwerkContext<Env = Record<string, unknown>> {
  /** Original request object */
  request: Request

  /** Cloudflare bindings (D1, KV, R2, etc.) */
  env: Env

  /** Cloudflare execution context for waitUntil */
  executionCtx: ExecutionContext

  /** Route parameters from dynamic segments */
  params: Record<string, string>

  /** Auto-generated request ID for tracing */
  requestId: string

  /** Get middleware-set data */
  get<T>(key: string): T | undefined

  /** Set data for downstream code */
  set<T>(key: string, value: T): void
}

// ============================================================================
// Scanner Types
// ============================================================================

/**
 * Represents a scanned file from the filesystem
 */
export interface ScannedFile {
  /** Relative path from routes directory */
  relativePath: string

  /** Absolute path on filesystem */
  absolutePath: string

  /** File name without extension */
  name: string

  /** File extension */
  extension: SupportedExtension

  /** Detected file type */
  fileType: RouteFileType | null

  /** Whether this is inside a route group (parentheses folder) */
  isInGroup: boolean

  /** Route groups this file is nested under */
  groups: string[]
}

/**
 * Result of scanning the routes directory
 */
export interface ScanResult {
  /** All route files (page.tsx, route.ts) */
  routes: ScannedFile[]

  /** All layout files */
  layouts: ScannedFile[]

  /** All middleware files */
  middleware: ScannedFile[]

  /** All loading state files */
  loading: ScannedFile[]

  /** All error boundary files */
  errors: ScannedFile[]

  /** All not-found files */
  notFound: ScannedFile[]
}

// ============================================================================
// Middleware Types
// ============================================================================

/**
 * Cloudwerk-native middleware signature.
 *
 * Middleware receives the raw Request object and a next() function that
 * returns the downstream Response. Context data can be accessed and modified
 * via getContext().
 *
 * @example
 * ```typescript
 * import type { Middleware } from '@cloudwerk/core'
 * import { getContext, redirect } from '@cloudwerk/core'
 *
 * // Auth middleware that checks session and sets user data
 * export const middleware: Middleware = async (request, next) => {
 *   const ctx = getContext()
 *   const session = await getSession(request)
 *
 *   if (!session) {
 *     return redirect('/login')
 *   }
 *
 *   ctx.set('user', session.user)
 *   return next()
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Timing middleware that adds headers
 * export const middleware: Middleware = async (request, next) => {
 *   const start = Date.now()
 *   const response = await next()
 *
 *   // Modify response headers
 *   const duration = Date.now() - start
 *   response.headers.set('X-Response-Time', `${duration}ms`)
 *
 *   return response
 * }
 * ```
 */
export type Middleware = (
  request: Request,
  next: () => Promise<Response>
) => Response | Promise<Response>

/**
 * Module exports for middleware files.
 * Supports both default export and named 'middleware' export.
 *
 * @example
 * ```typescript
 * // Default export
 * export default async function (request, next) {
 *   return next()
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Named export
 * export const middleware = async (request, next) => {
 *   return next()
 * }
 * ```
 */
export interface LoadedMiddlewareModule {
  /** Default export middleware function */
  default?: Middleware
  /** Named 'middleware' export */
  middleware?: Middleware
}

// ============================================================================
// Route Config Types
// ============================================================================

/**
 * Authentication requirement for a route.
 *
 * - `'required'`: Request must be authenticated
 * - `'optional'`: Authentication is checked but not required
 * - `'none'`: No authentication required
 */
export type AuthRequirement = 'required' | 'optional' | 'none'

/**
 * Rate limit configuration.
 *
 * Can be a shorthand string like `'100/1m'` (100 requests per minute)
 * or an object with explicit configuration.
 *
 * @example
 * // Shorthand: "requests/window"
 * rateLimit: '100/1m'
 *
 * @example
 * // Object form
 * rateLimit: { requests: 100, window: '1m' }
 */
export type RateLimitConfig = string | {
  /** Maximum number of requests allowed */
  requests: number
  /** Time window: '1m', '1h', '1d' */
  window: string
}

/**
 * Cache configuration.
 *
 * Can be a shorthand string or an object with explicit configuration.
 *
 * @example
 * // Shorthand strings
 * cache: 'public'   // Cache-Control: public
 * cache: 'private'  // Cache-Control: private
 * cache: 'no-store' // Cache-Control: no-store
 *
 * @example
 * // Object form with max-age
 * cache: { maxAge: 3600, staleWhileRevalidate: 60 }
 */
export type CacheConfig = 'public' | 'private' | 'no-store' | {
  /** Max age in seconds */
  maxAge: number
  /** Stale-while-revalidate in seconds */
  staleWhileRevalidate?: number
}

/**
 * Rendering mode for a route.
 *
 * - `'ssr'`: Server-side rendering (default). Page is rendered on each request.
 * - `'static'`: Static site generation. Page is pre-rendered at build time.
 */
export type RenderingMode = 'ssr' | 'static'

/**
 * Route configuration object exported from route files.
 *
 * Allows declarative route-level configuration for auth, rate limiting,
 * caching, and custom metadata that middleware/plugins can access.
 *
 * @example
 * // In a route.ts file
 * import type { RouteConfig } from '@cloudwerk/core'
 *
 * export const config: RouteConfig = {
 *   auth: 'required',
 *   rateLimit: '100/1m',
 *   cache: 'private',
 * }
 *
 * export function GET(request: Request, context) {
 *   // Handler code
 * }
 *
 * @example
 * // Static page with SSG
 * import type { RouteConfig } from '@cloudwerk/core'
 *
 * export const config: RouteConfig = {
 *   rendering: 'static',
 * }
 *
 * export default function AboutPage() {
 *   return <h1>About Us</h1>
 * }
 */
export interface RouteConfig {
  /** Authentication requirement */
  auth?: AuthRequirement

  /** Rate limiting configuration */
  rateLimit?: RateLimitConfig

  /** Caching configuration */
  cache?: CacheConfig

  /**
   * Rendering mode for this route.
   * - `'ssr'`: Server-side rendering (default). Page is rendered on each request.
   * - `'static'`: Static site generation. Page is pre-rendered at build time.
   * @default 'ssr'
   */
  rendering?: RenderingMode

  /**
   * Whether to enable streaming for this route.
   * When true (default when loading.tsx exists), loading UI is sent immediately
   * while loaders execute in the background.
   * Set to false to disable streaming and wait for all loaders to complete.
   * @default true (when loading.tsx exists)
   */
  streaming?: boolean

  /** Custom metadata (for plugins/middleware) */
  [key: string]: unknown
}

// ============================================================================
// Loader Types
// ============================================================================

/**
 * Arguments passed to loader functions.
 *
 * Loaders receive route params, the raw request, and the Hono context
 * which provides access to cookies, headers, environment variables,
 * and middleware-set values.
 *
 * @example
 * ```typescript
 * import type { LoaderArgs } from '@cloudwerk/core'
 *
 * export async function loader({ params, request, context }: LoaderArgs<{ id: string }>) {
 *   // Access route params
 *   const userId = params.id
 *
 *   // Access cookies
 *   const session = context.req.cookie('session')
 *
 *   // Access environment variables (Cloudflare bindings)
 *   const db = context.env.DB
 *
 *   // Access middleware-set values
 *   const user = context.get('user')
 *
 *   return { userId, user }
 * }
 * ```
 */
export interface LoaderArgs<TParams = Record<string, string>> {
  /** Route parameters from dynamic segments */
  params: TParams

  /** The raw Request object */
  request: Request

  /**
   * Hono context for accessing cookies, headers, env, and middleware state.
   *
   * Common uses:
   * - `context.req.cookie('name')` - Read cookies
   * - `context.header('Cache-Control', '...')` - Set response headers
   * - `context.env.DB` - Access Cloudflare bindings
   * - `context.get('key')` - Read middleware-set values
   */
  context: HonoContext
}

/**
 * Loader function signature for server-side data loading.
 *
 * Loaders run before component rendering and provide data as props.
 * They can return data synchronously or asynchronously.
 *
 * Special behaviors:
 * - Throw `NotFoundError` to return a 404 response
 * - Throw `RedirectError` to redirect to another URL
 * - Other thrown errors will propagate and return 500
 *
 * @example
 * ```typescript
 * import type { LoaderFunction } from '@cloudwerk/core'
 * import { NotFoundError, RedirectError } from '@cloudwerk/core'
 *
 * // Async loader with typed params
 * export const loader: LoaderFunction<{ user: User }, { id: string }> = async ({
 *   params,
 *   context,
 * }) => {
 *   // Check authentication
 *   const session = context.req.cookie('session')
 *   if (!session) {
 *     throw new RedirectError('/login')
 *   }
 *
 *   // Fetch data
 *   const user = await getUser(params.id)
 *   if (!user) {
 *     throw new NotFoundError('User not found')
 *   }
 *
 *   return { user }
 * }
 * ```
 */
export type LoaderFunction<
  TData = unknown,
  TParams = Record<string, string>
> = (args: LoaderArgs<TParams>) => TData | Promise<TData>

/**
 * Helper type for inferring loader return data.
 *
 * Use this to extract the data type from a loader function for type-safe props.
 *
 * @example
 * ```typescript
 * import type { InferLoaderData, LoaderArgs, PageProps } from '@cloudwerk/core'
 *
 * export async function loader({ params }: LoaderArgs<{ id: string }>) {
 *   const user = await getUser(params.id)
 *   return { user }
 * }
 *
 * type LoaderData = InferLoaderData<typeof loader>
 * // LoaderData = { user: User }
 *
 * export default function UserPage({
 *   params,
 *   searchParams,
 *   user, // TypeScript knows this is User
 * }: PageProps<{ id: string }> & LoaderData) {
 *   return <h1>{user.name}</h1>
 * }
 * ```
 */
export type InferLoaderData<T> = T extends LoaderFunction<infer D, unknown>
  ? Awaited<D>
  : never

// ============================================================================
// Action Types
// ============================================================================

/**
 * Arguments passed to action functions.
 *
 * Actions receive route params, the raw request (for reading formData),
 * and the Hono context. This mirrors LoaderArgs for consistency.
 *
 * @example
 * ```typescript
 * import type { ActionArgs } from '@cloudwerk/core'
 *
 * export async function action({ params, request, context }: ActionArgs<{ id: string }>) {
 *   // Read form data
 *   const formData = await request.formData()
 *   const name = formData.get('name')
 *
 *   // Access cookies
 *   const session = context.req.cookie('session')
 *
 *   // Update data
 *   await updateUser(params.id, { name })
 *
 *   return { success: true }
 * }
 * ```
 */
export interface ActionArgs<TParams = Record<string, string>> {
  /** Route parameters from dynamic segments */
  params: TParams

  /** The raw Request object (use for formData(), json(), etc.) */
  request: Request

  /**
   * Hono context for accessing cookies, headers, env, and middleware state.
   *
   * Common uses:
   * - `context.req.cookie('name')` - Read cookies
   * - `context.header('Cache-Control', '...')` - Set response headers
   * - `context.env.DB` - Access Cloudflare bindings
   * - `context.get('key')` - Read middleware-set values
   */
  context: HonoContext
}

/**
 * Action function signature for handling form submissions and mutations.
 *
 * Actions run when handling POST, PUT, PATCH, or DELETE requests to a page.
 * They can return:
 * - A `Response` object (e.g., redirect, json response) - returned directly
 * - Data object - page is re-rendered with `actionData` prop
 *
 * Special behaviors:
 * - Throw `NotFoundError` to return a 404 response
 * - Throw `RedirectError` to redirect to another URL
 * - Other thrown errors will propagate and return 500
 *
 * @example
 * ```typescript
 * import type { ActionFunction } from '@cloudwerk/core'
 * import { redirect, RedirectError } from '@cloudwerk/core'
 *
 * // Return redirect Response (skips page re-render)
 * export const action: ActionFunction = async ({ request }) => {
 *   const formData = await request.formData()
 *   await saveData(formData)
 *   return redirect('/success')
 * }
 *
 * // Return data (re-renders page with actionData)
 * export const action: ActionFunction<{ errors?: Record<string, string> }> = async ({
 *   request,
 * }) => {
 *   const formData = await request.formData()
 *   const errors = validate(formData)
 *   if (errors) {
 *     return { errors }
 *   }
 *   await saveData(formData)
 *   return { success: true }
 * }
 * ```
 */
export type ActionFunction<
  TData = unknown,
  TParams = Record<string, string>
> = (args: ActionArgs<TParams>) => TData | Promise<TData>

/**
 * Helper type for inferring action return data type.
 *
 * Use this to extract the data type from an action function for type-safe props.
 *
 * @example
 * ```typescript
 * import type { InferActionData, ActionArgs, PageProps } from '@cloudwerk/core'
 *
 * export async function action({ request }: ActionArgs) {
 *   const formData = await request.formData()
 *   const errors = validate(formData)
 *   if (errors) return { errors }
 *   await save(formData)
 *   return { success: true }
 * }
 *
 * type ActionData = InferActionData<typeof action>
 * // ActionData = { errors?: Record<string, string> } | { success: boolean }
 *
 * export default function SettingsPage({
 *   actionData,
 * }: PageProps & { actionData?: ActionData }) {
 *   return (
 *     <form method="post">
 *       {actionData?.errors && <p>Error: {actionData.errors.name}</p>}
 *       {actionData?.success && <p>Saved!</p>}
 *       ...
 *     </form>
 *   )
 * }
 * ```
 */
export type InferActionData<T> = T extends ActionFunction<infer D, unknown>
  ? Awaited<D>
  : never

// ============================================================================
// Loading Boundary Types
// ============================================================================

/**
 * Props passed to loading boundary components.
 *
 * Loading boundaries display while loaders are running, providing
 * immediate visual feedback during navigation.
 *
 * @example
 * ```typescript
 * // app/loading.tsx
 * import type { LoadingProps } from '@cloudwerk/core'
 *
 * export default function Loading({ params, pathname }: LoadingProps) {
 *   return (
 *     <div class="animate-pulse">
 *       <div class="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
 *       <div class="h-4 bg-gray-200 rounded w-3/4"></div>
 *       <p>Loading {pathname}...</p>
 *     </div>
 *   )
 * }
 * ```
 */
export interface LoadingProps<TParams = Record<string, string>> {
  /** Route parameters */
  params: TParams
  /** URL search parameters */
  searchParams: Record<string, string | string[] | undefined>
  /** Current pathname for context-aware loading states */
  pathname: string
}

/**
 * Loading boundary component signature.
 *
 * Loading components are rendered immediately during navigation while
 * loaders fetch data in the background.
 */
export type LoadingComponent<TParams = Record<string, string>> = (
  props: LoadingProps<TParams>
) => unknown | Promise<unknown>

// ============================================================================
// Client Component Types
// ============================================================================

/**
 * Information about a detected client component.
 */
export interface ClientComponentInfo {
  /** Absolute file path to the client component */
  filePath: string
  /** Unique ID for this component (used for hydration) */
  componentId: string
  /** Export name (default or named) */
  exportName: string
}

/**
 * Metadata for tracking client components during SSR.
 */
export interface ClientComponentMeta {
  /** Unique component ID */
  componentId: string
  /** Bundle path for the client-side JavaScript */
  bundlePath: string
  /** Source file path */
  sourceFile: string
}

/**
 * Hydration manifest mapping component IDs to their bundle paths.
 *
 * This manifest is used during SSR to:
 * 1. Track which client components are used on the page
 * 2. Generate the appropriate script tags for hydration
 * 3. Map component IDs to their client-side bundles
 *
 * @example
 * ```typescript
 * import { createHydrationManifest, addToHydrationManifest } from '@cloudwerk/core'
 *
 * const manifest = createHydrationManifest('/__cloudwerk')
 *
 * addToHydrationManifest(manifest, {
 *   componentId: 'components_Counter',
 *   filePath: '/app/components/Counter.tsx',
 *   exportName: 'default',
 * }, '/__cloudwerk/components_Counter.js')
 * ```
 */
export interface HydrationManifest {
  /** Map of component ID to metadata */
  components: Map<string, ClientComponentMeta>
  /** Base path for client bundles */
  basePath: string
  /** Generated timestamp */
  generatedAt: Date
}

// ============================================================================
// Static Site Generation (SSG) Types
// ============================================================================

/**
 * Arguments passed to generateStaticParams functions.
 *
 * Currently, this interface is empty but is included for forward compatibility
 * with future features like nested dynamic route support.
 *
 * @example
 * ```typescript
 * // app/posts/[slug]/page.tsx
 * import type { GenerateStaticParamsFunction } from '@cloudwerk/core'
 *
 * export const generateStaticParams: GenerateStaticParamsFunction<{ slug: string }> =
 *   async () => {
 *     const posts = await getAllPosts()
 *     return posts.map((post) => ({ slug: post.slug }))
 *   }
 * ```
 */
export interface GenerateStaticParamsArgs {
  // Reserved for future features (e.g., parentParams for nested dynamic routes)
}

/**
 * Function to generate static params for SSG.
 *
 * Export this from a page with `rendering: 'static'` config to generate
 * multiple static pages for dynamic route segments.
 *
 * @example
 * ```typescript
 * // app/posts/[slug]/page.tsx
 * import type { GenerateStaticParamsFunction, RouteConfig } from '@cloudwerk/core'
 *
 * export const config: RouteConfig = {
 *   rendering: 'static',
 * }
 *
 * export const generateStaticParams: GenerateStaticParamsFunction<{ slug: string }> =
 *   async () => {
 *     const posts = await getAllPosts()
 *     return posts.map((post) => ({ slug: post.slug }))
 *   }
 *
 * export default function PostPage({ params }: PageProps<{ slug: string }>) {
 *   // ...
 * }
 * ```
 */
export type GenerateStaticParamsFunction<TParams = Record<string, string>> = (
  args?: GenerateStaticParamsArgs
) => TParams[] | Promise<TParams[]>
