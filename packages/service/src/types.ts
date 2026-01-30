/**
 * @cloudwerk/service - Type Definitions
 *
 * Core types for service extraction and RPC.
 */

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Type that can be either a value or a Promise of that value.
 */
export type Awaitable<T> = T | Promise<T>

/**
 * Extracts the method signatures from a service methods object.
 */
export type ServiceMethods = Record<
  string,
  (...args: unknown[]) => Awaitable<unknown>
>

/**
 * Context provided to service method calls.
 */
export interface ServiceMethodContext {
  /** Cloudflare environment bindings */
  env: Record<string, unknown>
}

// ============================================================================
// Hook Types
// ============================================================================

/**
 * Lifecycle hooks for service methods.
 *
 * @example
 * ```typescript
 * export default defineService({
 *   methods: { ... },
 *   hooks: {
 *     onInit: async () => {
 *       console.log('Service initialized')
 *     },
 *     onBefore: async (method, args) => {
 *       console.log(`Calling ${method}`)
 *     },
 *     onAfter: async (method, result) => {
 *       console.log(`${method} returned`, result)
 *     },
 *     onError: async (method, error) => {
 *       console.error(`${method} failed`, error)
 *     },
 *   },
 * })
 * ```
 */
export interface ServiceHooks {
  /**
   * Called once when the service is initialized.
   * Runs before any method calls.
   */
  onInit?: () => Awaitable<void>

  /**
   * Called before each method invocation.
   *
   * @param method - The name of the method being called
   * @param args - Arguments passed to the method
   */
  onBefore?: (method: string, args: unknown[]) => Awaitable<void>

  /**
   * Called after each successful method invocation.
   *
   * @param method - The name of the method that was called
   * @param result - The return value of the method
   */
  onAfter?: (method: string, result: unknown) => Awaitable<void>

  /**
   * Called when a method throws an error.
   *
   * @param method - The name of the method that threw
   * @param error - The error that was thrown
   */
  onError?: (method: string, error: Error) => Awaitable<void>
}

// ============================================================================
// Extraction Configuration
// ============================================================================

/**
 * Configuration for service extraction to a separate Worker.
 *
 * @example
 * ```typescript
 * export default defineService({
 *   methods: { ... },
 *   config: {
 *     extraction: {
 *       workerName: 'email-service',
 *       bindings: ['DB', 'EMAIL_API_KEY'],
 *     }
 *   }
 * })
 * ```
 */
export interface ServiceExtractionConfig {
  /**
   * Name of the extracted Worker.
   * Used as the service name in wrangler.toml.
   *
   * @default Derived from directory name (e.g., 'email' -> 'email-service')
   */
  workerName?: string

  /**
   * List of binding names this service needs.
   * These will be copied to the extracted Worker's wrangler.toml.
   *
   * @example ['DB', 'EMAIL_API_KEY', 'STRIPE_SECRET']
   */
  bindings?: string[]
}

/**
 * Full service configuration.
 */
export interface ServiceProcessingConfig {
  /**
   * Extraction configuration for when the service is deployed
   * as a separate Worker.
   */
  extraction?: ServiceExtractionConfig
}

// ============================================================================
// Service Definition Types
// ============================================================================

/**
 * Configuration for defining a service.
 *
 * @typeParam T - The methods object type
 *
 * @example
 * ```typescript
 * // app/services/email/service.ts
 * import { defineService } from '@cloudwerk/service'
 *
 * export default defineService({
 *   methods: {
 *     async send({ to, subject, body }) {
 *       await sendEmail(to, subject, body)
 *       return { success: true, messageId: crypto.randomUUID() }
 *     },
 *     async sendBatch(emails) {
 *       return Promise.all(emails.map(e => this.send(e)))
 *     }
 *   },
 *
 *   hooks: {
 *     onBefore: async (method, args) => {
 *       console.log(`[email] ${method} called`)
 *     }
 *   },
 *
 *   config: {
 *     extraction: {
 *       workerName: 'email-service',
 *       bindings: ['RESEND_API_KEY'],
 *     }
 *   }
 * })
 * ```
 */
export interface ServiceConfig<T extends ServiceMethods = ServiceMethods> {
  /**
   * Optional service name override.
   * By default, the service name is derived from the directory name.
   * - `app/services/email/service.ts` -> `email`
   * - `app/services/user-management/service.ts` -> `userManagement`
   */
  name?: string

  /**
   * The methods exposed by this service.
   * Each method receives arguments and returns a value or Promise.
   *
   * Methods can access `this.env` for Cloudflare bindings when running
   * in extracted mode.
   */
  methods: T

  /**
   * Lifecycle hooks for observability and side effects.
   */
  hooks?: ServiceHooks

  /**
   * Service configuration including extraction settings.
   */
  config?: ServiceProcessingConfig
}

/**
 * A defined service, returned by defineService().
 *
 * @typeParam T - The methods object type
 */
export interface ServiceDefinition<T extends ServiceMethods = ServiceMethods> {
  /** Internal marker identifying this as a service definition */
  readonly __brand: 'cloudwerk-service'

  /** Service name (derived from directory or explicitly set) */
  readonly name: string | undefined

  /** The service methods */
  readonly methods: T

  /** Lifecycle hooks */
  readonly hooks: ServiceHooks | undefined

  /** Processing configuration */
  readonly config: ServiceProcessingConfig
}

// ============================================================================
// Manifest Types
// ============================================================================

/**
 * A scanned service from the app/services/ directory.
 */
export interface ScannedService {
  /** Service name derived from directory (e.g., 'email', 'userManagement') */
  name: string

  /** Relative path from app/services/ (e.g., 'email/service.ts') */
  relativePath: string

  /** Absolute filesystem path */
  absolutePath: string

  /** Directory name (e.g., 'email') */
  directoryName: string

  /** File extension (e.g., '.ts') */
  extension: string
}

/**
 * Result of scanning the app/services/ directory.
 */
export interface ServiceScanResult {
  /** All discovered service files */
  services: ScannedService[]
}

/**
 * Extraction mode for a service.
 */
export type ServiceMode = 'local' | 'extracted'

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

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Service mode configuration in cloudwerk.config.ts.
 */
export interface ServicesConfigEntry {
  /** Extraction mode for this specific service */
  mode: ServiceMode
}

/**
 * Top-level services configuration.
 *
 * @example
 * ```typescript
 * // cloudwerk.config.ts
 * export default defineConfig({
 *   services: {
 *     mode: 'hybrid',
 *     email: { mode: 'extracted' },
 *     payments: { mode: 'extracted' },
 *     users: { mode: 'local' },
 *   }
 * })
 * ```
 */
export interface ServicesConfig {
  /**
   * Default mode for all services.
   * - 'local': All services run in the main Worker (direct calls)
   * - 'extracted': All services run as separate Workers (RPC via service bindings)
   * - 'hybrid': Use per-service configuration
   *
   * @default 'local'
   */
  mode?: 'local' | 'extracted' | 'hybrid'

  /**
   * Per-service mode overrides.
   * Keys are service names (e.g., 'email', 'userManagement').
   */
  [serviceName: string]: ServicesConfigEntry | string | undefined
}
