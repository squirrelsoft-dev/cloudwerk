/**
 * @cloudwerk/queue - defineQueue()
 *
 * Factory function for creating queue consumer definitions.
 */

import type {
  QueueConfig,
  QueueDefinition,
  QueueProcessingConfig,
} from './types.js'
import { QueueConfigError, QueueNoHandlerError } from './errors.js'

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: Required<QueueProcessingConfig> = {
  batchSize: 10,
  maxRetries: 3,
  retryDelay: '1m',
  deadLetterQueue: '',
  batchTimeout: '5s',
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Parse a duration string into seconds.
 *
 * Supports formats like:
 * - '30s' - 30 seconds
 * - '5m' - 5 minutes
 * - '1h' - 1 hour
 * - 60 - number of seconds
 *
 * @param duration - Duration string or number
 * @returns Duration in seconds
 */
export function parseDuration(duration: string | number): number {
  if (typeof duration === 'number') {
    return duration
  }

  const match = duration.match(/^(\d+)(s|m|h)$/)
  if (!match) {
    throw new QueueConfigError(
      `Invalid duration format: '${duration}'. Expected format like '30s', '5m', or '1h'`,
      'retryDelay'
    )
  }

  const value = parseInt(match[1], 10)
  const unit = match[2]

  switch (unit) {
    case 's':
      return value
    case 'm':
      return value * 60
    case 'h':
      return value * 3600
    default:
      throw new QueueConfigError(`Unknown duration unit: ${unit}`, 'retryDelay')
  }
}

/**
 * Validate queue configuration.
 *
 * @param config - Queue configuration to validate
 * @throws QueueConfigError if configuration is invalid
 * @throws QueueNoHandlerError if no handler is defined
 */
function validateConfig<T>(config: QueueConfig<T>): void {
  // Must have either process or processBatch
  if (!config.process && !config.processBatch) {
    throw new QueueNoHandlerError(config.name || 'unknown')
  }

  // Validate processing config
  if (config.config) {
    const { batchSize, maxRetries, retryDelay, batchTimeout } = config.config

    if (batchSize !== undefined) {
      if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100) {
        throw new QueueConfigError(
          'batchSize must be an integer between 1 and 100',
          'batchSize'
        )
      }
    }

    if (maxRetries !== undefined) {
      if (!Number.isInteger(maxRetries) || maxRetries < 0 || maxRetries > 100) {
        throw new QueueConfigError(
          'maxRetries must be an integer between 0 and 100',
          'maxRetries'
        )
      }
    }

    if (retryDelay !== undefined) {
      // This will throw if invalid
      parseDuration(retryDelay)
    }

    if (batchTimeout !== undefined) {
      // This will throw if invalid
      parseDuration(batchTimeout)
    }
  }

  // Validate name if provided
  if (config.name !== undefined) {
    if (typeof config.name !== 'string' || config.name.length === 0) {
      throw new QueueConfigError('name must be a non-empty string', 'name')
    }

    // Queue names should be lowercase alphanumeric with hyphens
    if (!/^[a-z][a-z0-9-]*$/.test(config.name)) {
      throw new QueueConfigError(
        'name must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens',
        'name'
      )
    }
  }
}

// ============================================================================
// defineQueue()
// ============================================================================

/**
 * Define a queue consumer.
 *
 * This function creates a queue definition that will be automatically
 * discovered and registered by Cloudwerk during build.
 *
 * @typeParam T - The message body type
 * @param config - Queue configuration
 * @returns Queue definition
 *
 * @example
 * ```typescript
 * // app/queues/email.ts
 * import { defineQueue } from '@cloudwerk/queue'
 *
 * interface EmailMessage {
 *   to: string
 *   subject: string
 *   body: string
 * }
 *
 * export default defineQueue<EmailMessage>({
 *   async process(message) {
 *     await sendEmail(message.body)
 *     message.ack()
 *   }
 * })
 * ```
 *
 * @example
 * ```typescript
 * // With Zod schema validation
 * import { defineQueue } from '@cloudwerk/queue'
 * import { z } from 'zod'
 *
 * const EmailSchema = z.object({
 *   to: z.string().email(),
 *   subject: z.string().min(1),
 *   body: z.string(),
 * })
 *
 * export default defineQueue({
 *   schema: EmailSchema,
 *   config: {
 *     maxRetries: 5,
 *     deadLetterQueue: 'email-dlq',
 *   },
 *   async process(message) {
 *     // message.body is validated and typed as { to: string, subject: string, body: string }
 *     await sendEmail(message.body)
 *     message.ack()
 *   },
 *   async onError(error, message) {
 *     console.error(`Failed to send email to ${message.body.to}:`, error)
 *   }
 * })
 * ```
 *
 * @example
 * ```typescript
 * // Batch processing
 * import { defineQueue } from '@cloudwerk/queue'
 *
 * interface ImageJob {
 *   imageId: string
 *   operation: 'resize' | 'crop' | 'compress'
 *   params: Record<string, unknown>
 * }
 *
 * export default defineQueue<ImageJob>({
 *   config: {
 *     batchSize: 50,
 *     batchTimeout: '30s',
 *   },
 *   async processBatch(messages) {
 *     // Process all images in parallel for efficiency
 *     await Promise.all(
 *       messages.map(async (msg) => {
 *         await processImage(msg.body)
 *         msg.ack()
 *       })
 *     )
 *   }
 * })
 * ```
 */
export function defineQueue<T = unknown>(
  config: QueueConfig<T>
): QueueDefinition<T> {
  // Validate configuration
  validateConfig(config)

  // Merge with defaults
  const mergedConfig: QueueProcessingConfig = {
    ...DEFAULT_CONFIG,
    ...config.config,
  }

  // Create the definition object
  const definition: QueueDefinition<T> = {
    __brand: 'cloudwerk-queue',
    name: config.name,
    schema: config.schema,
    config: mergedConfig,
    process: config.process,
    processBatch: config.processBatch,
    onError: config.onError,
  }

  return definition
}

/**
 * Check if a value is a queue definition created by defineQueue().
 *
 * @param value - Value to check
 * @returns true if value is a QueueDefinition
 */
export function isQueueDefinition(value: unknown): value is QueueDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__brand' in value &&
    (value as QueueDefinition).__brand === 'cloudwerk-queue'
  )
}
