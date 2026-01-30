/**
 * @cloudwerk/trigger - Error Classes
 *
 * Custom error classes for trigger processing.
 */

// ============================================================================
// Base Error
// ============================================================================

/**
 * Base error class for trigger-related errors.
 */
export class TriggerError extends Error {
  /** Error code for programmatic handling */
  readonly code: string

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'TriggerError'
    this.code = code
  }
}

// ============================================================================
// Configuration Errors
// ============================================================================

/**
 * Error thrown when trigger configuration is invalid.
 *
 * @example
 * ```typescript
 * throw new TriggerConfigError('timeout must be a positive number', 'timeout')
 * ```
 */
export class TriggerConfigError extends TriggerError {
  /** The configuration field that is invalid */
  readonly field?: string

  constructor(message: string, field?: string) {
    super('CONFIG_ERROR', message)
    this.name = 'TriggerConfigError'
    this.field = field
  }
}

/**
 * Error thrown when no handler function is defined.
 */
export class TriggerNoHandlerError extends TriggerError {
  constructor(triggerName: string) {
    super(
      'NO_HANDLER',
      `Trigger '${triggerName}' must define a handle() function`
    )
    this.name = 'TriggerNoHandlerError'
  }
}

/**
 * Error thrown when the trigger source configuration is invalid.
 */
export class TriggerInvalidSourceError extends TriggerError {
  /** The source type that is invalid */
  readonly sourceType?: string

  constructor(message: string, sourceType?: string) {
    super('INVALID_SOURCE', message)
    this.name = 'TriggerInvalidSourceError'
    this.sourceType = sourceType
  }
}

/**
 * Error thrown when a cron expression is invalid.
 */
export class TriggerInvalidCronError extends TriggerError {
  /** The invalid cron expression */
  readonly cron: string

  constructor(cron: string, reason?: string) {
    super(
      'INVALID_CRON',
      `Invalid cron expression '${cron}'${reason ? `: ${reason}` : ''}`
    )
    this.name = 'TriggerInvalidCronError'
    this.cron = cron
  }
}

/**
 * Error thrown when a webhook path is invalid.
 */
export class TriggerInvalidWebhookPathError extends TriggerError {
  /** The invalid path */
  readonly path: string

  constructor(path: string, reason?: string) {
    super(
      'INVALID_WEBHOOK_PATH',
      `Invalid webhook path '${path}'${reason ? `: ${reason}` : ''}`
    )
    this.name = 'TriggerInvalidWebhookPathError'
    this.path = path
  }
}

// ============================================================================
// Runtime Errors
// ============================================================================

/**
 * Error thrown when accessing a trigger outside of execution context.
 */
export class TriggerContextError extends TriggerError {
  constructor() {
    super(
      'CONTEXT_ERROR',
      'Trigger context accessed outside of trigger execution. Context is only available during trigger handling.'
    )
    this.name = 'TriggerContextError'
  }
}

/**
 * Error thrown when a trigger binding is not found.
 */
export class TriggerNotFoundError extends TriggerError {
  /** The trigger name that was not found */
  readonly triggerName: string

  /** Available trigger names */
  readonly availableTriggers: string[]

  constructor(triggerName: string, availableTriggers: string[]) {
    const available =
      availableTriggers.length > 0
        ? `Available triggers: ${availableTriggers.join(', ')}`
        : 'No triggers are configured'

    super(
      'TRIGGER_NOT_FOUND',
      `Trigger '${triggerName}' not found. ${available}`
    )
    this.name = 'TriggerNotFoundError'
    this.triggerName = triggerName
    this.availableTriggers = availableTriggers
  }
}

/**
 * Error thrown when trigger processing fails.
 */
export class TriggerProcessingError extends TriggerError {
  /** The trigger name that failed */
  readonly triggerName: string

  /** Number of execution attempts */
  readonly attempts: number

  /** The event that was being processed (if available) */
  readonly event?: unknown

  constructor(
    message: string,
    triggerName: string,
    attempts: number,
    options?: ErrorOptions & { event?: unknown }
  ) {
    super('PROCESSING_ERROR', message, options)
    this.name = 'TriggerProcessingError'
    this.triggerName = triggerName
    this.attempts = attempts
    this.event = options?.event
  }
}

/**
 * Error thrown when a trigger execution times out.
 */
export class TriggerTimeoutError extends TriggerError {
  /** The trigger name that timed out */
  readonly triggerName: string

  /** Configured timeout in milliseconds */
  readonly timeoutMs: number

  constructor(triggerName: string, timeoutMs: number) {
    super(
      'TIMEOUT_ERROR',
      `Trigger '${triggerName}' execution exceeded timeout of ${timeoutMs}ms`
    )
    this.name = 'TriggerTimeoutError'
    this.triggerName = triggerName
    this.timeoutMs = timeoutMs
  }
}

/**
 * Error thrown when max retries are exceeded.
 */
export class TriggerMaxRetriesError extends TriggerError {
  /** The trigger name that exceeded retries */
  readonly triggerName: string

  /** Maximum retries configured */
  readonly maxRetries: number

  /** The original error that caused the failure */
  readonly originalError?: Error

  constructor(triggerName: string, maxRetries: number, originalError?: Error) {
    super(
      'MAX_RETRIES_EXCEEDED',
      `Trigger '${triggerName}' exceeded maximum retries (${maxRetries})`
    )
    this.name = 'TriggerMaxRetriesError'
    this.triggerName = triggerName
    this.maxRetries = maxRetries
    this.originalError = originalError
  }
}

// ============================================================================
// Webhook Errors
// ============================================================================

/**
 * Error thrown when webhook signature verification fails.
 */
export class TriggerWebhookVerificationError extends TriggerError {
  /** The trigger name */
  readonly triggerName: string

  /** The verification error message */
  readonly verificationError?: string

  constructor(triggerName: string, verificationError?: string) {
    super(
      'WEBHOOK_VERIFICATION_FAILED',
      `Webhook signature verification failed for trigger '${triggerName}'${
        verificationError ? `: ${verificationError}` : ''
      }`
    )
    this.name = 'TriggerWebhookVerificationError'
    this.triggerName = triggerName
    this.verificationError = verificationError
  }
}
