/**
 * @cloudwerk/trigger - Trigger Chaining via emit()
 *
 * Allows triggers to invoke other triggers with automatic
 * trace ID propagation for observability.
 */

import { AsyncLocalStorage } from 'node:async_hooks'
import type { TriggerContext } from './types.js'

// ============================================================================
// Types
// ============================================================================

/**
 * Options for emitting to a trigger.
 */
export interface EmitOptions {
  /**
   * Delay before the trigger executes (in milliseconds).
   * @default 0
   */
  delay?: number

  /**
   * Custom trace ID (defaults to current context's traceId).
   */
  traceId?: string
}

/**
 * Result of an emit operation.
 */
export interface EmitResult {
  /** Whether the emit was successful */
  success: boolean
  /** The trace ID used for this emission */
  traceId: string
  /** Target trigger name */
  trigger: string
  /** Timestamp when emit was called */
  emittedAt: Date
}

/**
 * Pending emission that was queued during execution.
 */
export interface PendingEmission {
  trigger: string
  payload: unknown
  options: EmitOptions
  traceId: string
  emittedAt: Date
}

/**
 * Emitter interface for different execution modes.
 */
export interface TriggerEmitter {
  /**
   * Emit to a trigger.
   */
  emit(trigger: string, payload: unknown, options?: EmitOptions): Promise<EmitResult>

  /**
   * Get all pending emissions (for testing/debugging).
   */
  getPendingEmissions(): PendingEmission[]

  /**
   * Clear pending emissions.
   */
  clearPendingEmissions(): void
}

// ============================================================================
// Context Storage
// ============================================================================

/**
 * Store for current trigger context, used for trace ID propagation.
 */
const contextStore = new AsyncLocalStorage<TriggerContext>()

/**
 * Store for pending emissions during trigger execution.
 */
const emissionsStore = new AsyncLocalStorage<PendingEmission[]>()

/**
 * Run a function within a trigger context.
 *
 * @param context - Trigger context
 * @param fn - Function to execute
 * @returns Function result
 */
export function runWithTriggerContext<T>(
  context: TriggerContext,
  fn: () => T
): T {
  return contextStore.run(context, () => {
    return emissionsStore.run([], fn)
  })
}

/**
 * Get the current trigger context.
 *
 * @returns Current context or undefined if not in a trigger
 */
export function getTriggerContext(): TriggerContext | undefined {
  return contextStore.getStore()
}

/**
 * Get pending emissions from the current context.
 */
export function getPendingEmissions(): PendingEmission[] {
  return emissionsStore.getStore() ?? []
}

// ============================================================================
// Trace ID Generation
// ============================================================================

/**
 * Generate a new trace ID.
 *
 * @param prefix - Optional prefix (default: 'tr')
 * @returns Trace ID string
 */
export function generateTraceId(prefix: string = 'tr'): string {
  const random = crypto.randomUUID().replace(/-/g, '').slice(0, 16)
  return `${prefix}_${random}`
}

/**
 * Create a child trace ID from a parent.
 *
 * @param parentTraceId - Parent trace ID
 * @returns Child trace ID
 */
export function createChildTraceId(parentTraceId: string): string {
  const suffix = crypto.randomUUID().slice(0, 8)
  return `${parentTraceId}.${suffix}`
}

// ============================================================================
// emit() Function
// ============================================================================

/**
 * Emit an event to another trigger.
 *
 * This function queues an event to be processed by another trigger,
 * with automatic trace ID propagation for distributed tracing.
 *
 * @param trigger - Name of the trigger to invoke
 * @param payload - Data to pass to the trigger
 * @param options - Emit options
 * @returns EmitResult
 *
 * @example
 * ```typescript
 * import { defineTrigger, emit } from '@cloudwerk/trigger'
 *
 * export default defineTrigger({
 *   source: { type: 'r2', bucket: 'uploads', events: ['object-create'] },
 *   async handle(event, ctx) {
 *     // Process the upload
 *     const metadata = await processFile(event.key)
 *
 *     // Chain to other triggers
 *     await emit('index-for-search', { key: event.key, metadata })
 *     await emit('generate-thumbnail', { key: event.key })
 *
 *     // Trace ID is automatically propagated
 *     console.log(ctx.traceId) // Same traceId in chained triggers
 *   }
 * })
 * ```
 *
 * @example
 * ```typescript
 * // With delay
 * await emit('send-reminder', { userId }, { delay: 60000 }) // 1 minute delay
 * ```
 */
export async function emit(
  trigger: string,
  payload: unknown,
  options: EmitOptions = {}
): Promise<EmitResult> {
  const context = getTriggerContext()
  const emissions = emissionsStore.getStore()

  // Determine trace ID
  const traceId = options.traceId ?? context?.traceId ?? generateTraceId()
  const childTraceId = context ? createChildTraceId(traceId) : traceId

  const emittedAt = new Date()

  // Create pending emission record
  const emission: PendingEmission = {
    trigger,
    payload,
    options,
    traceId: childTraceId,
    emittedAt,
  }

  // Queue the emission
  if (emissions) {
    emissions.push(emission)
  }

  // In production, this would:
  // 1. For same-worker triggers: queue for immediate execution
  // 2. For cross-worker triggers: publish to internal queue
  //
  // For now, we just record the emission. The runtime dispatcher
  // will process these after the current handler completes.

  return {
    success: true,
    traceId: childTraceId,
    trigger,
    emittedAt,
  }
}

/**
 * Emit to multiple triggers in parallel.
 *
 * @param emissions - Array of [trigger, payload] pairs
 * @param options - Shared options for all emissions
 * @returns Array of EmitResults
 *
 * @example
 * ```typescript
 * const results = await emitMany([
 *   ['process-image', { key: 'image.jpg' }],
 *   ['update-index', { key: 'image.jpg' }],
 *   ['notify-user', { userId, message: 'Upload complete' }],
 * ])
 * ```
 */
export async function emitMany(
  emissions: [string, unknown][],
  options: EmitOptions = {}
): Promise<EmitResult[]> {
  return Promise.all(
    emissions.map(([trigger, payload]) => emit(trigger, payload, options))
  )
}

// ============================================================================
// Default Emitter
// ============================================================================

/**
 * Default trigger emitter implementation.
 *
 * In production, this would be replaced with an implementation
 * that actually dispatches to other triggers via queues or
 * direct function calls.
 */
export const defaultEmitter: TriggerEmitter = {
  emit,
  getPendingEmissions,
  clearPendingEmissions: () => {
    const emissions = emissionsStore.getStore()
    if (emissions) {
      emissions.length = 0
    }
  },
}
