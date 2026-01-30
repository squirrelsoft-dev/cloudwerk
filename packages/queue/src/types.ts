/**
 * @cloudwerk/queue - Type Definitions
 *
 * Core types for queue producers and consumers.
 */

import type { ZodType } from 'zod'

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Type that can be either a value or a Promise of that value.
 * Used throughout the queue package for async-friendly APIs.
 */
export type Awaitable<T> = T | Promise<T>

// ============================================================================
// Message Types
// ============================================================================

/**
 * Represents a message received from a queue for processing.
 *
 * @typeParam T - The message body type
 *
 * @example
 * ```typescript
 * export default defineQueue<EmailMessage>({
 *   async process(message) {
 *     console.log(message.id)        // Unique message ID
 *     console.log(message.body)      // { to, subject, body }
 *     console.log(message.attempts)  // Number of delivery attempts
 *
 *     await sendEmail(message.body)
 *     message.ack()  // Acknowledge successful processing
 *   }
 * })
 * ```
 */
export interface QueueMessage<T = unknown> {
  /** Unique identifier for the message */
  readonly id: string

  /** The message payload */
  readonly body: T

  /** When the message was originally sent */
  readonly timestamp: Date

  /** Number of delivery attempts for this message */
  readonly attempts: number

  /**
   * Acknowledge successful message processing.
   * The message will be removed from the queue.
   */
  ack(): void

  /**
   * Request retry of this message.
   * The message will be requeued with optional delay.
   *
   * @param options - Retry options
   * @param options.delaySeconds - Delay before retry (default: queue's retryDelay)
   */
  retry(options?: { delaySeconds?: number }): void

  /**
   * Mark this message as failed and send to dead letter queue.
   * Only works if DLQ is configured for this queue.
   *
   * @param reason - Reason for sending to DLQ
   */
  deadLetter(reason?: string): void
}

/**
 * Message sent to a dead letter queue when processing fails.
 *
 * @typeParam T - The original message body type
 *
 * @example
 * ```typescript
 * export default defineQueue<DeadLetterMessage<EmailMessage>>({
 *   name: 'email-dlq',
 *   async process(message) {
 *     // Log failed message for manual inspection
 *     await logFailedMessage({
 *       originalQueue: message.body.originalQueue,
 *       originalMessage: message.body.originalMessage,
 *       error: message.body.error,
 *       attempts: message.body.attempts,
 *     })
 *     message.ack()
 *   }
 * })
 * ```
 */
export interface DeadLetterMessage<T = unknown> {
  /** Name of the original queue that failed processing */
  originalQueue: string

  /** The original message that failed */
  originalMessage: T

  /** Error message from the last failure */
  error: string

  /** Error stack trace (if available) */
  stack?: string

  /** Number of processing attempts before DLQ */
  attempts: number

  /** ISO timestamp when the message was sent to DLQ */
  failedAt: string

  /** Original message ID */
  originalMessageId: string
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration for queue processing behavior.
 *
 * @example
 * ```typescript
 * export default defineQueue({
 *   config: {
 *     batchSize: 10,
 *     maxRetries: 5,
 *     retryDelay: '2m',
 *     deadLetterQueue: 'my-dlq',
 *     batchTimeout: '30s',
 *   },
 *   async process(message) {
 *     // ...
 *   }
 * })
 * ```
 */
export interface QueueProcessingConfig {
  /**
   * Maximum number of messages to deliver in a batch.
   * @default 10
   */
  batchSize?: number

  /**
   * Maximum number of retry attempts before sending to DLQ.
   * @default 3
   */
  maxRetries?: number

  /**
   * Delay between retries. Supports duration strings like '1m', '30s', '1h'.
   * @default '1m'
   */
  retryDelay?: string | number

  /**
   * Dead letter queue name for failed messages.
   * Messages exceeding maxRetries will be sent here.
   */
  deadLetterQueue?: string

  /**
   * Maximum time to wait for a batch to fill.
   * Supports duration strings like '5s', '30s'.
   * @default '5s'
   */
  batchTimeout?: string | number
}

/**
 * Full configuration for defining a queue consumer.
 *
 * @typeParam T - The message body type
 *
 * @example
 * ```typescript
 * // Simple queue with single message processing
 * export default defineQueue<EmailMessage>({
 *   async process(message) {
 *     await sendEmail(message.body)
 *     message.ack()
 *   }
 * })
 *
 * // Queue with batch processing and configuration
 * export default defineQueue<ImageJob>({
 *   config: {
 *     batchSize: 50,
 *     maxRetries: 5,
 *     deadLetterQueue: 'image-dlq',
 *   },
 *   async processBatch(messages) {
 *     const jobs = messages.map(m => m.body)
 *     await processImageBatch(jobs)
 *     messages.forEach(m => m.ack())
 *   }
 * })
 *
 * // Queue with Zod schema validation
 * export default defineQueue({
 *   schema: z.object({
 *     to: z.string().email(),
 *     subject: z.string(),
 *     body: z.string(),
 *   }),
 *   async process(message) {
 *     // message.body is validated and typed
 *     await sendEmail(message.body)
 *     message.ack()
 *   }
 * })
 * ```
 */
export interface QueueConfig<T = unknown> {
  /**
   * Optional queue name override.
   * By default, the queue name is derived from the filename.
   * - `app/queues/email.ts` -> `email`
   * - `app/queues/image-processing.ts` -> `imageProcessing`
   */
  name?: string

  /**
   * Optional Zod schema for runtime validation of message bodies.
   * If provided, messages that fail validation will be rejected.
   */
  schema?: ZodType<T>

  /**
   * Queue processing configuration.
   */
  config?: QueueProcessingConfig

  /**
   * Process a single message.
   * Called for each message in the batch unless processBatch is defined.
   *
   * @param message - The message to process
   */
  process?: (message: QueueMessage<T>) => Awaitable<void>

  /**
   * Process a batch of messages.
   * If defined, this is called instead of process() for the entire batch.
   * More efficient for bulk operations.
   *
   * @param messages - Array of messages to process
   */
  processBatch?: (messages: QueueMessage<T>[]) => Awaitable<void>

  /**
   * Error handler for processing failures.
   * Called when process() or processBatch() throws an error.
   *
   * @param error - The error that occurred
   * @param message - The message that was being processed (or first message in batch)
   */
  onError?: (error: Error, message: QueueMessage<T>) => Awaitable<void>
}

// ============================================================================
// Definition Types
// ============================================================================

/**
 * A defined queue consumer, returned by defineQueue().
 *
 * @typeParam T - The message body type
 */
export interface QueueDefinition<T = unknown> {
  /** Internal marker identifying this as a queue definition */
  readonly __brand: 'cloudwerk-queue'

  /** Queue name (derived from filename or explicitly set) */
  readonly name: string | undefined

  /** Zod schema for validation (if provided) */
  readonly schema: ZodType<T> | undefined

  /** Processing configuration */
  readonly config: QueueProcessingConfig

  /** Single message processor */
  readonly process: ((message: QueueMessage<T>) => Awaitable<void>) | undefined

  /** Batch message processor */
  readonly processBatch:
    | ((messages: QueueMessage<T>[]) => Awaitable<void>)
    | undefined

  /** Error handler */
  readonly onError:
    | ((error: Error, message: QueueMessage<T>) => Awaitable<void>)
    | undefined
}

// ============================================================================
// Producer Types
// ============================================================================

/**
 * Options for sending messages to a queue.
 */
export interface SendOptions {
  /**
   * Delay delivery of this message by the specified number of seconds.
   * The message will not be available for processing until after this delay.
   */
  delaySeconds?: number

  /**
   * Content type of the message body.
   * @default 'json'
   */
  contentType?: 'json' | 'text' | 'bytes' | 'v8'
}

/**
 * A typed queue producer for sending messages.
 *
 * @typeParam T - The message body type
 *
 * @example
 * ```typescript
 * import { queues } from '@cloudwerk/core/bindings'
 *
 * // Send a single message
 * await queues.email.send({
 *   to: 'user@example.com',
 *   subject: 'Welcome!',
 *   body: 'Thanks for signing up.',
 * })
 *
 * // Send with delay
 * await queues.email.send(message, { delaySeconds: 60 })
 *
 * // Send a batch
 * await queues.notifications.sendBatch([
 *   { userId: '1', event: 'login' },
 *   { userId: '2', event: 'purchase' },
 * ])
 * ```
 */
export interface Queue<T = unknown> {
  /**
   * Send a single message to the queue.
   *
   * @param message - The message body to send
   * @param options - Optional send options
   */
  send(message: T, options?: SendOptions): Promise<void>

  /**
   * Send multiple messages to the queue in a single operation.
   *
   * @param messages - Array of message bodies to send
   * @param options - Optional send options (applied to all messages)
   */
  sendBatch(messages: T[], options?: SendOptions): Promise<void>
}

// ============================================================================
// Manifest Types
// ============================================================================

/**
 * A scanned queue file from the app/queues/ directory.
 */
export interface ScannedQueue {
  /** Relative path from app/queues/ (e.g., 'email.ts') */
  relativePath: string

  /** Absolute filesystem path */
  absolutePath: string

  /** File name without extension (e.g., 'email') */
  name: string

  /** File extension (e.g., '.ts') */
  extension: string
}

/**
 * Result of scanning the app/queues/ directory.
 */
export interface QueueScanResult {
  /** All discovered queue files */
  queues: ScannedQueue[]
}

/**
 * A compiled queue entry in the manifest.
 */
export interface QueueEntry {
  /** Queue name derived from filename (e.g., 'email', 'imageProcessing') */
  name: string

  /** Binding name for wrangler.toml (e.g., 'EMAIL_QUEUE') */
  bindingName: string

  /** Actual queue name in Cloudflare (e.g., 'cloudwerk-email') */
  queueName: string

  /** Relative path to the queue definition file */
  filePath: string

  /** Absolute path to the queue definition file */
  absolutePath: string

  /** Processing configuration from the queue definition */
  config: QueueProcessingConfig

  /** Whether processBatch is defined */
  hasProcessBatch: boolean

  /** Whether onError handler is defined */
  hasOnError: boolean

  /** TypeScript type name for the message body (if extractable) */
  messageType?: string
}

/**
 * Validation error for a queue definition.
 */
export interface QueueValidationError {
  /** Queue file path */
  file: string

  /** Error message */
  message: string

  /** Error code for programmatic handling */
  code: 'NO_HANDLER' | 'INVALID_CONFIG' | 'DUPLICATE_NAME' | 'INVALID_NAME'
}

/**
 * Validation warning for a queue definition.
 */
export interface QueueValidationWarning {
  /** Queue file path */
  file: string

  /** Warning message */
  message: string

  /** Warning code */
  code: 'NO_DLQ' | 'LOW_RETRIES' | 'MISSING_ERROR_HANDLER'
}

/**
 * Complete queue manifest generated during build.
 */
export interface QueueManifest {
  /** All compiled queue entries */
  queues: QueueEntry[]

  /** Validation errors (queue won't be registered) */
  errors: QueueValidationError[]

  /** Validation warnings (queue will be registered with warning) */
  warnings: QueueValidationWarning[]

  /** When the manifest was generated */
  generatedAt: Date

  /** Root directory of the app */
  rootDir: string
}
