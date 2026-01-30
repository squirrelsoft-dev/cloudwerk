/**
 * @cloudwerk/trigger - Observability & Metrics
 *
 * Utilities for tracing, metrics collection, and monitoring trigger executions.
 */

import type { TriggerContext, TriggerSource } from './types.js'

// ============================================================================
// Types
// ============================================================================

/**
 * Trigger execution metrics.
 */
export interface TriggerMetrics {
  /** Trigger name */
  name: string
  /** Trigger source type */
  sourceType: TriggerSource['type']
  /** Execution start timestamp */
  startedAt: Date
  /** Execution end timestamp */
  endedAt?: Date
  /** Duration in milliseconds */
  durationMs?: number
  /** Whether execution was successful */
  success: boolean
  /** Error if execution failed */
  error?: Error
  /** Number of retries */
  retryCount: number
  /** Trace ID for distributed tracing */
  traceId: string
}

/**
 * Trigger execution span for tracing.
 */
export interface TriggerSpan {
  /** Span ID */
  spanId: string
  /** Trace ID */
  traceId: string
  /** Parent span ID (for nested triggers) */
  parentSpanId?: string
  /** Trigger name */
  triggerName: string
  /** Source type */
  sourceType: TriggerSource['type']
  /** Operation name */
  operationName: string
  /** Start time (Unix timestamp ms) */
  startTime: number
  /** End time (Unix timestamp ms) */
  endTime?: number
  /** Span status */
  status: 'ok' | 'error' | 'unset'
  /** Attributes */
  attributes: Record<string, string | number | boolean>
  /** Events that occurred during the span */
  events: SpanEvent[]
}

/**
 * Event that occurred during a span.
 */
export interface SpanEvent {
  /** Event name */
  name: string
  /** Timestamp (Unix ms) */
  timestamp: number
  /** Event attributes */
  attributes?: Record<string, string | number | boolean>
}

/**
 * Metrics reporter interface for pluggable metrics backends.
 */
export interface MetricsReporter {
  /** Report execution metrics */
  reportExecution(metrics: TriggerMetrics): void
  /** Report a span */
  reportSpan(span: TriggerSpan): void
  /** Flush pending metrics */
  flush(): Promise<void>
}

// ============================================================================
// Span Creation
// ============================================================================

/**
 * Generate a span ID.
 */
export function generateSpanId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16)
}

/**
 * Create a new trigger span.
 */
export function createTriggerSpan(
  triggerName: string,
  sourceType: TriggerSource['type'],
  traceId: string,
  parentSpanId?: string
): TriggerSpan {
  return {
    spanId: generateSpanId(),
    traceId,
    parentSpanId,
    triggerName,
    sourceType,
    operationName: `trigger.${triggerName}`,
    startTime: Date.now(),
    status: 'unset',
    attributes: {
      'trigger.name': triggerName,
      'trigger.source_type': sourceType,
    },
    events: [],
  }
}

/**
 * End a trigger span.
 */
export function endTriggerSpan(
  span: TriggerSpan,
  success: boolean,
  error?: Error
): TriggerSpan {
  span.endTime = Date.now()
  span.status = success ? 'ok' : 'error'

  if (error) {
    span.attributes['error.type'] = error.name
    span.attributes['error.message'] = error.message
    span.events.push({
      name: 'exception',
      timestamp: Date.now(),
      attributes: {
        'exception.type': error.name,
        'exception.message': error.message,
      },
    })
  }

  return span
}

/**
 * Add an event to a span.
 */
export function addSpanEvent(
  span: TriggerSpan,
  name: string,
  attributes?: Record<string, string | number | boolean>
): void {
  span.events.push({
    name,
    timestamp: Date.now(),
    attributes,
  })
}

/**
 * Add attributes to a span.
 */
export function setSpanAttributes(
  span: TriggerSpan,
  attributes: Record<string, string | number | boolean>
): void {
  Object.assign(span.attributes, attributes)
}

// ============================================================================
// Execution Timer
// ============================================================================

/**
 * Timer for measuring trigger execution duration.
 */
export class ExecutionTimer {
  private startTime: number
  private endTime?: number
  private marks: Map<string, number> = new Map()

  constructor() {
    this.startTime = performance.now()
  }

  /**
   * Mark a point in time.
   */
  mark(name: string): void {
    this.marks.set(name, performance.now())
  }

  /**
   * Get time since start to a mark.
   */
  getMarkDuration(name: string): number | undefined {
    const markTime = this.marks.get(name)
    if (markTime === undefined) return undefined
    return markTime - this.startTime
  }

  /**
   * Stop the timer.
   */
  stop(): number {
    this.endTime = performance.now()
    return this.duration
  }

  /**
   * Get total duration in milliseconds.
   */
  get duration(): number {
    const end = this.endTime ?? performance.now()
    return end - this.startTime
  }

  /**
   * Get all marks with their durations.
   */
  getMarks(): Record<string, number> {
    const result: Record<string, number> = {}
    for (const [name, time] of this.marks) {
      result[name] = time - this.startTime
    }
    return result
  }
}

// ============================================================================
// Default Console Reporter
// ============================================================================

/**
 * Console-based metrics reporter for development.
 */
export class ConsoleMetricsReporter implements MetricsReporter {
  private prefix: string

  constructor(prefix: string = '[trigger]') {
    this.prefix = prefix
  }

  reportExecution(metrics: TriggerMetrics): void {
    const status = metrics.success ? 'SUCCESS' : 'FAILED'
    const duration = metrics.durationMs ? `${metrics.durationMs}ms` : 'unknown'

    console.log(
      `${this.prefix} ${metrics.name} [${metrics.traceId}] ${status} (${duration})`
    )

    if (metrics.error) {
      console.error(`${this.prefix} Error:`, metrics.error.message)
    }
  }

  reportSpan(span: TriggerSpan): void {
    const duration = span.endTime
      ? `${span.endTime - span.startTime}ms`
      : 'ongoing'

    console.log(
      `${this.prefix} Span: ${span.operationName} [${span.traceId}] ${span.status} (${duration})`
    )

    for (const event of span.events) {
      console.log(`${this.prefix}   Event: ${event.name}`)
    }
  }

  async flush(): Promise<void> {
    // Console reporter doesn't need flushing
  }
}

// ============================================================================
// No-Op Reporter
// ============================================================================

/**
 * No-op metrics reporter that discards all metrics.
 */
export class NoOpMetricsReporter implements MetricsReporter {
  reportExecution(_metrics: TriggerMetrics): void {
    // Intentionally empty
  }

  reportSpan(_span: TriggerSpan): void {
    // Intentionally empty
  }

  async flush(): Promise<void> {
    // Intentionally empty
  }
}

// ============================================================================
// Metrics Collector
// ============================================================================

/**
 * Collect and aggregate trigger metrics.
 */
export class MetricsCollector {
  private executions: TriggerMetrics[] = []
  private spans: TriggerSpan[] = []
  private reporter: MetricsReporter

  constructor(reporter: MetricsReporter = new NoOpMetricsReporter()) {
    this.reporter = reporter
  }

  /**
   * Record a trigger execution.
   */
  recordExecution(metrics: TriggerMetrics): void {
    this.executions.push(metrics)
    this.reporter.reportExecution(metrics)
  }

  /**
   * Record a span.
   */
  recordSpan(span: TriggerSpan): void {
    this.spans.push(span)
    this.reporter.reportSpan(span)
  }

  /**
   * Get execution count for a trigger.
   */
  getExecutionCount(triggerName: string): number {
    return this.executions.filter((m) => m.name === triggerName).length
  }

  /**
   * Get success rate for a trigger.
   */
  getSuccessRate(triggerName: string): number {
    const executions = this.executions.filter((m) => m.name === triggerName)
    if (executions.length === 0) return 0
    const successful = executions.filter((m) => m.success).length
    return successful / executions.length
  }

  /**
   * Get average duration for a trigger.
   */
  getAverageDuration(triggerName: string): number | undefined {
    const executions = this.executions.filter(
      (m) => m.name === triggerName && m.durationMs !== undefined
    )
    if (executions.length === 0) return undefined
    const total = executions.reduce((sum, m) => sum + (m.durationMs ?? 0), 0)
    return total / executions.length
  }

  /**
   * Get percentile duration for a trigger.
   */
  getPercentileDuration(
    triggerName: string,
    percentile: number
  ): number | undefined {
    const executions = this.executions
      .filter((m) => m.name === triggerName && m.durationMs !== undefined)
      .map((m) => m.durationMs!)
      .sort((a, b) => a - b)

    if (executions.length === 0) return undefined

    const index = Math.ceil((percentile / 100) * executions.length) - 1
    return executions[Math.max(0, index)]
  }

  /**
   * Get summary statistics for a trigger.
   */
  getSummary(triggerName: string): {
    count: number
    successRate: number
    avgDurationMs?: number
    p50DurationMs?: number
    p95DurationMs?: number
    p99DurationMs?: number
  } {
    return {
      count: this.getExecutionCount(triggerName),
      successRate: this.getSuccessRate(triggerName),
      avgDurationMs: this.getAverageDuration(triggerName),
      p50DurationMs: this.getPercentileDuration(triggerName, 50),
      p95DurationMs: this.getPercentileDuration(triggerName, 95),
      p99DurationMs: this.getPercentileDuration(triggerName, 99),
    }
  }

  /**
   * Flush metrics to the reporter.
   */
  async flush(): Promise<void> {
    await this.reporter.flush()
  }

  /**
   * Clear collected metrics.
   */
  clear(): void {
    this.executions = []
    this.spans = []
  }
}

// ============================================================================
// Helper to create metrics from execution
// ============================================================================

/**
 * Create trigger metrics from an execution.
 */
export function createTriggerMetrics(
  name: string,
  sourceType: TriggerSource['type'],
  ctx: TriggerContext,
  timer: ExecutionTimer,
  success: boolean,
  error?: Error,
  retryCount: number = 0
): TriggerMetrics {
  const durationMs = timer.stop()

  return {
    name,
    sourceType,
    startedAt: new Date(Date.now() - durationMs),
    endedAt: new Date(),
    durationMs,
    success,
    error,
    retryCount,
    traceId: ctx.traceId,
  }
}
