/**
 * @cloudwerk/durable-object - Error Classes
 *
 * Custom error classes for Durable Object operations.
 */

// ============================================================================
// Base Error
// ============================================================================

/**
 * Base error class for durable object-related errors.
 */
export class DurableObjectError extends Error {
  /** Error code for programmatic handling */
  readonly code: string

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'DurableObjectError'
    this.code = code
  }
}

// ============================================================================
// Configuration Errors
// ============================================================================

/**
 * Error thrown when durable object configuration is invalid.
 *
 * @example
 * ```typescript
 * // Thrown when no handlers are defined
 * export default defineDurableObject({
 *   // Missing methods, fetch, alarm, or WebSocket handlers
 * })
 * ```
 */
export class DurableObjectConfigError extends DurableObjectError {
  /** The configuration field that is invalid */
  readonly field?: string

  constructor(message: string, field?: string) {
    super('CONFIG_ERROR', message)
    this.name = 'DurableObjectConfigError'
    this.field = field
  }
}

/**
 * Error thrown when no handler is defined for a durable object.
 */
export class DurableObjectNoHandlerError extends DurableObjectError {
  constructor(objectName: string) {
    super(
      'NO_HANDLER',
      `Durable object '${objectName}' must define at least one handler (methods, fetch, alarm, or webSocketMessage)`
    )
    this.name = 'DurableObjectNoHandlerError'
  }
}

// ============================================================================
// Runtime Errors
// ============================================================================

/**
 * Error thrown when accessing a durable object outside of request context.
 */
export class DurableObjectContextError extends DurableObjectError {
  constructor() {
    super(
      'CONTEXT_ERROR',
      'Durable object accessed outside of request handler. Durable objects can only be accessed during request handling.'
    )
    this.name = 'DurableObjectContextError'
  }
}

/**
 * Error thrown when a durable object binding is not found.
 *
 * @example
 * ```typescript
 * import { durableObjects } from '@cloudwerk/bindings'
 *
 * // Throws if COUNTER binding doesn't exist in environment
 * const counter = durableObjects.counter
 * ```
 */
export class DurableObjectNotFoundError extends DurableObjectError {
  /** The durable object name that was not found */
  readonly objectName: string

  /** Available durable object names */
  readonly availableObjects: string[]

  constructor(objectName: string, availableObjects: string[]) {
    const available =
      availableObjects.length > 0
        ? `Available durable objects: ${availableObjects.join(', ')}`
        : 'No durable objects are configured'

    super(
      'DURABLE_OBJECT_NOT_FOUND',
      `Durable object '${objectName}' not found in environment. ${available}`
    )
    this.name = 'DurableObjectNotFoundError'
    this.objectName = objectName
    this.availableObjects = availableObjects
  }
}

// ============================================================================
// State Errors
// ============================================================================

/**
 * Error thrown when state initialization fails.
 */
export class DurableObjectStateError extends DurableObjectError {
  /** The durable object name */
  readonly objectName: string

  constructor(objectName: string, message: string, options?: ErrorOptions) {
    super('STATE_ERROR', `State error in durable object '${objectName}': ${message}`, options)
    this.name = 'DurableObjectStateError'
    this.objectName = objectName
  }
}

/**
 * Error thrown when state validation fails.
 */
export class DurableObjectSchemaValidationError extends DurableObjectError {
  /** The validation errors from Zod */
  readonly validationErrors: unknown[]

  constructor(message: string, validationErrors: unknown[]) {
    super('VALIDATION_ERROR', message)
    this.name = 'DurableObjectSchemaValidationError'
    this.validationErrors = validationErrors
  }
}

// ============================================================================
// RPC Errors
// ============================================================================

/**
 * Error thrown when an RPC method call fails.
 */
export class DurableObjectRPCError extends DurableObjectError {
  /** The durable object name */
  readonly objectName: string

  /** The method that was called */
  readonly methodName: string

  constructor(objectName: string, methodName: string, message: string, options?: ErrorOptions) {
    super(
      'RPC_ERROR',
      `RPC error calling '${methodName}' on durable object '${objectName}': ${message}`,
      options
    )
    this.name = 'DurableObjectRPCError'
    this.objectName = objectName
    this.methodName = methodName
  }
}

/**
 * Error thrown when an RPC method is not found.
 */
export class DurableObjectMethodNotFoundError extends DurableObjectError {
  /** The durable object name */
  readonly objectName: string

  /** The method that was not found */
  readonly methodName: string

  /** Available method names */
  readonly availableMethods: string[]

  constructor(objectName: string, methodName: string, availableMethods: string[]) {
    const available =
      availableMethods.length > 0
        ? `Available methods: ${availableMethods.join(', ')}`
        : 'No RPC methods are defined'

    super(
      'METHOD_NOT_FOUND',
      `Method '${methodName}' not found on durable object '${objectName}'. ${available}`
    )
    this.name = 'DurableObjectMethodNotFoundError'
    this.objectName = objectName
    this.methodName = methodName
    this.availableMethods = availableMethods
  }
}

// ============================================================================
// Alarm Errors
// ============================================================================

/**
 * Error thrown when an alarm operation fails.
 */
export class DurableObjectAlarmError extends DurableObjectError {
  /** The durable object name */
  readonly objectName: string

  constructor(objectName: string, message: string, options?: ErrorOptions) {
    super('ALARM_ERROR', `Alarm error in durable object '${objectName}': ${message}`, options)
    this.name = 'DurableObjectAlarmError'
    this.objectName = objectName
  }
}

// ============================================================================
// WebSocket Errors
// ============================================================================

/**
 * Error thrown when a WebSocket operation fails.
 */
export class DurableObjectWebSocketError extends DurableObjectError {
  /** The durable object name */
  readonly objectName: string

  constructor(objectName: string, message: string, options?: ErrorOptions) {
    super(
      'WEBSOCKET_ERROR',
      `WebSocket error in durable object '${objectName}': ${message}`,
      options
    )
    this.name = 'DurableObjectWebSocketError'
    this.objectName = objectName
  }
}
