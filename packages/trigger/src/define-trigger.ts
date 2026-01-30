/**
 * @cloudwerk/trigger - defineTrigger()
 *
 * Factory function for creating trigger definitions.
 */

import type {
  TriggerConfig,
  TriggerDefinition,
  TriggerSource,
  RetryConfig,
  WebhookTriggerSource,
  ScheduledTriggerSource,
} from './types.js'
import {
  TriggerConfigError,
  TriggerNoHandlerError,
  TriggerInvalidSourceError,
  TriggerInvalidCronError,
  TriggerInvalidWebhookPathError,
} from './errors.js'

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  delay: '1m',
  backoff: 'linear',
}

const DEFAULT_TIMEOUT = 30000 // 30 seconds

// ============================================================================
// Duration Parsing
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
    throw new TriggerConfigError(
      `Invalid duration format: '${duration}'. Expected format like '30s', '5m', or '1h'`,
      'duration'
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
      throw new TriggerConfigError(`Unknown duration unit: ${unit}`, 'duration')
  }
}

// ============================================================================
// Cron Validation
// ============================================================================

/**
 * Basic cron expression validation.
 *
 * Validates that the cron expression has the expected format.
 * Full validation is left to the runtime.
 *
 * @param cron - Cron expression to validate
 * @throws TriggerInvalidCronError if invalid
 */
function validateCron(cron: string): void {
  const parts = cron.trim().split(/\s+/)

  // Standard cron has 5 fields, extended has 6
  if (parts.length < 5 || parts.length > 6) {
    throw new TriggerInvalidCronError(
      cron,
      `Expected 5 or 6 fields, got ${parts.length}`
    )
  }

  // Basic validation of each field
  const fieldNames = ['minute', 'hour', 'day of month', 'month', 'day of week']
  if (parts.length === 6) {
    fieldNames.unshift('second')
  }

  const validChars = /^[\d,\-*/]+$/

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    // Allow wildcards and special characters
    if (part !== '*' && part !== '?' && !validChars.test(part)) {
      throw new TriggerInvalidCronError(
        cron,
        `Invalid characters in ${fieldNames[i]} field: '${part}'`
      )
    }
  }
}

// ============================================================================
// Webhook Path Validation
// ============================================================================

/**
 * Validate a webhook path.
 *
 * @param path - Path to validate
 * @throws TriggerInvalidWebhookPathError if invalid
 */
function validateWebhookPath(path: string): void {
  if (!path) {
    throw new TriggerInvalidWebhookPathError(path, 'Path cannot be empty')
  }

  if (!path.startsWith('/')) {
    throw new TriggerInvalidWebhookPathError(
      path,
      'Path must start with /'
    )
  }

  // Check for invalid characters
  const validPath = /^[a-zA-Z0-9\-_/:.]+$/
  if (!validPath.test(path)) {
    throw new TriggerInvalidWebhookPathError(
      path,
      'Path contains invalid characters'
    )
  }

  // Check for double slashes
  if (path.includes('//')) {
    throw new TriggerInvalidWebhookPathError(
      path,
      'Path cannot contain double slashes'
    )
  }
}

// ============================================================================
// Source Validation
// ============================================================================

/**
 * Validate the trigger source configuration.
 *
 * @param source - Source configuration to validate
 * @throws TriggerInvalidSourceError if invalid
 */
function validateSource(source: TriggerSource): void {
  if (!source || typeof source !== 'object') {
    throw new TriggerInvalidSourceError('Source must be an object')
  }

  if (!('type' in source)) {
    throw new TriggerInvalidSourceError('Source must have a type property')
  }

  switch (source.type) {
    case 'scheduled':
      validateScheduledSource(source as ScheduledTriggerSource)
      break
    case 'queue':
      if (!source.queue || typeof source.queue !== 'string') {
        throw new TriggerInvalidSourceError(
          'Queue source must specify a queue name',
          'queue'
        )
      }
      break
    case 'r2': {
      if (!source.bucket || typeof source.bucket !== 'string') {
        throw new TriggerInvalidSourceError(
          'R2 source must specify a bucket name',
          'r2'
        )
      }
      if (!Array.isArray(source.events) || source.events.length === 0) {
        throw new TriggerInvalidSourceError(
          'R2 source must specify at least one event type',
          'r2'
        )
      }
      const validR2Events = ['object-create', 'object-delete']
      for (const event of source.events) {
        if (!validR2Events.includes(event)) {
          throw new TriggerInvalidSourceError(
            `Invalid R2 event type: '${event}'. Valid types: ${validR2Events.join(', ')}`,
            'r2'
          )
        }
      }
      break
    }
    case 'webhook':
      validateWebhookSource(source as WebhookTriggerSource)
      break
    case 'email':
      if (!source.address || typeof source.address !== 'string') {
        throw new TriggerInvalidSourceError(
          'Email source must specify an address pattern',
          'email'
        )
      }
      break
    case 'd1':
      if (!source.database || typeof source.database !== 'string') {
        throw new TriggerInvalidSourceError(
          'D1 source must specify a database name',
          'd1'
        )
      }
      if (!source.table || typeof source.table !== 'string') {
        throw new TriggerInvalidSourceError(
          'D1 source must specify a table name',
          'd1'
        )
      }
      if (!Array.isArray(source.events) || source.events.length === 0) {
        throw new TriggerInvalidSourceError(
          'D1 source must specify at least one event type',
          'd1'
        )
      }
      break
    case 'tail':
      if (!Array.isArray(source.consumers) || source.consumers.length === 0) {
        throw new TriggerInvalidSourceError(
          'Tail source must specify at least one consumer',
          'tail'
        )
      }
      break
    default:
      throw new TriggerInvalidSourceError(
        `Unknown source type: '${(source as TriggerSource).type}'`
      )
  }
}

function validateScheduledSource(source: ScheduledTriggerSource): void {
  if (!source.cron || typeof source.cron !== 'string') {
    throw new TriggerInvalidSourceError(
      'Scheduled source must specify a cron expression',
      'scheduled'
    )
  }
  validateCron(source.cron)
}

function validateWebhookSource(source: WebhookTriggerSource): void {
  if (!source.path) {
    throw new TriggerInvalidSourceError(
      'Webhook source must specify a path',
      'webhook'
    )
  }
  validateWebhookPath(source.path)

  if (source.methods) {
    const validMethods = ['POST', 'PUT', 'PATCH']
    for (const method of source.methods) {
      if (!validMethods.includes(method)) {
        throw new TriggerInvalidSourceError(
          `Invalid webhook method: '${method}'. Valid methods: ${validMethods.join(', ')}`,
          'webhook'
        )
      }
    }
  }
}

// ============================================================================
// Configuration Validation
// ============================================================================

/**
 * Validate trigger configuration.
 *
 * @param config - Trigger configuration to validate
 * @throws TriggerConfigError if configuration is invalid
 * @throws TriggerNoHandlerError if no handler is defined
 */
function validateConfig<TSource extends TriggerSource>(
  config: TriggerConfig<TSource>
): void {
  // Must have a handler
  if (!config.handle || typeof config.handle !== 'function') {
    throw new TriggerNoHandlerError(config.name || 'unknown')
  }

  // Must have a source
  if (!config.source) {
    throw new TriggerInvalidSourceError('Trigger must have a source')
  }

  // Validate source
  validateSource(config.source)

  // Validate retry config
  if (config.retry) {
    const { maxAttempts, delay, backoff } = config.retry

    if (maxAttempts !== undefined) {
      if (!Number.isInteger(maxAttempts) || maxAttempts < 0 || maxAttempts > 100) {
        throw new TriggerConfigError(
          'maxAttempts must be an integer between 0 and 100',
          'maxAttempts'
        )
      }
    }

    if (delay !== undefined) {
      // This will throw if invalid
      parseDuration(delay)
    }

    if (backoff !== undefined && backoff !== 'linear' && backoff !== 'exponential') {
      throw new TriggerConfigError(
        `Invalid backoff strategy: '${backoff}'. Valid strategies: 'linear', 'exponential'`,
        'backoff'
      )
    }
  }

  // Validate timeout
  if (config.timeout !== undefined) {
    if (typeof config.timeout !== 'number' || config.timeout <= 0) {
      throw new TriggerConfigError(
        'timeout must be a positive number (milliseconds)',
        'timeout'
      )
    }

    // Warn about long timeouts (but don't error)
    // Cloudflare Workers have limits on execution time
    if (config.timeout > 600000) {
      throw new TriggerConfigError(
        'timeout cannot exceed 600000ms (10 minutes)',
        'timeout'
      )
    }
  }

  // Validate name if provided
  if (config.name !== undefined) {
    if (typeof config.name !== 'string' || config.name.length === 0) {
      throw new TriggerConfigError('name must be a non-empty string', 'name')
    }

    // Trigger names should be lowercase alphanumeric with hyphens
    if (!/^[a-z][a-z0-9-]*$/.test(config.name)) {
      throw new TriggerConfigError(
        'name must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens',
        'name'
      )
    }
  }

  // Validate onError if provided
  if (config.onError !== undefined && typeof config.onError !== 'function') {
    throw new TriggerConfigError('onError must be a function', 'onError')
  }
}

// ============================================================================
// defineTrigger()
// ============================================================================

/**
 * Define a trigger consumer.
 *
 * This function creates a trigger definition that will be automatically
 * discovered and registered by Cloudwerk during build.
 *
 * @typeParam TSource - The trigger source type
 * @param config - Trigger configuration
 * @returns Trigger definition
 *
 * @example
 * ```typescript
 * // app/triggers/daily-cleanup.ts
 * import { defineTrigger } from '@cloudwerk/trigger'
 *
 * export default defineTrigger({
 *   source: { type: 'scheduled', cron: '0 0 * * *' },
 *   async handle(event, ctx) {
 *     console.log(`[${ctx.traceId}] Running cleanup at ${event.scheduledTime}`)
 *     await cleanupOldRecords()
 *   }
 * })
 * ```
 *
 * @example
 * ```typescript
 * // app/triggers/process-uploads.ts
 * import { defineTrigger } from '@cloudwerk/trigger'
 *
 * export default defineTrigger({
 *   source: {
 *     type: 'r2',
 *     bucket: 'uploads',
 *     events: ['object-create'],
 *     prefix: 'images/',
 *   },
 *   retry: { maxAttempts: 5, delay: '30s' },
 *   async handle(event, ctx) {
 *     console.log(`New file: ${event.key}`)
 *     await processImage(event.key)
 *   },
 *   async onError(error, event, ctx) {
 *     await reportError(error, { key: event.key, traceId: ctx.traceId })
 *   }
 * })
 * ```
 *
 * @example
 * ```typescript
 * // app/triggers/stripe-webhook.ts
 * import { defineTrigger, verifiers } from '@cloudwerk/trigger'
 *
 * export default defineTrigger({
 *   source: {
 *     type: 'webhook',
 *     path: '/webhooks/stripe',
 *     verify: verifiers.stripe(STRIPE_WEBHOOK_SECRET),
 *   },
 *   async handle(event, ctx) {
 *     switch (event.payload.type) {
 *       case 'checkout.session.completed':
 *         await handleCheckoutComplete(event.payload)
 *         break
 *     }
 *   }
 * })
 * ```
 */
export function defineTrigger<TSource extends TriggerSource>(
  config: TriggerConfig<TSource>
): TriggerDefinition<TSource> {
  // Validate configuration
  validateConfig(config)

  // Merge retry config with defaults
  const mergedRetryConfig: Required<RetryConfig> = {
    ...DEFAULT_RETRY_CONFIG,
    ...config.retry,
  }

  // Create the definition object
  const definition: TriggerDefinition<TSource> = {
    __brand: 'cloudwerk-trigger',
    name: config.name,
    source: config.source,
    retry: mergedRetryConfig,
    timeout: config.timeout ?? DEFAULT_TIMEOUT,
    handle: config.handle,
    onError: config.onError,
  }

  return definition
}

/**
 * Check if a value is a trigger definition created by defineTrigger().
 *
 * @param value - Value to check
 * @returns true if value is a TriggerDefinition
 */
export function isTriggerDefinition(value: unknown): value is TriggerDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__brand' in value &&
    (value as TriggerDefinition).__brand === 'cloudwerk-trigger'
  )
}

/**
 * Get the source type from a trigger definition.
 *
 * @param definition - Trigger definition
 * @returns The source type string
 */
export function getTriggerSourceType(
  definition: TriggerDefinition
): TriggerSource['type'] {
  return definition.source.type
}
