/**
 * @cloudwerk/trigger/testing
 *
 * Testing utilities for Cloudwerk triggers.
 *
 * @example
 * ```typescript
 * import { testTrigger, mockEvent } from '@cloudwerk/trigger/testing'
 * import processUploads from '../app/triggers/process-uploads'
 *
 * describe('process-uploads', () => {
 *   it('processes uploads', async () => {
 *     const result = await testTrigger(processUploads, {
 *       event: mockEvent.r2({
 *         type: 'object-create',
 *         bucket: 'uploads',
 *         key: 'test.pdf'
 *       }),
 *     })
 *
 *     expect(result.success).toBe(true)
 *   })
 * })
 * ```
 */

import type {
  TriggerDefinition,
  TriggerContext,
  ScheduledEvent,
  QueueBatchEvent,
  QueueMessage,
  R2Event,
  WebhookEvent,
  EmailEvent,
} from '../types.js'

// ============================================================================
// Types
// ============================================================================

/**
 * Options for testing a trigger.
 */
export interface TestTriggerOptions<TEvent> {
  /** The event to pass to the trigger */
  event: TEvent
  /** Mock bindings (env) */
  bindings?: Record<string, unknown>
  /** Custom trace ID */
  traceId?: string
}

/**
 * Result of testing a trigger.
 */
export interface TestTriggerResult {
  /** Whether the trigger executed successfully */
  success: boolean
  /** Error thrown by the trigger (if any) */
  error?: Error
  /** Whether onError handler was called */
  errorHandlerCalled: boolean
  /** Promises passed to waitUntil */
  waitUntilPromises: Promise<unknown>[]
}

// ============================================================================
// Mock Event Factories
// ============================================================================

/**
 * Create a mock scheduled event.
 */
function createScheduledEvent(
  options: Partial<ScheduledEvent> & { cron?: string }
): ScheduledEvent {
  const noRetryFn = () => {}

  return {
    cron: options.cron ?? '* * * * *',
    scheduledTime: options.scheduledTime ?? Date.now(),
    noRetry: options.noRetry ?? (() => {
      noRetryFn()
    }),
  }
}

/**
 * Create a mock queue message.
 */
function createQueueMessage<T>(
  body: T,
  options: Partial<Omit<QueueMessage<T>, 'body'>> = {}
): QueueMessage<T> {
  return {
    id: options.id ?? crypto.randomUUID(),
    body,
    timestamp: options.timestamp ?? new Date(),
    attempts: options.attempts ?? 1,
    ack: options.ack ?? (() => {}),
    retry: options.retry ?? (() => {}),
  }
}

/**
 * Create a mock queue batch event.
 */
function createQueueBatchEvent<T>(
  options: { messages?: T[]; queue?: string; ackAll?: () => void; retryAll?: () => void }
): QueueBatchEvent<T> {
  const messages: QueueMessage<T>[] = (options.messages ?? []).map((body) =>
    createQueueMessage(body)
  )

  return {
    messages,
    queue: options.queue ?? 'test-queue',
    ackAll: options.ackAll ?? (() => {}),
    retryAll: options.retryAll ?? (() => {}),
  }
}

/**
 * Create a mock R2 event.
 */
function createR2Event(options: Partial<R2Event>): R2Event {
  return {
    type: options.type ?? 'object-create',
    bucket: options.bucket ?? 'test-bucket',
    key: options.key ?? 'test-key',
    etag: options.etag,
    size: options.size,
    uploadedAt: options.uploadedAt,
    account: options.account ?? 'test-account',
    eventId: options.eventId ?? crypto.randomUUID(),
  }
}

/**
 * Create a mock webhook event.
 */
function createWebhookEvent<T>(
  options: Partial<WebhookEvent<T>> & { payload?: T }
): WebhookEvent<T> {
  return {
    payload: options.payload ?? ({} as T),
    headers: options.headers ?? new Headers(),
    signature: options.signature ?? null,
    rawBody: options.rawBody ?? new ArrayBuffer(0),
    verified: options.verified ?? true,
    method: options.method ?? 'POST',
    path: options.path ?? '/webhook',
  }
}

/**
 * Create a mock email event.
 */
function createEmailEvent(options: Partial<EmailEvent>): EmailEvent {
  return {
    from: options.from ?? 'sender@example.com',
    to: options.to ?? 'recipient@example.com',
    subject: options.subject ?? 'Test Email',
    rawEmail:
      options.rawEmail ??
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(''))
          controller.close()
        },
      }),
    text: options.text ?? (async () => ''),
    html: options.html ?? (async () => null),
  }
}

/**
 * Factory functions for creating mock events.
 */
export const mockEvent = {
  scheduled: createScheduledEvent,
  queue: createQueueBatchEvent,
  queueMessage: createQueueMessage,
  r2: createR2Event,
  webhook: createWebhookEvent,
  email: createEmailEvent,
}

// ============================================================================
// Test Trigger Function
// ============================================================================

/**
 * Create a mock trigger context.
 */
function createMockContext(
  bindings?: Record<string, unknown>,
  traceId?: string
): TriggerContext & { waitUntilPromises: Promise<unknown>[] } {
  const waitUntilPromises: Promise<unknown>[] = []

  return {
    traceId: traceId ?? `test_${crypto.randomUUID()}`,
    waitUntil: (promise: Promise<unknown>) => {
      waitUntilPromises.push(promise)
    },
    passThroughOnException: () => {},
    env: bindings ?? {},
    waitUntilPromises,
  }
}

/**
 * Test a trigger with a mock event.
 *
 * @param definition - The trigger definition to test
 * @param options - Test options including the mock event
 * @returns Test result
 *
 * @example
 * ```typescript
 * import { testTrigger, mockEvent } from '@cloudwerk/trigger/testing'
 * import dailyCleanup from '../app/triggers/daily-cleanup'
 *
 * describe('daily-cleanup', () => {
 *   it('runs cleanup successfully', async () => {
 *     const result = await testTrigger(dailyCleanup, {
 *       event: mockEvent.scheduled({ cron: '0 0 * * *' }),
 *     })
 *
 *     expect(result.success).toBe(true)
 *   })
 *
 *   it('handles errors gracefully', async () => {
 *     const result = await testTrigger(dailyCleanup, {
 *       event: mockEvent.scheduled({ cron: '0 0 * * *' }),
 *       bindings: {
 *         // Provide mock that throws
 *         DB: { prepare: () => { throw new Error('DB error') } }
 *       }
 *     })
 *
 *     expect(result.success).toBe(false)
 *     expect(result.error?.message).toBe('DB error')
 *   })
 * })
 * ```
 */
export async function testTrigger<TEvent>(
  definition: TriggerDefinition,
  options: TestTriggerOptions<TEvent>
): Promise<TestTriggerResult> {
  const ctx = createMockContext(options.bindings, options.traceId)
  let errorHandlerCalled = false

  try {
    // Cast the event to any to satisfy the type system
    // The actual type checking happens at definition time
    await definition.handle(options.event as never, ctx)

    return {
      success: true,
      errorHandlerCalled,
      waitUntilPromises: ctx.waitUntilPromises,
    }
  } catch (error) {
    if (definition.onError) {
      try {
        await definition.onError(error as Error, options.event as never, ctx)
        errorHandlerCalled = true
      } catch {
        // Error handler itself threw, ignore
      }
    }

    return {
      success: false,
      error: error as Error,
      errorHandlerCalled,
      waitUntilPromises: ctx.waitUntilPromises,
    }
  }
}

// ============================================================================
// Test Harness
// ============================================================================

/**
 * Options for creating a test harness.
 */
export interface TriggerTestHarnessOptions {
  /** Mock bindings to use for all triggers */
  bindings?: Record<string, unknown>
}

/**
 * A test harness for running multiple triggers.
 *
 * @example
 * ```typescript
 * import { TriggerTestHarness } from '@cloudwerk/trigger/testing'
 *
 * const harness = new TriggerTestHarness({
 *   bindings: { DB: mockD1() }
 * })
 *
 * harness.register('process-uploads', processUploads)
 * harness.register('send-notifications', sendNotifications)
 *
 * // Run a trigger
 * await harness.emit('process-uploads', mockEvent.r2({ key: 'test.pdf' }))
 *
 * // Check results
 * expect(harness.completed).toHaveLength(1)
 * ```
 */
export class TriggerTestHarness {
  private triggers = new Map<string, TriggerDefinition>()
  private results: TestTriggerResult[] = []
  private bindings: Record<string, unknown>

  constructor(options: TriggerTestHarnessOptions = {}) {
    this.bindings = options.bindings ?? {}
  }

  /**
   * Register a trigger with the harness.
   */
  register(name: string, definition: TriggerDefinition): void {
    this.triggers.set(name, definition)
  }

  /**
   * Emit an event to a trigger.
   */
  async emit<TEvent>(name: string, event: TEvent): Promise<TestTriggerResult> {
    const definition = this.triggers.get(name)
    if (!definition) {
      throw new Error(`Trigger '${name}' not registered`)
    }

    const result = await testTrigger(definition, {
      event,
      bindings: this.bindings,
    })

    this.results.push(result)
    return result
  }

  /**
   * Get all completed trigger results.
   */
  get completed(): TestTriggerResult[] {
    return this.results.filter((r) => r.success)
  }

  /**
   * Get all failed trigger results.
   */
  get failed(): TestTriggerResult[] {
    return this.results.filter((r) => !r.success)
  }

  /**
   * Get all results.
   */
  get all(): TestTriggerResult[] {
    return [...this.results]
  }

  /**
   * Reset the harness (clear results).
   */
  reset(): void {
    this.results = []
  }
}
