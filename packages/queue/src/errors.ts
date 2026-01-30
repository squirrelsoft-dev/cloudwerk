/**
 * @cloudwerk/queue - Error Classes
 *
 * Custom error classes for queue processing.
 */

// ============================================================================
// Base Error
// ============================================================================

/**
 * Base error class for queue-related errors.
 */
export class QueueError extends Error {
  /** Error code for programmatic handling */
  readonly code: string

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'QueueError'
    this.code = code
  }
}

// ============================================================================
// Validation Errors
// ============================================================================

/**
 * Error thrown when a queue message fails schema validation.
 *
 * @example
 * ```typescript
 * export default defineQueue({
 *   schema: z.object({ email: z.string().email() }),
 *   async process(message) {
 *     // If message.body doesn't match schema, QueueValidationError is thrown
 *   }
 * })
 * ```
 */
export class QueueValidationError extends QueueError {
  /** The validation errors from Zod */
  readonly validationErrors: unknown[]

  constructor(message: string, validationErrors: unknown[]) {
    super('VALIDATION_ERROR', message)
    this.name = 'QueueValidationError'
    this.validationErrors = validationErrors
  }
}

// ============================================================================
// Processing Errors
// ============================================================================

/**
 * Error thrown when queue message processing fails.
 */
export class QueueProcessingError extends QueueError {
  /** The message ID that failed processing */
  readonly messageId: string

  /** Number of attempts made */
  readonly attempts: number

  constructor(
    message: string,
    messageId: string,
    attempts: number,
    options?: ErrorOptions
  ) {
    super('PROCESSING_ERROR', message, options)
    this.name = 'QueueProcessingError'
    this.messageId = messageId
    this.attempts = attempts
  }
}

/**
 * Error thrown when max retries are exceeded.
 */
export class QueueMaxRetriesError extends QueueError {
  /** The message ID that exceeded retries */
  readonly messageId: string

  /** Maximum retries configured */
  readonly maxRetries: number

  constructor(messageId: string, maxRetries: number) {
    super(
      'MAX_RETRIES_EXCEEDED',
      `Message ${messageId} exceeded maximum retries (${maxRetries})`
    )
    this.name = 'QueueMaxRetriesError'
    this.messageId = messageId
    this.maxRetries = maxRetries
  }
}

// ============================================================================
// Configuration Errors
// ============================================================================

/**
 * Error thrown when queue configuration is invalid.
 */
export class QueueConfigError extends QueueError {
  /** The configuration field that is invalid */
  readonly field?: string

  constructor(message: string, field?: string) {
    super('CONFIG_ERROR', message)
    this.name = 'QueueConfigError'
    this.field = field
  }
}

/**
 * Error thrown when no message handler is defined.
 */
export class QueueNoHandlerError extends QueueError {
  constructor(queueName: string) {
    super(
      'NO_HANDLER',
      `Queue '${queueName}' must define either process() or processBatch()`
    )
    this.name = 'QueueNoHandlerError'
  }
}

// ============================================================================
// Runtime Errors
// ============================================================================

/**
 * Error thrown when accessing a queue outside of request context.
 */
export class QueueContextError extends QueueError {
  constructor() {
    super(
      'CONTEXT_ERROR',
      'Queue accessed outside of request handler. Queues can only be accessed during request handling.'
    )
    this.name = 'QueueContextError'
  }
}

/**
 * Error thrown when a queue binding is not found.
 */
export class QueueNotFoundError extends QueueError {
  /** The queue name that was not found */
  readonly queueName: string

  /** Available queue names */
  readonly availableQueues: string[]

  constructor(queueName: string, availableQueues: string[]) {
    const available =
      availableQueues.length > 0
        ? `Available queues: ${availableQueues.join(', ')}`
        : 'No queues are configured'

    super(
      'QUEUE_NOT_FOUND',
      `Queue '${queueName}' not found in environment. ${available}`
    )
    this.name = 'QueueNotFoundError'
    this.queueName = queueName
    this.availableQueues = availableQueues
  }
}
