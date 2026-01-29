/**
 * @cloudwerk/cli - Type Definitions
 *
 * CLI-specific types for the development server and commands.
 */

import type {
  CloudwerkConfig,
  HttpMethod,
  RouteConfig,
  PageComponent,
  LayoutComponent,
  LoaderFunction,
} from '@cloudwerk/core'

// ============================================================================
// CLI Option Types
// ============================================================================

/**
 * Options for the `cloudwerk dev` command.
 */
export interface DevCommandOptions {
  /** Port to listen on (default: 3000) */
  port: string
  /** Host to bind (default: localhost) */
  host: string
  /** Path to config file */
  config?: string
  /** Enable verbose logging */
  verbose?: boolean
}

/**
 * Options for the `cloudwerk build` command.
 */
export interface BuildCommandOptions {
  /** Output directory for static files (default: ./dist) */
  output?: string
  /** Enable static site generation for routes with rendering: 'static' */
  ssg?: boolean
  /** Enable minification (default: true) */
  minify?: boolean
  /** Generate source maps (default: false) */
  sourcemap?: boolean
  /** Path to config file */
  config?: string
  /** Enable verbose logging */
  verbose?: boolean
}

/**
 * Options for the `cloudwerk deploy` command.
 */
export interface DeployCommandOptions {
  /** Environment to deploy to (default: production) */
  env?: string
  /** Preview deployment without executing */
  dryRun?: boolean
  /** Skip the build step */
  skipBuild?: boolean
  /** Path to config file */
  config?: string
  /** Enable verbose logging */
  verbose?: boolean
}

/**
 * Result of client asset bundling.
 */
export interface ClientBundleResult {
  /** Path to the runtime bundle */
  runtimePath: string
  /** Size of the runtime bundle in bytes */
  runtimeSize: number
  /** Map of component ID to bundle path */
  componentBundles: Map<string, string>
  /** Map of component ID to bundle size in bytes */
  componentSizes: Map<string, number>
  /** Path to the manifest file */
  manifestPath: string
  /** Total size of all client bundles in bytes */
  totalSize: number
}

/**
 * Result of server bundling.
 */
export interface ServerBundleResult {
  /** Path to the server bundle */
  outputPath: string
  /** Size of the server bundle in bytes */
  size: number
  /** Size of the compressed bundle in bytes (if available) */
  compressedSize?: number
}

/**
 * Complete build result with all output information.
 */
export interface BuildResult {
  /** Client bundle result */
  client: ClientBundleResult
  /** Server bundle result */
  server: ServerBundleResult
  /** SSG output paths (if --ssg was used) */
  staticPages?: string[]
  /** Total build time in milliseconds */
  buildTime: number
  /** Output directory */
  outputDir: string
}

/**
 * Resolved dev server configuration.
 */
export interface DevServerConfig {
  /** Port number */
  port: number
  /** Host to bind */
  host: string
  /** Working directory */
  cwd: string
  /** Cloudwerk configuration */
  config: CloudwerkConfig
  /** Enable verbose logging */
  verbose: boolean
}

// ============================================================================
// Route Handler Types
// ============================================================================

/**
 * A loaded route module with HTTP method exports and optional config.
 */
export interface LoadedRouteModule {
  GET?: RouteHandlerFn
  POST?: RouteHandlerFn
  PUT?: RouteHandlerFn
  PATCH?: RouteHandlerFn
  DELETE?: RouteHandlerFn
  OPTIONS?: RouteHandlerFn
  HEAD?: RouteHandlerFn
  /** Route configuration (auth, rate limiting, caching, custom metadata) */
  config?: RouteConfig
}

/**
 * Route handler function type (internal).
 *
 * This type uses `unknown` parameters intentionally because:
 * 1. Handlers are dynamically loaded at runtime - signature unknown at compile time
 * 2. TypeScript function type unions don't work at call sites (requires intersection)
 * 3. User-facing type safety is provided by `CloudwerkHandler<T>` in route files
 * 4. The actual typing happens in `createHandlerAdapter` from `@cloudwerk/core`
 *
 * Supports both handler signatures:
 * - Hono style: (c: HonoContext) => Response
 * - Cloudwerk style: (request: Request, context: CloudwerkHandlerContext) => Response
 *
 * Detection is based on function arity (fn.length):
 * - Arity 1: Hono handler
 * - Arity 2: Cloudwerk handler (wrapped via `createHandlerAdapter`)
 *
 * @internal
 */
export type RouteHandlerFn = (
  arg1: unknown,
  arg2?: unknown
) => Response | Promise<Response>

/**
 * Registered route information for logging.
 */
export interface RegisteredRoute {
  method: HttpMethod
  pattern: string
  filePath: string
}

// ============================================================================
// Server Types
// ============================================================================

/**
 * Server startup result.
 */
export interface ServerStartResult {
  /** Local URL */
  localUrl: string
  /** Network URL (if applicable) */
  networkUrl?: string
  /** Registered routes */
  routes: RegisteredRoute[]
  /** Startup time in milliseconds */
  startupTime: number
}

/**
 * Logger interface for CLI output.
 */
export interface Logger {
  info(message: string): void
  success(message: string): void
  warn(message: string): void
  error(message: string): void
  debug(message: string): void
  log(message: string): void
}

// ============================================================================
// Page & Layout Module Types
// ============================================================================

/**
 * A loaded page module with default component export, optional config, and optional loader.
 */
export interface LoadedPageModule {
  /** Default export: the page component function */
  default: PageComponent
  /** Optional route configuration */
  config?: RouteConfig
  /** Optional loader function for server-side data loading */
  loader?: LoaderFunction
}

/**
 * A loaded layout module with default component export and optional loader.
 */
export interface LoadedLayoutModule {
  /** Default export: the layout component function */
  default: LayoutComponent
  /** Optional loader function for server-side data loading */
  loader?: LoaderFunction
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * CLI error with helpful context.
 */
export class CliError extends Error {
  constructor(
    message: string,
    public code: string,
    public suggestion?: string
  ) {
    super(message)
    this.name = 'CliError'
  }
}

/**
 * Route compilation error.
 */
export class RouteCompilationError extends Error {
  constructor(
    message: string,
    public filePath: string,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'RouteCompilationError'
  }
}

/**
 * Port in use error.
 */
export class PortInUseError extends CliError {
  constructor(port: number) {
    super(
      `Port ${port} is already in use`,
      'EADDRINUSE',
      `Try using a different port:\n    cloudwerk dev --port ${port + 1}`
    )
    this.name = 'PortInUseError'
  }
}
