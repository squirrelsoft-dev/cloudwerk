/**
 * @cloudwerk/service - Error Classes
 *
 * Custom error classes for service operations.
 */

// ============================================================================
// Base Error
// ============================================================================

/**
 * Base error class for service-related errors.
 */
export class ServiceError extends Error {
  /** Error code for programmatic handling */
  readonly code: string

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ServiceError'
    this.code = code
  }
}

// ============================================================================
// Definition Errors
// ============================================================================

/**
 * Error thrown when a service has no methods defined.
 */
export class ServiceNoMethodsError extends ServiceError {
  constructor(serviceName: string) {
    super(
      'NO_METHODS',
      `Service '${serviceName}' must define at least one method`
    )
    this.name = 'ServiceNoMethodsError'
  }
}

/**
 * Error thrown when a service method is invalid.
 */
export class ServiceInvalidMethodError extends ServiceError {
  /** The method name that is invalid */
  readonly methodName: string

  constructor(serviceName: string, methodName: string, reason: string) {
    super(
      'INVALID_METHOD',
      `Service '${serviceName}' method '${methodName}' is invalid: ${reason}`
    )
    this.name = 'ServiceInvalidMethodError'
    this.methodName = methodName
  }
}

// ============================================================================
// Configuration Errors
// ============================================================================

/**
 * Error thrown when service configuration is invalid.
 */
export class ServiceConfigError extends ServiceError {
  /** The configuration field that is invalid */
  readonly field?: string

  constructor(message: string, field?: string) {
    super('CONFIG_ERROR', message)
    this.name = 'ServiceConfigError'
    this.field = field
  }
}

// ============================================================================
// Runtime Errors
// ============================================================================

/**
 * Error thrown when accessing a service outside of request context.
 */
export class ServiceContextError extends ServiceError {
  constructor() {
    super(
      'CONTEXT_ERROR',
      'Service accessed outside of request handler. Services can only be accessed during request handling.'
    )
    this.name = 'ServiceContextError'
  }
}

/**
 * Error thrown when a service binding is not found.
 */
export class ServiceNotFoundError extends ServiceError {
  /** The service name that was not found */
  readonly serviceName: string

  /** Available service names */
  readonly availableServices: string[]

  constructor(serviceName: string, availableServices: string[]) {
    const available =
      availableServices.length > 0
        ? `Available services: ${availableServices.join(', ')}`
        : 'No services are configured'

    super(
      'SERVICE_NOT_FOUND',
      `Service '${serviceName}' not found in environment. ${available}`
    )
    this.name = 'ServiceNotFoundError'
    this.serviceName = serviceName
    this.availableServices = availableServices
  }
}

/**
 * Error thrown when a service method call fails.
 */
export class ServiceMethodError extends ServiceError {
  /** The service name */
  readonly serviceName: string

  /** The method name that failed */
  readonly methodName: string

  constructor(
    serviceName: string,
    methodName: string,
    message: string,
    options?: ErrorOptions
  ) {
    super(
      'METHOD_ERROR',
      `Service '${serviceName}.${methodName}' failed: ${message}`,
      options
    )
    this.name = 'ServiceMethodError'
    this.serviceName = serviceName
    this.methodName = methodName
  }
}

/**
 * Error thrown when service initialization fails.
 */
export class ServiceInitError extends ServiceError {
  /** The service name */
  readonly serviceName: string

  constructor(serviceName: string, message: string, options?: ErrorOptions) {
    super(
      'INIT_ERROR',
      `Service '${serviceName}' failed to initialize: ${message}`,
      options
    )
    this.name = 'ServiceInitError'
    this.serviceName = serviceName
  }
}
