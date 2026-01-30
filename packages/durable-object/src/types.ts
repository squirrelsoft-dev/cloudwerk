/**
 * @cloudwerk/durable-object - Type Definitions
 *
 * Core types for Durable Objects with native Cloudflare RPC support.
 */

import type { ZodType } from 'zod'

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Type that can be either a value or a Promise of that value.
 * Used throughout the durable-object package for async-friendly APIs.
 */
export type Awaitable<T> = T | Promise<T>

/**
 * Supported file extensions for durable object definitions.
 */
export type SupportedExtension = '.ts' | '.tsx' | '.js' | '.jsx'

// ============================================================================
// Context Types
// ============================================================================

/**
 * Context available to all durable object handlers.
 * Provides access to storage, SQL, and WebSocket management.
 *
 * @example
 * ```typescript
 * export default defineDurableObject<CounterState>({
 *   async init(ctx) {
 *     // Access SQLite storage
 *     ctx.sql.run(`CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY, action TEXT)`)
 *     return { value: 0 }
 *   }
 * })
 * ```
 */
export interface DurableObjectContext {
  /** Persistent key-value storage */
  storage: DurableObjectStorage

  /** SQLite storage (if enabled) */
  sql: SqlStorage

  /** Unique identifier for this durable object instance */
  id: DurableObjectId

  /**
   * Get all WebSocket connections, optionally filtered by tag.
   * @param tag - Optional tag to filter WebSockets
   */
  getWebSockets(tag?: string): WebSocket[]

  /**
   * Accept a WebSocket connection with optional tags for grouping.
   * @param ws - The WebSocket to accept
   * @param tags - Optional tags for filtering later
   */
  acceptWebSocket(ws: WebSocket, tags?: string[]): void
}

/**
 * Handler context with state access.
 * `this` is bound to this context in all handler methods.
 *
 * @typeParam TState - The state type for this durable object
 *
 * @example
 * ```typescript
 * export default defineDurableObject<CounterState>({
 *   methods: {
 *     async increment(amount = 1) {
 *       this.state.value += amount  // Access state via this
 *       this.ctx.sql.run(`INSERT INTO logs (action) VALUES ('increment')`)
 *       return this.state.value
 *     }
 *   }
 * })
 * ```
 */
export interface DurableObjectHandlerContext<TState = unknown> {
  /** Current state of the durable object */
  state: TState

  /** Context with storage, SQL, and WebSocket access */
  ctx: DurableObjectContext
}

// ============================================================================
// Cloudflare Types (from @cloudflare/workers-types)
// ============================================================================

/**
 * Durable Object storage interface for key-value persistence.
 */
export interface DurableObjectStorage {
  get<T = unknown>(key: string): Promise<T | undefined>
  get<T = unknown>(keys: string[]): Promise<Map<string, T>>
  list<T = unknown>(options?: DurableObjectStorageListOptions): Promise<Map<string, T>>
  put<T>(key: string, value: T): Promise<void>
  put<T>(entries: Record<string, T>): Promise<void>
  delete(key: string): Promise<boolean>
  delete(keys: string[]): Promise<number>
  deleteAll(): Promise<void>
  transaction<T>(closure: (txn: DurableObjectTransaction) => Promise<T>): Promise<T>
  getAlarm(): Promise<number | null>
  setAlarm(scheduledTime: number | Date): Promise<void>
  deleteAlarm(): Promise<void>
  sync(): Promise<void>
}

/**
 * Options for listing storage keys.
 */
export interface DurableObjectStorageListOptions {
  start?: string
  startAfter?: string
  end?: string
  prefix?: string
  reverse?: boolean
  limit?: number
}

/**
 * Transaction interface for atomic operations.
 */
export interface DurableObjectTransaction {
  get<T = unknown>(key: string): Promise<T | undefined>
  get<T = unknown>(keys: string[]): Promise<Map<string, T>>
  list<T = unknown>(options?: DurableObjectStorageListOptions): Promise<Map<string, T>>
  put<T>(key: string, value: T): Promise<void>
  put<T>(entries: Record<string, T>): Promise<void>
  delete(key: string): Promise<boolean>
  delete(keys: string[]): Promise<number>
  rollback(): void
}

/**
 * SQLite storage interface for relational data.
 */
export interface SqlStorage {
  exec(query: string): SqlStorageCursor
  run(query: string, ...bindings: unknown[]): void
}

/**
 * Cursor for iterating SQL results.
 */
export interface SqlStorageCursor {
  [Symbol.iterator](): IterableIterator<Record<string, unknown>>
  toArray(): Record<string, unknown>[]
  one(): Record<string, unknown> | null
  raw<T extends unknown[] = unknown[]>(): IterableIterator<T>
  columnNames: string[]
  rowsRead: number
  rowsWritten: number
}

/**
 * Unique identifier for a durable object instance.
 */
export interface DurableObjectId {
  toString(): string
  equals(other: DurableObjectId): boolean
  name?: string
}

/**
 * Namespace for accessing durable object stubs.
 */
export interface DurableObjectNamespace<T = unknown> {
  idFromName(name: string): DurableObjectId
  idFromString(id: string): DurableObjectId
  newUniqueId(): DurableObjectId
  get(id: DurableObjectId): DurableObjectStub<T>
}

/**
 * Stub for interacting with a durable object instance.
 * Methods defined in `defineDurableObject({ methods })` are directly callable via native RPC.
 */
export interface DurableObjectStub<T = unknown> {
  id: DurableObjectId
  name?: string
  fetch(request: Request): Promise<Response>
  /** Additional RPC methods are added dynamically based on the methods config */
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration for defineDurableObject().
 *
 * @typeParam TState - The state type managed by this durable object
 * @typeParam TEnv - The environment bindings type
 *
 * @example
 * ```typescript
 * interface CounterState {
 *   value: number
 * }
 *
 * export default defineDurableObject<CounterState>({
 *   sqlite: true,
 *
 *   async init(ctx) {
 *     ctx.sql.run(`CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY)`)
 *     return { value: 0 }
 *   },
 *
 *   methods: {
 *     async increment(amount = 1) {
 *       this.state.value += amount
 *       return this.state.value
 *     },
 *
 *     async getValue() {
 *       return this.state.value
 *     },
 *   },
 *
 *   async fetch(request) {
 *     return new Response(`Counter: ${this.state.value}`)
 *   },
 * })
 * ```
 */
export interface DurableObjectConfig<TState = unknown, TEnv = unknown> {
  /**
   * Optional name override.
   * By default, the name is derived from the filename.
   * - `app/objects/counter.ts` -> `counter`
   * - `app/objects/chat-room.ts` -> `chatRoom`
   */
  name?: string

  /**
   * Enable SQLite storage for this durable object.
   * When true, `ctx.sql` will be available for SQL operations.
   * @default false
   */
  sqlite?: boolean

  /**
   * Optional Zod schema for runtime validation of state.
   */
  schema?: ZodType<TState>

  /**
   * Initialize state on first access to this durable object.
   * Called once when the durable object is first created or hydrated.
   *
   * @param ctx - Context with storage, SQL, and WebSocket access
   * @param env - Environment bindings
   * @returns Initial state or Promise resolving to initial state
   */
  init?: (ctx: DurableObjectContext, env: TEnv) => Awaitable<TState>

  /**
   * RPC methods callable directly on the durable object stub.
   * These become native Cloudflare RPC methods (no HTTP overhead).
   *
   * @example
   * ```typescript
   * methods: {
   *   async increment(amount = 1) {
   *     this.state.value += amount
   *     return this.state.value
   *   }
   * }
   *
   * // Usage:
   * const stub = env.COUNTER.get(id)
   * const value = await stub.increment(5)  // Direct RPC call
   * ```
   */
  methods?: {
    [name: string]: (
      this: DurableObjectHandlerContext<TState>,
      ...args: unknown[]
    ) => Awaitable<unknown>
  }

  /**
   * HTTP request handler.
   * Called when the durable object receives an HTTP request via stub.fetch().
   *
   * @param request - The incoming HTTP request
   * @param env - Environment bindings
   * @returns Response or Promise resolving to Response
   */
  fetch?: (
    this: DurableObjectHandlerContext<TState>,
    request: Request,
    env: TEnv
  ) => Awaitable<Response>

  /**
   * WebSocket message handler.
   * Called when a WebSocket message is received.
   *
   * @param ws - The WebSocket that sent the message
   * @param message - The message content (string or binary)
   */
  webSocketMessage?: (
    this: DurableObjectHandlerContext<TState>,
    ws: WebSocket,
    message: string | ArrayBuffer
  ) => Awaitable<void>

  /**
   * WebSocket close handler.
   * Called when a WebSocket connection closes.
   *
   * @param ws - The WebSocket that closed
   * @param code - Close code
   * @param reason - Close reason
   */
  webSocketClose?: (
    this: DurableObjectHandlerContext<TState>,
    ws: WebSocket,
    code: number,
    reason: string
  ) => Awaitable<void>

  /**
   * WebSocket error handler.
   * Called when a WebSocket error occurs.
   *
   * @param ws - The WebSocket with the error
   * @param error - The error that occurred
   */
  webSocketError?: (
    this: DurableObjectHandlerContext<TState>,
    ws: WebSocket,
    error: Error
  ) => Awaitable<void>

  /**
   * Alarm handler.
   * Called when a scheduled alarm fires.
   * Set alarms using `ctx.storage.setAlarm()`.
   *
   * @example
   * ```typescript
   * {
   *   async init(ctx) {
   *     // Schedule alarm for 1 hour from now
   *     await ctx.storage.setAlarm(Date.now() + 60 * 60 * 1000)
   *     return { lastCleanup: Date.now() }
   *   },
   *
   *   async alarm() {
   *     // Perform periodic cleanup
   *     this.state.lastCleanup = Date.now()
   *     // Reschedule for next hour
   *     await this.ctx.storage.setAlarm(Date.now() + 60 * 60 * 1000)
   *   }
   * }
   * ```
   */
  alarm?: (this: DurableObjectHandlerContext<TState>) => Awaitable<void>
}

// ============================================================================
// Definition Types
// ============================================================================

/**
 * A defined durable object, returned by defineDurableObject().
 *
 * @typeParam TState - The state type managed by this durable object
 * @typeParam TEnv - The environment bindings type
 */
export interface DurableObjectDefinition<TState = unknown, TEnv = unknown> {
  /** Internal marker identifying this as a durable object definition */
  readonly __brand: 'cloudwerk-durable-object'

  /** Object name (derived from filename or explicitly set) */
  readonly name: string | undefined

  /** Whether SQLite storage is enabled */
  readonly sqlite: boolean

  /** Zod schema for state validation (if provided) */
  readonly schema: ZodType<TState> | undefined

  /** The full configuration object */
  readonly config: DurableObjectConfig<TState, TEnv>
}

// ============================================================================
// Scanner Types
// ============================================================================

/**
 * A scanned durable object file from the app/objects/ directory.
 */
export interface ScannedDurableObject {
  /** Relative path from app/objects/ (e.g., 'counter.ts') */
  relativePath: string

  /** Absolute filesystem path */
  absolutePath: string

  /** File name without extension (e.g., 'counter') */
  name: string

  /** File extension (e.g., '.ts') */
  extension: SupportedExtension
}

/**
 * Result of scanning the app/objects/ directory.
 */
export interface DurableObjectScanResult {
  /** All discovered durable object files */
  durableObjects: ScannedDurableObject[]
}

// ============================================================================
// Manifest Types
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

// ============================================================================
// Migration Types
// ============================================================================

/**
 * A Cloudflare Durable Object migration for wrangler.toml.
 */
export interface DurableObjectMigration {
  /** Migration tag (e.g., 'v1', 'v2') */
  tag: string

  /** New classes to create */
  new_classes?: string[]

  /** New classes that use SQLite storage */
  new_sqlite_classes?: string[]

  /** Classes to rename */
  renamed_classes?: Array<{ from: string; to: string }>

  /** Classes to delete */
  deleted_classes?: string[]
}

// ============================================================================
// Build Options Types
// ============================================================================

/**
 * Options for building the durable object manifest.
 */
export interface BuildDurableObjectManifestOptions {
  /** Application name for prefixing (e.g., 'cloudwerk') */
  appName?: string

  /** Whether to validate definitions at build time */
  validate?: boolean

  /** Output directory for generated files */
  outputDir?: string
}
