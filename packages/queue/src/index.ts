/**
 * @cloudwerk/queue
 *
 * Queue producers and consumers for Cloudwerk.
 *
 * @example
 * ```typescript
 * // Define a queue consumer (app/queues/email.ts)
 * import { defineQueue } from '@cloudwerk/queue'
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
 * // Send messages from route handlers
 * import { queues } from '@cloudwerk/core/bindings'
 *
 * export async function POST(request: Request) {
 *   const data = await request.json()
 *   await queues.email.send({
 *     to: data.email,
 *     subject: 'Welcome!',
 *     body: 'Thanks for signing up.',
 *   })
 *   return json({ success: true })
 * }
 * ```
 */

export * from './types.js'

// ============================================================================
// Error Classes
// ============================================================================

export {
  QueueError,
  QueueValidationError,
  QueueProcessingError,
  QueueMaxRetriesError,
  QueueConfigError,
  QueueNoHandlerError,
  QueueContextError,
  QueueNotFoundError,
} from './errors.js'

// ============================================================================
// Queue Definition
// ============================================================================

export { defineQueue, isQueueDefinition, parseDuration } from './define-queue.js'

// ============================================================================
// Dead Letter Queue Utilities
// ============================================================================

export {
  // DLQ Message Creation
  createDeadLetterMessage,

  // DLQ Configuration
  createDLQConfig,
  validateDLQConfig,

  // DLQ Processing Helpers
  shouldSendToDLQ,
  extractOriginalMessage,
  isDeadLetterMessage,

  // DLQ Consumer Helper
  defineDLQConsumer,

  // Types
  type DLQConfig,
} from './dlq.js'
