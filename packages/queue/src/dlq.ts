/**
 * @cloudwerk/queue - Dead Letter Queue Utilities
 *
 * Utilities for working with dead letter queues.
 */

import type { DeadLetterMessage, QueueMessage, Awaitable } from './types.js'

// ============================================================================
// DLQ Message Creation
// ============================================================================

/**
 * Create a dead letter message from a failed queue message.
 *
 * @param originalMessage - The original message that failed processing
 * @param originalQueue - Name of the queue where the message failed
 * @param error - The error that caused the failure
 * @returns Dead letter message ready to be sent to DLQ
 *
 * @example
 * ```typescript
 * import { createDeadLetterMessage } from '@cloudwerk/queue'
 *
 * export default defineQueue<EmailMessage>({
 *   config: {
 *     deadLetterQueue: 'email-dlq',
 *   },
 *   async process(message) {
 *     try {
 *       await sendEmail(message.body)
 *       message.ack()
 *     } catch (error) {
 *       // Message will automatically go to DLQ after max retries
 *       // Or manually send to DLQ:
 *       message.deadLetter(error.message)
 *     }
 *   }
 * })
 * ```
 */
export function createDeadLetterMessage<T>(
  originalMessage: QueueMessage<T>,
  originalQueue: string,
  error: Error
): DeadLetterMessage<T> {
  return {
    originalQueue,
    originalMessage: originalMessage.body,
    error: error.message,
    stack: error.stack,
    attempts: originalMessage.attempts,
    failedAt: new Date().toISOString(),
    originalMessageId: originalMessage.id,
  }
}

// ============================================================================
// DLQ Configuration
// ============================================================================

/**
 * Configuration for dead letter queue handling.
 */
export interface DLQConfig {
  /**
   * Name of the dead letter queue.
   */
  queueName: string

  /**
   * Maximum retries before sending to DLQ.
   * @default 3
   */
  maxRetries?: number

  /**
   * Custom handler called before sending to DLQ.
   * Return false to prevent the message from being sent to DLQ.
   */
  beforeDLQ?: <T>(
    message: QueueMessage<T>,
    error: Error
  ) => Awaitable<boolean | void>

  /**
   * Custom handler called after sending to DLQ.
   */
  afterDLQ?: <T>(
    dlqMessage: DeadLetterMessage<T>
  ) => Awaitable<void>
}

/**
 * Create DLQ configuration with defaults.
 *
 * @param queueName - Name of the dead letter queue
 * @param options - Optional configuration overrides
 * @returns Complete DLQ configuration
 */
export function createDLQConfig(
  queueName: string,
  options?: Partial<Omit<DLQConfig, 'queueName'>>
): DLQConfig {
  return {
    queueName,
    maxRetries: options?.maxRetries ?? 3,
    beforeDLQ: options?.beforeDLQ,
    afterDLQ: options?.afterDLQ,
  }
}

// ============================================================================
// DLQ Validation
// ============================================================================

/**
 * Validate DLQ configuration.
 *
 * @param config - DLQ configuration to validate
 * @returns Array of validation error messages (empty if valid)
 */
export function validateDLQConfig(config: DLQConfig): string[] {
  const errors: string[] = []

  if (!config.queueName || config.queueName.trim() === '') {
    errors.push('DLQ queue name is required')
  }

  if (config.queueName && !/^[a-z][a-z0-9-]*$/.test(config.queueName)) {
    errors.push(
      'DLQ queue name must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens'
    )
  }

  if (config.maxRetries !== undefined) {
    if (!Number.isInteger(config.maxRetries) || config.maxRetries < 0) {
      errors.push('maxRetries must be a non-negative integer')
    }
  }

  return errors
}

// ============================================================================
// DLQ Processing Helpers
// ============================================================================

/**
 * Check if a message should be sent to DLQ based on attempts.
 *
 * @param message - The queue message
 * @param maxRetries - Maximum retry attempts (default: 3)
 * @returns true if message has exceeded max retries
 */
export function shouldSendToDLQ<T>(
  message: QueueMessage<T>,
  maxRetries: number = 3
): boolean {
  return message.attempts > maxRetries
}

/**
 * Extract original message from a DLQ message.
 *
 * @param dlqMessage - Dead letter message
 * @returns The original message body
 */
export function extractOriginalMessage<T>(
  dlqMessage: DeadLetterMessage<T>
): T {
  return dlqMessage.originalMessage
}

/**
 * Check if a message is a dead letter message.
 *
 * @param message - Message to check
 * @returns true if message is a DeadLetterMessage
 */
export function isDeadLetterMessage(
  message: unknown
): message is DeadLetterMessage {
  if (typeof message !== 'object' || message === null) {
    return false
  }

  const dlm = message as Record<string, unknown>
  return (
    typeof dlm.originalQueue === 'string' &&
    'originalMessage' in dlm &&
    typeof dlm.error === 'string' &&
    typeof dlm.attempts === 'number' &&
    typeof dlm.failedAt === 'string' &&
    typeof dlm.originalMessageId === 'string'
  )
}

// ============================================================================
// DLQ Queue Definition Helper
// ============================================================================

/**
 * Create a DLQ consumer configuration.
 *
 * This is a convenience helper for defining DLQ consumers with appropriate
 * defaults and error handling.
 *
 * @param handler - Handler for processing dead letter messages
 * @returns Queue config for the DLQ consumer
 *
 * @example
 * ```typescript
 * // app/queues/email-dlq.ts
 * import { defineDLQConsumer } from '@cloudwerk/queue'
 *
 * export default defineDLQConsumer<EmailMessage>(async (dlqMessage) => {
 *   // Log failed message for manual inspection
 *   await logFailedMessage({
 *     queue: dlqMessage.originalQueue,
 *     error: dlqMessage.error,
 *     attempts: dlqMessage.attempts,
 *     message: dlqMessage.originalMessage,
 *   })
 *
 *   // Optionally alert on critical failures
 *   if (dlqMessage.attempts > 10) {
 *     await sendAlert(`Critical: ${dlqMessage.originalQueue} message failed`)
 *   }
 * })
 * ```
 */
export function defineDLQConsumer<T>(
  handler: (dlqMessage: DeadLetterMessage<T>) => Awaitable<void>
): {
  config: { maxRetries: number }
  process: (message: QueueMessage<DeadLetterMessage<T>>) => Promise<void>
} {
  return {
    config: {
      // DLQ consumers typically shouldn't retry much
      // to avoid infinite loops
      maxRetries: 1,
    },
    async process(message: QueueMessage<DeadLetterMessage<T>>) {
      await handler(message.body)
      message.ack()
    },
  }
}
