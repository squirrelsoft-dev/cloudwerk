/**
 * @cloudwerk/trigger - Type Definitions
 *
 * Core types for event-driven triggers in Cloudwerk.
 */

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Type that can be either a value or a Promise of that value.
 * Used throughout the trigger package for async-friendly APIs.
 */
export type Awaitable<T> = T | Promise<T>

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Batch configuration for queue and R2 triggers.
 */
export interface BatchConfig {
  /**
   * Maximum number of events to deliver in a batch.
   * @default 10
   */
  size?: number

  /**
   * Maximum time to wait for a batch to fill.
   * Supports duration strings like '5s', '30s'.
   * @default '5s'
   */
  timeout?: string
}

/**
 * Retry configuration for triggers.
 */
export interface RetryConfig {
  /**
   * Maximum number of retry attempts.
   * @default 3
   */
  maxAttempts?: number

  /**
   * Delay between retries. Supports duration strings like '30s', '1m'.
   * @default '1m'
   */
  delay?: string

  /**
   * Backoff strategy for retries.
   * - 'linear': Fixed delay between retries
   * - 'exponential': Delay doubles with each retry
   * @default 'linear'
   */
  backoff?: 'linear' | 'exponential'
}

// ============================================================================
// Webhook Verification Types
// ============================================================================

/**
 * Result of webhook signature verification.
 */
export interface WebhookVerificationResult {
  /** Whether the signature is valid */
  valid: boolean
  /** Error message if verification failed */
  error?: string
}

/**
 * Webhook signature verifier function.
 *
 * @param request - The incoming request
 * @param rawBody - The raw request body as ArrayBuffer
 * @returns Verification result
 */
export type WebhookVerifier = (
  request: Request,
  rawBody: ArrayBuffer
) => Awaitable<WebhookVerificationResult>

// ============================================================================
// Source Types (Discriminated Union)
// ============================================================================

/**
 * R2 event types that can trigger a handler.
 */
export type R2EventType = 'object-create' | 'object-delete'

/**
 * D1 event types that can trigger a handler.
 */
export type D1EventType = 'insert' | 'update' | 'delete'

/**
 * Queue trigger source configuration.
 */
export interface QueueTriggerSource {
  type: 'queue'
  /** Name of the queue to consume from */
  queue: string
  /** Batch configuration */
  batch?: BatchConfig
}

/**
 * Scheduled (cron) trigger source configuration.
 */
export interface ScheduledTriggerSource {
  type: 'scheduled'
  /** Cron expression (e.g., '0 0 * * *' for daily at midnight) */
  cron: string
}

/**
 * R2 bucket trigger source configuration.
 */
export interface R2TriggerSource {
  type: 'r2'
  /** Name of the R2 bucket */
  bucket: string
  /** Event types to trigger on */
  events: R2EventType[]
  /** Optional prefix filter */
  prefix?: string
  /** Optional suffix filter */
  suffix?: string
}

/**
 * Webhook trigger source configuration.
 */
export interface WebhookTriggerSource {
  type: 'webhook'
  /** URL path for the webhook (e.g., '/webhooks/stripe') */
  path: string
  /** Optional signature verifier */
  verify?: WebhookVerifier
  /** HTTP methods to accept (default: ['POST']) */
  methods?: ('POST' | 'PUT' | 'PATCH')[]
}

/**
 * Email trigger source configuration.
 */
export interface EmailTriggerSource {
  type: 'email'
  /** Email address pattern to match */
  address: string
}

/**
 * D1 database trigger source configuration.
 */
export interface D1TriggerSource {
  type: 'd1'
  /** Name of the D1 database binding */
  database: string
  /** Table to watch */
  table: string
  /** Event types to trigger on */
  events: D1EventType[]
}

/**
 * Tail trigger source configuration (for consuming logs from other workers).
 */
export interface TailTriggerSource {
  type: 'tail'
  /** Worker names to consume logs from */
  consumers: string[]
}

/**
 * Union of all trigger source types.
 */
export type TriggerSource =
  | QueueTriggerSource
  | ScheduledTriggerSource
  | R2TriggerSource
  | WebhookTriggerSource
  | EmailTriggerSource
  | D1TriggerSource
  | TailTriggerSource

// ============================================================================
// Event Types
// ============================================================================

/**
 * Scheduled event passed to cron trigger handlers.
 */
export interface ScheduledEvent {
  /** The cron expression that triggered this event */
  cron: string
  /** Unix timestamp (milliseconds) when the event was scheduled */
  scheduledTime: number
  /**
   * Prevent automatic retry on failure.
   * Call this if the error is not recoverable.
   */
  noRetry(): void
}

/**
 * Single message in a queue batch.
 */
export interface QueueMessage<T = unknown> {
  /** Unique message ID */
  readonly id: string
  /** Message payload */
  readonly body: T
  /** When the message was sent */
  readonly timestamp: Date
  /** Number of delivery attempts */
  readonly attempts: number
  /** Acknowledge successful processing */
  ack(): void
  /** Request retry with optional delay */
  retry(options?: { delaySeconds?: number }): void
}

/**
 * Queue batch event passed to queue trigger handlers.
 */
export interface QueueBatchEvent<T = unknown> {
  /** Array of messages in the batch */
  messages: QueueMessage<T>[]
  /** Name of the queue */
  queue: string
  /** Acknowledge all messages in the batch */
  ackAll(): void
  /** Retry all messages in the batch */
  retryAll(): void
}

/**
 * R2 object event passed to R2 trigger handlers.
 */
export interface R2Event {
  /** Type of event */
  type: 'object-create' | 'object-delete'
  /** Name of the R2 bucket */
  bucket: string
  /** Object key (path) */
  key: string
  /** ETag of the object (for create events) */
  etag?: string
  /** Size in bytes (for create events) */
  size?: number
  /** Upload timestamp (for create events) */
  uploadedAt?: Date
  /** Account ID */
  account: string
  /** Event ID for deduplication */
  eventId: string
}

/**
 * Webhook event passed to webhook trigger handlers.
 */
export interface WebhookEvent<T = unknown> {
  /** Parsed payload (JSON) */
  payload: T
  /** Request headers */
  headers: Headers
  /** Signature header value (if present) */
  signature: string | null
  /** Raw request body for manual verification */
  rawBody: ArrayBuffer
  /** Whether signature verification passed */
  verified: boolean
  /** HTTP method used */
  method: string
  /** URL path */
  path: string
}

/**
 * Email event passed to email trigger handlers.
 */
export interface EmailEvent {
  /** Sender email address */
  from: string
  /** Recipient email address */
  to: string
  /** Email subject */
  subject: string
  /** Raw email as a stream */
  rawEmail: ReadableStream
  /** Parse the email body as text */
  text(): Promise<string>
  /** Parse the email body as HTML */
  html(): Promise<string | null>
}

/**
 * D1 change event passed to D1 trigger handlers.
 */
export interface D1Event {
  /** Type of database operation */
  type: 'insert' | 'update' | 'delete'
  /** Database name */
  database: string
  /** Table name */
  table: string
  /** Primary key values of the affected row */
  primaryKey: Record<string, unknown>
  /** New values (for insert/update) */
  newValues?: Record<string, unknown>
  /** Old values (for update/delete) */
  oldValues?: Record<string, unknown>
}

/**
 * Tail event passed to tail trigger handlers.
 */
export interface TailEvent {
  /** Array of log entries */
  logs: TailLogEntry[]
  /** Worker that produced the logs */
  worker: string
}

/**
 * Single log entry in a tail event.
 */
export interface TailLogEntry {
  /** Log level */
  level: 'log' | 'debug' | 'info' | 'warn' | 'error'
  /** Log message */
  message: string
  /** Timestamp */
  timestamp: Date
  /** Additional data */
  data?: unknown
}

// ============================================================================
// Type Inference Helpers
// ============================================================================

/**
 * Infer the event type from a trigger source.
 *
 * @example
 * ```typescript
 * type Event = InferEventType<{ type: 'scheduled'; cron: '0 0 * * *' }>
 * // Event = ScheduledEvent
 * ```
 */
export type InferEventType<TSource extends TriggerSource> =
  TSource extends ScheduledTriggerSource ? ScheduledEvent :
  TSource extends QueueTriggerSource ? QueueBatchEvent :
  TSource extends R2TriggerSource ? R2Event :
  TSource extends WebhookTriggerSource ? WebhookEvent :
  TSource extends EmailTriggerSource ? EmailEvent :
  TSource extends D1TriggerSource ? D1Event :
  TSource extends TailTriggerSource ? TailEvent :
  never

// ============================================================================
// Context Types
// ============================================================================

/**
 * Context passed to trigger handlers.
 */
export interface TriggerContext {
  /**
   * Unique trace ID for this trigger execution.
   * Propagated through trigger chains for observability.
   */
  traceId: string

  /**
   * Extend the lifetime of the trigger execution.
   * Use for background tasks that should complete after the handler returns.
   */
  waitUntil(promise: Promise<unknown>): void

  /**
   * Allow the request to pass through on exception.
   * Only applicable for certain trigger types.
   */
  passThroughOnException(): void

  /**
   * Access to Cloudflare bindings (D1, KV, R2, etc.).
   */
  env: Record<string, unknown>
}

// ============================================================================
// Handler Types
// ============================================================================

/**
 * Trigger handler function signature.
 */
export type TriggerHandler<TEvent> = (
  event: TEvent,
  ctx: TriggerContext
) => Awaitable<void>

/**
 * Error handler function signature.
 */
export type TriggerErrorHandler<TEvent> = (
  error: Error,
  event: TEvent,
  ctx: TriggerContext
) => Awaitable<void>

// ============================================================================
// Definition Types
// ============================================================================

/**
 * Configuration for defining a trigger.
 *
 * @typeParam TSource - The trigger source type
 *
 * @example
 * ```typescript
 * // Scheduled trigger
 * defineTrigger({
 *   source: { type: 'scheduled', cron: '0 0 * * *' },
 *   async handle(event, ctx) {
 *     console.log(`Running at ${event.scheduledTime}`)
 *   }
 * })
 *
 * // R2 trigger
 * defineTrigger({
 *   source: { type: 'r2', bucket: 'uploads', events: ['object-create'] },
 *   async handle(event, ctx) {
 *     console.log(`New file: ${event.key}`)
 *   }
 * })
 * ```
 */
export interface TriggerConfig<TSource extends TriggerSource> {
  /**
   * Optional trigger name override.
   * By default, derived from the filename.
   */
  name?: string

  /**
   * The event source configuration.
   */
  source: TSource

  /**
   * Retry configuration for failed executions.
   */
  retry?: RetryConfig

  /**
   * Execution timeout in milliseconds.
   * @default 30000 (30 seconds)
   */
  timeout?: number

  /**
   * The trigger handler function.
   */
  handle: TriggerHandler<InferEventType<TSource>>

  /**
   * Optional error handler for logging/reporting failures.
   */
  onError?: TriggerErrorHandler<InferEventType<TSource>>
}

/**
 * A defined trigger, returned by defineTrigger().
 *
 * @typeParam TSource - The trigger source type
 */
export interface TriggerDefinition<TSource extends TriggerSource = TriggerSource> {
  /** Internal marker identifying this as a trigger definition */
  readonly __brand: 'cloudwerk-trigger'

  /** Trigger name (derived from filename or explicitly set) */
  readonly name: string | undefined

  /** The event source configuration */
  readonly source: TSource

  /** Retry configuration */
  readonly retry: RetryConfig

  /** Execution timeout in milliseconds */
  readonly timeout: number

  /** The trigger handler function */
  readonly handle: TriggerHandler<InferEventType<TSource>>

  /** Optional error handler */
  readonly onError: TriggerErrorHandler<InferEventType<TSource>> | undefined
}

// ============================================================================
// Manifest Types (for scanner/compiler)
// ============================================================================

/**
 * A scanned trigger file from the app/triggers/ directory.
 */
export interface ScannedTrigger {
  /** Relative path from app/triggers/ (e.g., 'daily-cleanup.ts') */
  relativePath: string

  /** Absolute filesystem path */
  absolutePath: string

  /** File name without extension (e.g., 'daily-cleanup') */
  name: string

  /** File extension (e.g., '.ts') */
  extension: string

  /** If this is in a fan-out subdirectory, the group name */
  fanOutGroup?: string
}

/**
 * Result of scanning the app/triggers/ directory.
 */
export interface TriggerScanResult {
  /** All discovered trigger files */
  triggers: ScannedTrigger[]

  /** Fan-out groups detected (directory name -> trigger names) */
  fanOutGroups: Map<string, string[]>
}

/**
 * A compiled trigger entry in the manifest.
 */
export interface TriggerEntry {
  /** Trigger name derived from filename (e.g., 'dailyCleanup') */
  name: string

  /** Binding name for wrangler.toml (e.g., 'DAILY_CLEANUP_TRIGGER') */
  bindingName: string

  /** Relative path to the trigger definition file */
  filePath: string

  /** Absolute path to the trigger definition file */
  absolutePath: string

  /** Trigger source configuration */
  source: TriggerSource

  /** Whether onError handler is defined */
  hasOnError: boolean

  /** Retry configuration */
  retry?: RetryConfig

  /** Execution timeout */
  timeout?: number

  /** Fan-out group name (if part of a fan-out) */
  fanOutGroup?: string
}

/**
 * Error codes for trigger validation.
 */
export type TriggerErrorCode =
  | 'NO_HANDLER'
  | 'INVALID_SOURCE'
  | 'DUPLICATE_NAME'
  | 'INVALID_CRON'
  | 'INVALID_WEBHOOK_PATH'
  | 'INVALID_CONFIG'
  | 'INVALID_NAME'
  | 'MISSING_SOURCE'

/**
 * Warning codes for trigger validation.
 */
export type TriggerWarningCode =
  | 'NO_ERROR_HANDLER'
  | 'DUPLICATE_CRON'
  | 'SHORT_TIMEOUT'
  | 'MISSING_RETRY'
  | 'WEBHOOK_NO_VERIFY'

/**
 * Validation error for a trigger definition.
 */
export interface TriggerValidationError {
  /** Trigger file path */
  file: string

  /** Error message */
  message: string

  /** Error code for programmatic handling */
  code: TriggerErrorCode
}

/**
 * Validation warning for a trigger definition.
 */
export interface TriggerValidationWarning {
  /** Trigger file path */
  file: string

  /** Warning message */
  message: string

  /** Warning code */
  code: TriggerWarningCode
}

/**
 * Complete trigger manifest generated during build.
 */
export interface TriggerManifest {
  /** All compiled trigger entries */
  triggers: TriggerEntry[]

  /** Scheduled triggers grouped by cron expression */
  scheduled: Map<string, TriggerEntry[]>

  /** Queue triggers grouped by queue name */
  queues: Map<string, TriggerEntry[]>

  /** R2 triggers grouped by bucket name */
  r2: Map<string, TriggerEntry[]>

  /** Webhook triggers mapped by path */
  webhooks: Map<string, TriggerEntry>

  /** Email triggers mapped by address pattern */
  emails: Map<string, TriggerEntry>

  /** Validation errors (trigger won't be registered) */
  errors: TriggerValidationError[]

  /** Validation warnings (trigger will be registered with warning) */
  warnings: TriggerValidationWarning[]

  /** When the manifest was generated */
  generatedAt: Date

  /** Root directory of the app */
  rootDir: string
}
