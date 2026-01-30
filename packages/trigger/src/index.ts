/**
 * @cloudwerk/trigger
 *
 * Event-driven triggers for Cloudwerk.
 *
 * Supports scheduled (cron), queue, R2, webhook, email, and more trigger types
 * with automatic discovery and configuration generation.
 *
 * @example
 * ```typescript
 * // Define a scheduled trigger (app/triggers/daily-cleanup.ts)
 * import { defineTrigger } from '@cloudwerk/trigger'
 *
 * export default defineTrigger({
 *   source: { type: 'scheduled', cron: '0 0 * * *' },
 *   async handle(event, ctx) {
 *     console.log(`[${ctx.traceId}] Running cleanup`)
 *     await cleanupOldRecords()
 *   }
 * })
 * ```
 *
 * @example
 * ```typescript
 * // Define an R2 trigger (app/triggers/process-uploads.ts)
 * import { defineTrigger } from '@cloudwerk/trigger'
 *
 * export default defineTrigger({
 *   source: {
 *     type: 'r2',
 *     bucket: 'uploads',
 *     events: ['object-create'],
 *   },
 *   retry: { maxAttempts: 5, delay: '30s' },
 *   async handle(event, ctx) {
 *     console.log(`New file: ${event.key}`)
 *     await processFile(event.key)
 *   }
 * })
 * ```
 *
 * @example
 * ```typescript
 * // Define a webhook trigger (app/triggers/stripe-webhook.ts)
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

// ============================================================================
// Type Exports
// ============================================================================

export type {
  // Utility types
  Awaitable,

  // Configuration types
  BatchConfig,
  RetryConfig,

  // Webhook verification
  WebhookVerificationResult,
  WebhookVerifier,

  // Source types
  R2EventType,
  D1EventType,
  QueueTriggerSource,
  ScheduledTriggerSource,
  R2TriggerSource,
  WebhookTriggerSource,
  EmailTriggerSource,
  D1TriggerSource,
  TailTriggerSource,
  TriggerSource,

  // Event types
  ScheduledEvent,
  QueueMessage,
  QueueBatchEvent,
  R2Event,
  WebhookEvent,
  EmailEvent,
  D1Event,
  TailEvent,
  TailLogEntry,

  // Type inference
  InferEventType,

  // Context and handlers
  TriggerContext,
  TriggerHandler,
  TriggerErrorHandler,

  // Definition types
  TriggerConfig,
  TriggerDefinition,

  // Manifest types (for tooling)
  ScannedTrigger,
  TriggerScanResult,
  TriggerEntry,
  TriggerErrorCode,
  TriggerWarningCode,
  TriggerValidationError,
  TriggerValidationWarning,
  TriggerManifest,
} from './types.js'

// ============================================================================
// Error Classes
// ============================================================================

export {
  TriggerError,
  TriggerConfigError,
  TriggerNoHandlerError,
  TriggerInvalidSourceError,
  TriggerInvalidCronError,
  TriggerInvalidWebhookPathError,
  TriggerContextError,
  TriggerNotFoundError,
  TriggerProcessingError,
  TriggerTimeoutError,
  TriggerMaxRetriesError,
  TriggerWebhookVerificationError,
} from './errors.js'

// ============================================================================
// Trigger Definition
// ============================================================================

export {
  defineTrigger,
  isTriggerDefinition,
  getTriggerSourceType,
  parseDuration,
} from './define-trigger.js'

// ============================================================================
// Webhook Verifiers
// ============================================================================

export {
  verifiers,
  stripe,
  stripeVerifier,
  github,
  githubVerifier,
  slack,
  slackVerifier,
  twilio,
  twilioVerifier,
  shopify,
  shopifyVerifier,
  linear,
  linearVerifier,
  custom,
  customVerifier,
} from './verifiers/index.js'

export type {
  StripeVerifierOptions,
} from './verifiers/stripe.js'

export type {
  SlackVerifierOptions,
} from './verifiers/slack.js'

export type {
  TwilioVerifierOptions,
} from './verifiers/twilio.js'

export type {
  SignatureEncoding,
  HashAlgorithm,
  CustomVerifierOptions,
} from './verifiers/custom.js'

// ============================================================================
// Trigger Chaining
// ============================================================================

export {
  emit,
  emitMany,
  runWithTriggerContext,
  getTriggerContext,
  getPendingEmissions,
  generateTraceId,
  createChildTraceId,
  defaultEmitter,
} from './emit.js'

export type {
  EmitOptions,
  EmitResult,
  PendingEmission,
  TriggerEmitter,
} from './emit.js'

// ============================================================================
// Observability
// ============================================================================

export {
  // Span utilities
  generateSpanId,
  createTriggerSpan,
  endTriggerSpan,
  addSpanEvent,
  setSpanAttributes,

  // Timer
  ExecutionTimer,

  // Reporters
  ConsoleMetricsReporter,
  NoOpMetricsReporter,

  // Collector
  MetricsCollector,

  // Metrics creation
  createTriggerMetrics,
} from './observability.js'

export type {
  TriggerMetrics,
  TriggerSpan,
  SpanEvent,
  MetricsReporter,
} from './observability.js'
