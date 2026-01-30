/**
 * @cloudwerk/service - defineService()
 *
 * Factory function for creating service definitions.
 */

import type {
  ServiceConfig,
  ServiceDefinition,
  ServiceMethods,
  ServiceProcessingConfig,
} from './types.js'
import {
  ServiceConfigError,
  ServiceNoMethodsError,
  ServiceInvalidMethodError,
} from './errors.js'

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: ServiceProcessingConfig = {
  extraction: undefined,
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate service configuration.
 *
 * @param config - Service configuration to validate
 * @throws ServiceConfigError if configuration is invalid
 * @throws ServiceNoMethodsError if no methods are defined
 */
function validateConfig<T extends ServiceMethods>(config: ServiceConfig<T>): void {
  // Must have methods defined
  if (!config.methods || typeof config.methods !== 'object') {
    throw new ServiceNoMethodsError(config.name || 'unknown')
  }

  const methodNames = Object.keys(config.methods)

  // Must have at least one method
  if (methodNames.length === 0) {
    throw new ServiceNoMethodsError(config.name || 'unknown')
  }

  // Validate each method is a function
  for (const name of methodNames) {
    const method = config.methods[name]
    if (typeof method !== 'function') {
      throw new ServiceInvalidMethodError(
        config.name || 'unknown',
        name,
        'must be a function'
      )
    }

    // Method names should be valid identifiers
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      throw new ServiceInvalidMethodError(
        config.name || 'unknown',
        name,
        'must be a valid JavaScript identifier'
      )
    }

    // Reserved method names
    const reserved = ['constructor', 'prototype', '__proto__', 'fetch']
    if (reserved.includes(name)) {
      throw new ServiceInvalidMethodError(
        config.name || 'unknown',
        name,
        `'${name}' is a reserved name`
      )
    }
  }

  // Validate name if provided
  if (config.name !== undefined) {
    if (typeof config.name !== 'string' || config.name.length === 0) {
      throw new ServiceConfigError('name must be a non-empty string', 'name')
    }

    // Service names should be camelCase or lowercase with hyphens
    if (!/^[a-z][a-zA-Z0-9-]*$/.test(config.name)) {
      throw new ServiceConfigError(
        'name must start with a lowercase letter and contain only letters, numbers, and hyphens',
        'name'
      )
    }
  }

  // Validate extraction config
  if (config.config?.extraction) {
    const { workerName, bindings } = config.config.extraction

    if (workerName !== undefined) {
      if (typeof workerName !== 'string' || workerName.length === 0) {
        throw new ServiceConfigError(
          'extraction.workerName must be a non-empty string',
          'extraction.workerName'
        )
      }

      // Worker names should be lowercase with hyphens
      if (!/^[a-z][a-z0-9-]*$/.test(workerName)) {
        throw new ServiceConfigError(
          'extraction.workerName must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens',
          'extraction.workerName'
        )
      }
    }

    if (bindings !== undefined) {
      if (!Array.isArray(bindings)) {
        throw new ServiceConfigError(
          'extraction.bindings must be an array',
          'extraction.bindings'
        )
      }

      for (const binding of bindings) {
        if (typeof binding !== 'string' || binding.length === 0) {
          throw new ServiceConfigError(
            'extraction.bindings must contain non-empty strings',
            'extraction.bindings'
          )
        }

        // Binding names should be SCREAMING_SNAKE_CASE or camelCase
        if (!/^[A-Z][A-Z0-9_]*$|^[a-z][a-zA-Z0-9]*$/.test(binding)) {
          throw new ServiceConfigError(
            `Invalid binding name '${binding}'. Must be SCREAMING_SNAKE_CASE or camelCase`,
            'extraction.bindings'
          )
        }
      }
    }
  }

  // Validate hooks if provided
  if (config.hooks) {
    const hookNames = ['onInit', 'onBefore', 'onAfter', 'onError'] as const

    for (const hookName of hookNames) {
      const hook = config.hooks[hookName]
      if (hook !== undefined && typeof hook !== 'function') {
        throw new ServiceConfigError(
          `hooks.${hookName} must be a function`,
          `hooks.${hookName}`
        )
      }
    }
  }
}

// ============================================================================
// defineService()
// ============================================================================

/**
 * Define a service with methods that can be called locally or via RPC.
 *
 * This function creates a service definition that will be automatically
 * discovered and registered by Cloudwerk during build. Services can run
 * locally (direct function calls) or be extracted to separate Workers
 * (using Cloudflare's service binding RPC).
 *
 * @typeParam T - The methods object type
 * @param config - Service configuration
 * @returns Service definition
 *
 * @example
 * ```typescript
 * // app/services/email/service.ts
 * import { defineService } from '@cloudwerk/service'
 *
 * export default defineService({
 *   methods: {
 *     async send({ to, subject, body }) {
 *       // Send email via API
 *       const response = await fetch('https://api.resend.com/emails', {
 *         method: 'POST',
 *         headers: { 'Authorization': `Bearer ${this.env.RESEND_API_KEY}` },
 *         body: JSON.stringify({ to, subject, html: body }),
 *       })
 *       const data = await response.json()
 *       return { success: true, messageId: data.id }
 *     },
 *
 *     async sendBatch(emails) {
 *       return Promise.all(emails.map(e => this.send(e)))
 *     }
 *   }
 * })
 * ```
 *
 * @example
 * ```typescript
 * // With hooks and extraction config
 * import { defineService } from '@cloudwerk/service'
 *
 * export default defineService({
 *   methods: {
 *     async processPayment({ amount, currency, customerId }) {
 *       // Process payment with Stripe
 *       return { chargeId: '...' }
 *     }
 *   },
 *
 *   hooks: {
 *     onInit: async () => {
 *       console.log('Payment service initialized')
 *     },
 *     onBefore: async (method, args) => {
 *       console.log(`[payment] ${method} called with`, args)
 *     },
 *     onError: async (method, error) => {
 *       // Report to error tracking
 *       await reportError('payment', method, error)
 *     }
 *   },
 *
 *   config: {
 *     extraction: {
 *       workerName: 'payment-service',
 *       bindings: ['STRIPE_SECRET_KEY', 'DB'],
 *     }
 *   }
 * })
 * ```
 */
export function defineService<T extends ServiceMethods>(
  config: ServiceConfig<T>
): ServiceDefinition<T> {
  // Validate configuration
  validateConfig(config)

  // Merge with defaults
  const mergedConfig: ServiceProcessingConfig = {
    ...DEFAULT_CONFIG,
    ...config.config,
  }

  // Create the definition object
  const definition: ServiceDefinition<T> = {
    __brand: 'cloudwerk-service',
    name: config.name,
    methods: config.methods,
    hooks: config.hooks,
    config: mergedConfig,
  }

  return definition
}

/**
 * Check if a value is a service definition created by defineService().
 *
 * @param value - Value to check
 * @returns true if value is a ServiceDefinition
 */
export function isServiceDefinition(
  value: unknown
): value is ServiceDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__brand' in value &&
    (value as ServiceDefinition).__brand === 'cloudwerk-service'
  )
}
