/**
 * @cloudwerk/core - Importable Binding Singletons
 *
 * Proxy-based bindings that resolve from the current request context.
 * Provides ergonomic access to Cloudflare bindings without calling getContext()
 * in every handler.
 *
 * @example
 * ```typescript
 * import { DB, CACHE, BUCKET } from '@cloudwerk/core/bindings'
 *
 * export async function GET() {
 *   const posts = await DB.prepare('SELECT * FROM posts').all()
 *   return json(posts)
 * }
 * ```
 */

import { getContext } from './context.js'

// ============================================================================
// Error Messages
// ============================================================================

const OUTSIDE_CONTEXT_ERROR = `Binding accessed outside of request handler.

This can happen when:
1. Accessing bindings at module-load time (top-level code)
2. Accessing bindings in a setTimeout/setInterval callback
3. The request context was not properly initialized

Bindings can only be accessed during request handling within a Cloudwerk application.

Example of correct usage:
  import { DB } from '@cloudwerk/core/bindings'

  export async function GET() {
    const posts = await DB.prepare('SELECT * FROM posts').all()
    return json(posts)
  }
`

function createMissingBindingError(name: string, availableBindings: string[]): string {
  const available =
    availableBindings.length > 0
      ? `Available bindings: ${availableBindings.join(', ')}`
      : 'No bindings are configured in wrangler.toml'

  return `Binding '${name}' not found in current environment.

${available}

To add this binding, update your wrangler.toml or run:
  cloudwerk bindings add ${name.toLowerCase()}
`
}

// ============================================================================
// Bindings Proxy
// ============================================================================

/**
 * Proxy object that provides access to all Cloudflare bindings.
 *
 * Access bindings by name, which will resolve from the current request's
 * environment at access time.
 *
 * @example
 * ```typescript
 * import { bindings } from '@cloudwerk/core/bindings'
 *
 * export async function GET() {
 *   const db = bindings.DB as D1Database
 *   const posts = await db.prepare('SELECT * FROM posts').all()
 *   return json(posts)
 * }
 * ```
 */
export const bindings: Record<string, unknown> = new Proxy(
  {},
  {
    get(_target, prop) {
      // Ignore symbol access (e.g., Symbol.toStringTag)
      if (typeof prop === 'symbol') {
        return undefined
      }

      // Get current context
      let ctx
      try {
        ctx = getContext()
      } catch {
        throw new Error(OUTSIDE_CONTEXT_ERROR)
      }

      const env = ctx.env as Record<string, unknown>
      const binding = env[prop]

      if (binding === undefined) {
        const availableBindings = Object.keys(env).filter(
          (key) => env[key] !== undefined && typeof env[key] !== 'string'
        )
        throw new Error(createMissingBindingError(prop, availableBindings))
      }

      return binding
    },

    has(_target, prop) {
      if (typeof prop === 'symbol') {
        return false
      }

      try {
        const ctx = getContext()
        const env = ctx.env as Record<string, unknown>
        return prop in env && env[prop] !== undefined
      } catch {
        return false
      }
    },

    ownKeys() {
      try {
        const ctx = getContext()
        const env = ctx.env as Record<string, unknown>
        return Object.keys(env).filter(
          (key) => env[key] !== undefined && typeof env[key] !== 'string'
        )
      } catch {
        return []
      }
    },

    getOwnPropertyDescriptor(_target, prop) {
      if (typeof prop === 'symbol') {
        return undefined
      }

      try {
        const ctx = getContext()
        const env = ctx.env as Record<string, unknown>
        if (prop in env && env[prop] !== undefined) {
          return {
            enumerable: true,
            configurable: true,
            value: env[prop],
          }
        }
      } catch {
        // Outside context
      }
      return undefined
    },
  }
)

// ============================================================================
// Helper Function
// ============================================================================

/**
 * Get a specific binding with type safety.
 *
 * This is an alternative to accessing bindings via the proxy object,
 * useful when you need explicit typing.
 *
 * @param name - The binding name as defined in wrangler.toml
 * @returns The binding instance
 * @throws Error if called outside request context
 * @throws Error if binding is not found
 *
 * @example
 * ```typescript
 * import { getBinding } from '@cloudwerk/core/bindings'
 *
 * export async function GET() {
 *   const db = getBinding<D1Database>('DB')
 *   const posts = await db.prepare('SELECT * FROM posts').all()
 *   return json(posts)
 * }
 * ```
 */
export function getBinding<T = unknown>(name: string): T {
  let ctx
  try {
    ctx = getContext()
  } catch {
    throw new Error(OUTSIDE_CONTEXT_ERROR)
  }

  const env = ctx.env as Record<string, unknown>
  const binding = env[name]

  if (binding === undefined) {
    const availableBindings = Object.keys(env).filter(
      (key) => env[key] !== undefined && typeof env[key] !== 'string'
    )
    throw new Error(createMissingBindingError(name, availableBindings))
  }

  return binding as T
}

/**
 * Check if a binding exists in the current environment.
 *
 * @param name - The binding name to check
 * @returns true if the binding exists, false otherwise
 * @throws Error if called outside request context
 *
 * @example
 * ```typescript
 * import { hasBinding, getBinding } from '@cloudwerk/core/bindings'
 *
 * export async function GET() {
 *   if (hasBinding('CACHE')) {
 *     const cache = getBinding<KVNamespace>('CACHE')
 *     // Use cache
 *   }
 *   // Fallback without cache
 * }
 * ```
 */
export function hasBinding(name: string): boolean {
  let ctx
  try {
    ctx = getContext()
  } catch {
    throw new Error(OUTSIDE_CONTEXT_ERROR)
  }

  const env = ctx.env as Record<string, unknown>
  return name in env && env[name] !== undefined
}

/**
 * Get all available binding names in the current environment.
 *
 * @returns Array of binding names
 * @throws Error if called outside request context
 *
 * @example
 * ```typescript
 * import { getBindingNames } from '@cloudwerk/core/bindings'
 *
 * export async function GET() {
 *   const names = getBindingNames()
 *   return json({ availableBindings: names })
 * }
 * ```
 */
export function getBindingNames(): string[] {
  let ctx
  try {
    ctx = getContext()
  } catch {
    throw new Error(OUTSIDE_CONTEXT_ERROR)
  }

  const env = ctx.env as Record<string, unknown>
  return Object.keys(env).filter(
    (key) => env[key] !== undefined && typeof env[key] !== 'string'
  )
}

// ============================================================================
// Queue Producer Types
// ============================================================================

/**
 * Options for sending messages to a queue.
 */
export interface QueueSendOptions {
  /**
   * Delay delivery of this message by the specified number of seconds.
   * The message will not be available for processing until after this delay.
   */
  delaySeconds?: number

  /**
   * Content type of the message body.
   * @default 'json'
   */
  contentType?: 'json' | 'text' | 'bytes' | 'v8'
}

/**
 * A typed queue producer for sending messages.
 *
 * @typeParam T - The message body type
 */
export interface Queue<T = unknown> {
  /**
   * Send a single message to the queue.
   *
   * @param message - The message body to send
   * @param options - Optional send options
   */
  send(message: T, options?: QueueSendOptions): Promise<void>

  /**
   * Send multiple messages to the queue in a single operation.
   *
   * @param messages - Array of message bodies to send
   * @param options - Optional send options (applied to all messages)
   */
  sendBatch(messages: T[], options?: QueueSendOptions): Promise<void>
}

// ============================================================================
// Queue Error Messages
// ============================================================================

const QUEUE_OUTSIDE_CONTEXT_ERROR = `Queue accessed outside of request handler.

This can happen when:
1. Accessing queues at module-load time (top-level code)
2. Accessing queues in a setTimeout/setInterval callback
3. The request context was not properly initialized

Queues can only be accessed during request handling within a Cloudwerk application.

Example of correct usage:
  import { queues } from '@cloudwerk/core/bindings'

  export async function POST() {
    await queues.email.send({ to: 'user@example.com', subject: 'Hello' })
    return json({ sent: true })
  }
`

function createMissingQueueError(name: string, availableQueues: string[]): string {
  const available =
    availableQueues.length > 0
      ? `Available queues: ${availableQueues.join(', ')}`
      : 'No queues are configured in wrangler.toml'

  return `Queue '${name}' not found in current environment.

${available}

To add this queue, create a file at app/queues/${name}.ts with:
  import { defineQueue } from '@cloudwerk/queue'
  export default defineQueue({
    async process(message) { ... }
  })
`
}

// ============================================================================
// Queue Helper Functions
// ============================================================================

/**
 * Get all queue binding names from the environment.
 * Queue bindings end with _QUEUE by convention.
 */
function getQueueBindingNames(env: Record<string, unknown>): string[] {
  return Object.keys(env).filter(
    (key) => key.endsWith('_QUEUE') && env[key] !== undefined
  )
}

/**
 * Convert a queue name (camelCase) to binding name (SCREAMING_SNAKE_CASE_QUEUE).
 */
function queueNameToBindingName(queueName: string): string {
  const screaming = queueName
    .replace(/([A-Z])/g, '_$1')
    .toUpperCase()
    .replace(/^_/, '')

  return `${screaming}_QUEUE`
}

/**
 * Convert a binding name (SCREAMING_SNAKE_CASE_QUEUE) to queue name (camelCase).
 */
function bindingNameToQueueName(bindingName: string): string {
  // Remove _QUEUE suffix and convert to camelCase
  const withoutSuffix = bindingName.replace(/_QUEUE$/, '')
  return withoutSuffix.toLowerCase().replace(/_([a-z])/g, (_, letter) =>
    letter.toUpperCase()
  )
}

/**
 * Create a queue producer wrapper around a Cloudflare Queue binding.
 */
function createQueueProducer<T>(binding: unknown): Queue<T> {
  // Cloudflare Queue bindings have send() and sendBatch() methods
  const cfQueue = binding as {
    send(message: unknown, options?: { delaySeconds?: number; contentType?: string }): Promise<void>
    sendBatch(messages: Array<{ body: unknown; delaySeconds?: number; contentType?: string }>): Promise<void>
  }

  return {
    async send(message: T, options?: QueueSendOptions): Promise<void> {
      await cfQueue.send(message, {
        delaySeconds: options?.delaySeconds,
        contentType: options?.contentType,
      })
    },

    async sendBatch(messages: T[], options?: QueueSendOptions): Promise<void> {
      const batch = messages.map((body) => ({
        body,
        delaySeconds: options?.delaySeconds,
        contentType: options?.contentType,
      }))
      await cfQueue.sendBatch(batch)
    },
  }
}

// ============================================================================
// Queues Proxy
// ============================================================================

/**
 * Proxy object that provides typed access to queue producers.
 *
 * Access queues by name (camelCase), which will resolve from the current
 * request's environment at access time.
 *
 * @example
 * ```typescript
 * import { queues } from '@cloudwerk/core/bindings'
 *
 * export async function POST(request: Request) {
 *   const data = await request.json()
 *
 *   // Send a single message
 *   await queues.email.send({
 *     to: data.email,
 *     subject: 'Welcome!',
 *     body: 'Thanks for signing up.',
 *   })
 *
 *   // Send with delay
 *   await queues.notifications.send(
 *     { userId: data.id, event: 'signup' },
 *     { delaySeconds: 60 }
 *   )
 *
 *   // Send a batch
 *   await queues.analytics.sendBatch([
 *     { event: 'page_view', path: '/' },
 *     { event: 'signup', userId: data.id },
 *   ])
 *
 *   return json({ success: true })
 * }
 * ```
 */
export const queues: Record<string, Queue<unknown>> = new Proxy(
  {} as Record<string, Queue<unknown>>,
  {
    get(_target, prop) {
      // Ignore symbol access
      if (typeof prop === 'symbol') {
        return undefined
      }

      // Get current context
      let ctx
      try {
        ctx = getContext()
      } catch {
        throw new Error(QUEUE_OUTSIDE_CONTEXT_ERROR)
      }

      const env = ctx.env as Record<string, unknown>

      // Convert queue name to binding name
      const bindingName = queueNameToBindingName(prop)
      const binding = env[bindingName]

      if (binding === undefined) {
        // Get available queue names for error message
        const queueBindings = getQueueBindingNames(env)
        const availableQueues = queueBindings.map(bindingNameToQueueName)
        throw new Error(createMissingQueueError(prop, availableQueues))
      }

      // Return a queue producer wrapper
      return createQueueProducer(binding)
    },

    has(_target, prop) {
      if (typeof prop === 'symbol') {
        return false
      }

      try {
        const ctx = getContext()
        const env = ctx.env as Record<string, unknown>
        const bindingName = queueNameToBindingName(prop)
        return bindingName in env && env[bindingName] !== undefined
      } catch {
        return false
      }
    },

    ownKeys() {
      try {
        const ctx = getContext()
        const env = ctx.env as Record<string, unknown>
        const queueBindings = getQueueBindingNames(env)
        return queueBindings.map(bindingNameToQueueName)
      } catch {
        return []
      }
    },

    getOwnPropertyDescriptor(_target, prop) {
      if (typeof prop === 'symbol') {
        return undefined
      }

      try {
        const ctx = getContext()
        const env = ctx.env as Record<string, unknown>
        const bindingName = queueNameToBindingName(prop)
        if (bindingName in env && env[bindingName] !== undefined) {
          return {
            enumerable: true,
            configurable: true,
            value: createQueueProducer(env[bindingName]),
          }
        }
      } catch {
        // Outside context
      }
      return undefined
    },
  }
)

/**
 * Get a specific queue producer with type safety.
 *
 * @param name - The queue name (camelCase)
 * @returns The typed queue producer
 * @throws Error if called outside request context
 * @throws Error if queue is not found
 *
 * @example
 * ```typescript
 * import { getQueue } from '@cloudwerk/core/bindings'
 *
 * interface EmailMessage {
 *   to: string
 *   subject: string
 *   body: string
 * }
 *
 * export async function POST(request: Request) {
 *   const email = getQueue<EmailMessage>('email')
 *   await email.send({
 *     to: 'user@example.com',
 *     subject: 'Hello',
 *     body: 'Welcome!',
 *   })
 *   return json({ sent: true })
 * }
 * ```
 */
export function getQueue<T = unknown>(name: string): Queue<T> {
  let ctx
  try {
    ctx = getContext()
  } catch {
    throw new Error(QUEUE_OUTSIDE_CONTEXT_ERROR)
  }

  const env = ctx.env as Record<string, unknown>
  const bindingName = queueNameToBindingName(name)
  const binding = env[bindingName]

  if (binding === undefined) {
    const queueBindings = getQueueBindingNames(env)
    const availableQueues = queueBindings.map(bindingNameToQueueName)
    throw new Error(createMissingQueueError(name, availableQueues))
  }

  return createQueueProducer<T>(binding)
}

/**
 * Check if a queue exists in the current environment.
 *
 * @param name - The queue name (camelCase) to check
 * @returns true if the queue exists, false otherwise
 * @throws Error if called outside request context
 *
 * @example
 * ```typescript
 * import { hasQueue, getQueue } from '@cloudwerk/core/bindings'
 *
 * export async function POST(request: Request) {
 *   if (hasQueue('email')) {
 *     const email = getQueue('email')
 *     await email.send({ ... })
 *   } else {
 *     // Fallback or skip
 *   }
 * }
 * ```
 */
export function hasQueue(name: string): boolean {
  let ctx
  try {
    ctx = getContext()
  } catch {
    throw new Error(QUEUE_OUTSIDE_CONTEXT_ERROR)
  }

  const env = ctx.env as Record<string, unknown>
  const bindingName = queueNameToBindingName(name)
  return bindingName in env && env[bindingName] !== undefined
}

/**
 * Get all available queue names in the current environment.
 *
 * @returns Array of queue names (camelCase)
 * @throws Error if called outside request context
 *
 * @example
 * ```typescript
 * import { getQueueNames } from '@cloudwerk/core/bindings'
 *
 * export async function GET() {
 *   const names = getQueueNames()
 *   return json({ availableQueues: names })
 * }
 * ```
 */
export function getQueueNames(): string[] {
  let ctx
  try {
    ctx = getContext()
  } catch {
    throw new Error(QUEUE_OUTSIDE_CONTEXT_ERROR)
  }

  const env = ctx.env as Record<string, unknown>
  const queueBindings = getQueueBindingNames(env)
  return queueBindings.map(bindingNameToQueueName)
}

// ============================================================================
// Service Types
// ============================================================================

/**
 * A service interface representing methods callable via RPC or locally.
 *
 * @typeParam T - The service methods type
 */
export type Service<T extends Record<string, (...args: unknown[]) => unknown> = Record<string, (...args: unknown[]) => unknown>> = T

// ============================================================================
// Service Error Messages
// ============================================================================

const SERVICE_OUTSIDE_CONTEXT_ERROR = `Service accessed outside of request handler.

This can happen when:
1. Accessing services at module-load time (top-level code)
2. Accessing services in a setTimeout/setInterval callback
3. The request context was not properly initialized

Services can only be accessed during request handling within a Cloudwerk application.

Example of correct usage:
  import { services } from '@cloudwerk/core/bindings'

  export async function POST() {
    const result = await services.email.send({ to: 'user@example.com', subject: 'Hello' })
    return json(result)
  }
`

function createMissingServiceError(name: string, availableServices: string[]): string {
  const available =
    availableServices.length > 0
      ? `Available services: ${availableServices.join(', ')}`
      : 'No services are configured'

  return `Service '${name}' not found in current environment.

${available}

To add this service, create a file at app/services/${name}/service.ts with:
  import { defineService } from '@cloudwerk/service'
  export default defineService({
    methods: {
      async yourMethod(params) { ... }
    }
  })
`
}

// ============================================================================
// Service Helper Functions
// ============================================================================

/**
 * Get all service binding names from the environment.
 * Service bindings end with _SERVICE by convention.
 */
function getServiceBindingNames(env: Record<string, unknown>): string[] {
  return Object.keys(env).filter(
    (key) => key.endsWith('_SERVICE') && env[key] !== undefined
  )
}

/**
 * Convert a service name (camelCase) to binding name (SCREAMING_SNAKE_CASE_SERVICE).
 */
function serviceNameToBindingName(serviceName: string): string {
  const screaming = serviceName
    .replace(/([A-Z])/g, '_$1')
    .toUpperCase()
    .replace(/^_/, '')

  return `${screaming}_SERVICE`
}

/**
 * Convert a binding name (SCREAMING_SNAKE_CASE_SERVICE) to service name (camelCase).
 */
function bindingNameToServiceName(bindingName: string): string {
  // Remove _SERVICE suffix and convert to camelCase
  const withoutSuffix = bindingName.replace(/_SERVICE$/, '')
  return withoutSuffix.toLowerCase().replace(/_([a-z])/g, (_, letter) =>
    letter.toUpperCase()
  )
}

// ============================================================================
// Local Services Registry
// ============================================================================

/**
 * Registry for local service implementations.
 * Used when services are running in 'local' mode (not extracted).
 */
const localServices = new Map<string, Record<string, (...args: unknown[]) => unknown>>()

/**
 * Register a local service implementation.
 * Called by the Vite plugin during dev/build.
 *
 * @param name - Service name (camelCase)
 * @param methods - Service methods
 */
export function registerLocalService(
  name: string,
  methods: Record<string, (...args: unknown[]) => unknown>
): void {
  localServices.set(name, methods)
}

/**
 * Unregister a local service.
 *
 * @param name - Service name to remove
 */
export function unregisterLocalService(name: string): void {
  localServices.delete(name)
}

/**
 * Clear all local service registrations.
 */
export function clearLocalServices(): void {
  localServices.clear()
}

// ============================================================================
// Services Proxy
// ============================================================================

/**
 * Proxy object that provides typed access to services.
 *
 * Services can run in two modes:
 * - **Local**: Direct function calls within your main Worker
 * - **Extracted**: As separate Workers using Cloudflare's native RPC (service bindings)
 *
 * The API is the same in both modes - the proxy transparently routes to the
 * appropriate implementation based on configuration.
 *
 * @example
 * ```typescript
 * import { services } from '@cloudwerk/core/bindings'
 *
 * export async function POST(request: Request) {
 *   const data = await request.json()
 *
 *   // Call a service method - works the same whether local or extracted
 *   const result = await services.email.send({
 *     to: data.email,
 *     subject: 'Welcome!',
 *     body: 'Thanks for signing up.',
 *   })
 *
 *   // Call another service
 *   await services.analytics.track({
 *     event: 'signup',
 *     userId: data.id,
 *   })
 *
 *   return json(result)
 * }
 * ```
 */
export const services: Record<string, Service> = new Proxy(
  {} as Record<string, Service>,
  {
    get(_target, prop) {
      // Ignore symbol access
      if (typeof prop === 'symbol') {
        return undefined
      }

      // Get current context
      let ctx
      try {
        ctx = getContext()
      } catch {
        throw new Error(SERVICE_OUTSIDE_CONTEXT_ERROR)
      }

      const env = ctx.env as Record<string, unknown>

      // Check for local service first
      const localService = localServices.get(prop)
      if (localService) {
        return localService
      }

      // Check for extracted service (service binding)
      const bindingName = serviceNameToBindingName(prop)
      const binding = env[bindingName]

      if (binding !== undefined) {
        // Service binding - Cloudflare handles RPC natively
        // The binding is a WorkerEntrypoint instance with callable methods
        return binding
      }

      // Service not found
      const serviceBindings = getServiceBindingNames(env)
      const availableServices = [
        ...Array.from(localServices.keys()),
        ...serviceBindings.map(bindingNameToServiceName),
      ]
      throw new Error(createMissingServiceError(prop, availableServices))
    },

    has(_target, prop) {
      if (typeof prop === 'symbol') {
        return false
      }

      // Check local services
      if (localServices.has(prop)) {
        return true
      }

      // Check extracted services
      try {
        const ctx = getContext()
        const env = ctx.env as Record<string, unknown>
        const bindingName = serviceNameToBindingName(prop)
        return bindingName in env && env[bindingName] !== undefined
      } catch {
        return false
      }
    },

    ownKeys() {
      const localServiceNames = Array.from(localServices.keys())

      try {
        const ctx = getContext()
        const env = ctx.env as Record<string, unknown>
        const serviceBindings = getServiceBindingNames(env)
        const extractedNames = serviceBindings.map(bindingNameToServiceName)

        // Combine unique names
        return [...new Set([...localServiceNames, ...extractedNames])]
      } catch {
        return localServiceNames
      }
    },

    getOwnPropertyDescriptor(_target, prop) {
      if (typeof prop === 'symbol') {
        return undefined
      }

      // Check local services
      const localService = localServices.get(prop)
      if (localService) {
        return {
          enumerable: true,
          configurable: true,
          value: localService,
        }
      }

      // Check extracted services
      try {
        const ctx = getContext()
        const env = ctx.env as Record<string, unknown>
        const bindingName = serviceNameToBindingName(prop)
        if (bindingName in env && env[bindingName] !== undefined) {
          return {
            enumerable: true,
            configurable: true,
            value: env[bindingName],
          }
        }
      } catch {
        // Outside context
      }
      return undefined
    },
  }
)

/**
 * Get a specific service with type safety.
 *
 * @param name - The service name (camelCase)
 * @returns The typed service interface
 * @throws Error if called outside request context
 * @throws Error if service is not found
 *
 * @example
 * ```typescript
 * import { getService } from '@cloudwerk/core/bindings'
 *
 * interface EmailService {
 *   send(params: { to: string; subject: string; body: string }): Promise<{ success: boolean }>
 * }
 *
 * export async function POST(request: Request) {
 *   const email = getService<EmailService>('email')
 *   const result = await email.send({
 *     to: 'user@example.com',
 *     subject: 'Hello',
 *     body: 'Welcome!',
 *   })
 *   return json(result)
 * }
 * ```
 */
export function getService<T extends Record<string, (...args: unknown[]) => unknown> = Record<string, (...args: unknown[]) => unknown>>(name: string): T {
  let ctx
  try {
    ctx = getContext()
  } catch {
    throw new Error(SERVICE_OUTSIDE_CONTEXT_ERROR)
  }

  // Check local services first
  const localService = localServices.get(name)
  if (localService) {
    return localService as T
  }

  // Check extracted services
  const env = ctx.env as Record<string, unknown>
  const bindingName = serviceNameToBindingName(name)
  const binding = env[bindingName]

  if (binding !== undefined) {
    return binding as T
  }

  // Service not found
  const serviceBindings = getServiceBindingNames(env)
  const availableServices = [
    ...Array.from(localServices.keys()),
    ...serviceBindings.map(bindingNameToServiceName),
  ]
  throw new Error(createMissingServiceError(name, availableServices))
}

/**
 * Check if a service exists in the current environment.
 *
 * @param name - The service name (camelCase) to check
 * @returns true if the service exists, false otherwise
 * @throws Error if called outside request context (for extracted services)
 *
 * @example
 * ```typescript
 * import { hasService, getService } from '@cloudwerk/core/bindings'
 *
 * export async function POST(request: Request) {
 *   if (hasService('email')) {
 *     const email = getService('email')
 *     await email.send({ ... })
 *   } else {
 *     // Fallback or skip
 *   }
 * }
 * ```
 */
export function hasService(name: string): boolean {
  // Check local services first
  if (localServices.has(name)) {
    return true
  }

  // Check extracted services
  let ctx
  try {
    ctx = getContext()
  } catch {
    // Outside context, can only check local services
    return false
  }

  const env = ctx.env as Record<string, unknown>
  const bindingName = serviceNameToBindingName(name)
  return bindingName in env && env[bindingName] !== undefined
}

/**
 * Get all available service names in the current environment.
 *
 * @returns Array of service names (camelCase)
 * @throws Error if called outside request context (only returns local services outside context)
 *
 * @example
 * ```typescript
 * import { getServiceNames } from '@cloudwerk/core/bindings'
 *
 * export async function GET() {
 *   const names = getServiceNames()
 *   return json({ availableServices: names })
 * }
 * ```
 */
export function getServiceNames(): string[] {
  const localServiceNames = Array.from(localServices.keys())

  let ctx
  try {
    ctx = getContext()
  } catch {
    // Outside context, only return local services
    return localServiceNames
  }

  const env = ctx.env as Record<string, unknown>
  const serviceBindings = getServiceBindingNames(env)
  const extractedNames = serviceBindings.map(bindingNameToServiceName)

  // Return unique names
  return [...new Set([...localServiceNames, ...extractedNames])]
}

// ============================================================================
// Durable Object Types
// ============================================================================

/**
 * Unique identifier for a durable object instance.
 */
export interface DurableObjectId {
  toString(): string
  equals(other: DurableObjectId): boolean
  name?: string
}

/**
 * Stub for interacting with a durable object instance.
 * Methods defined in `defineDurableObject({ methods })` are directly callable via native RPC.
 *
 * @typeParam T - The methods available on the durable object
 */
export interface DurableObjectStub<T = unknown> {
  /** The unique ID of this durable object instance */
  id: DurableObjectId
  /** The name of this durable object instance (if created with idFromName) */
  name?: string
  /** Send an HTTP request to the durable object */
  fetch(request: Request): Promise<Response>
  /** Additional RPC methods are available based on the methods config */
}

/**
 * Namespace for accessing durable object stubs.
 *
 * @typeParam T - The methods available on durable object stubs in this namespace
 */
export interface DurableObjectNamespace<T = unknown> {
  /** Create an ID from a human-readable name */
  idFromName(name: string): DurableObjectId
  /** Parse an ID from its string representation */
  idFromString(id: string): DurableObjectId
  /** Generate a new unique ID */
  newUniqueId(): DurableObjectId
  /** Get a stub to interact with a specific durable object instance */
  get(id: DurableObjectId): DurableObjectStub<T>
}

// ============================================================================
// Durable Object Error Messages
// ============================================================================

const DURABLE_OBJECT_OUTSIDE_CONTEXT_ERROR = `Durable object accessed outside of request handler.

This can happen when:
1. Accessing durable objects at module-load time (top-level code)
2. Accessing durable objects in a setTimeout/setInterval callback
3. The request context was not properly initialized

Durable objects can only be accessed during request handling within a Cloudwerk application.

Example of correct usage:
  import { durableObjects } from '@cloudwerk/core/bindings'

  export async function POST(request: Request, { params }: Context) {
    const id = durableObjects.Counter.idFromName(params.counterId)
    const counter = durableObjects.Counter.get(id)
    const value = await counter.increment(1)
    return json({ value })
  }
`

function createMissingDurableObjectError(name: string, availableObjects: string[]): string {
  const available =
    availableObjects.length > 0
      ? `Available durable objects: ${availableObjects.join(', ')}`
      : 'No durable objects are configured in wrangler.toml'

  return `Durable object '${name}' not found in current environment.

${available}

To add this durable object, create a file at app/objects/${name.charAt(0).toLowerCase() + name.slice(1).replace(/([A-Z])/g, '-$1').toLowerCase()}.ts with:
  import { defineDurableObject } from '@cloudwerk/durable-object'
  export default defineDurableObject({
    methods: {
      async yourMethod(params) { ... }
    }
  })
`
}

// ============================================================================
// Durable Object Helper Functions
// ============================================================================

/**
 * Get all durable object binding names from the environment.
 * Durable object bindings are DurableObjectNamespace instances.
 */
function getDurableObjectBindingNames(env: Record<string, unknown>): string[] {
  return Object.keys(env).filter((key) => {
    const binding = env[key]
    // Check if it looks like a DurableObjectNamespace (has idFromName, idFromString, get methods)
    return (
      binding !== undefined &&
      typeof binding === 'object' &&
      binding !== null &&
      'idFromName' in binding &&
      'idFromString' in binding &&
      'get' in binding &&
      typeof (binding as Record<string, unknown>).idFromName === 'function' &&
      typeof (binding as Record<string, unknown>).idFromString === 'function' &&
      typeof (binding as Record<string, unknown>).get === 'function'
    )
  })
}

/**
 * Convert an object name (camelCase) to binding name (SCREAMING_SNAKE_CASE).
 */
function objectNameToBindingName(objectName: string): string {
  return objectName
    .replace(/([A-Z])/g, '_$1')
    .toUpperCase()
    .replace(/^_/, '')
}

/**
 * Convert a binding name (SCREAMING_SNAKE_CASE) to object name (camelCase).
 */
function doBindingNameToObjectName(bindingName: string): string {
  return bindingName.toLowerCase().replace(/_([a-z])/g, (_, letter) =>
    letter.toUpperCase()
  )
}

// ============================================================================
// Durable Objects Proxy
// ============================================================================

/**
 * Proxy object that provides typed access to durable object namespaces.
 *
 * Access durable objects by their class name (PascalCase), which will resolve
 * from the current request's environment at access time.
 *
 * @example
 * ```typescript
 * import { durableObjects } from '@cloudwerk/core/bindings'
 *
 * export async function POST(request: Request, { params }: Context) {
 *   // Get the durable object namespace
 *   const id = durableObjects.Counter.idFromName(params.counterId)
 *
 *   // Get a stub to the specific instance
 *   const counter = durableObjects.Counter.get(id)
 *
 *   // Call RPC methods directly (no HTTP overhead!)
 *   const value = await counter.increment(1)
 *   const current = await counter.getValue()
 *
 *   return json({ value, current })
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Chat room example with WebSocket
 * import { durableObjects } from '@cloudwerk/core/bindings'
 *
 * export async function GET(request: Request, { params }: Context) {
 *   const upgradeHeader = request.headers.get('Upgrade')
 *   if (upgradeHeader !== 'websocket') {
 *     return new Response('Expected WebSocket', { status: 426 })
 *   }
 *
 *   const id = durableObjects.ChatRoom.idFromName(params.roomId)
 *   const room = durableObjects.ChatRoom.get(id)
 *
 *   // Forward the WebSocket request to the durable object
 *   return room.fetch(request)
 * }
 * ```
 */
export const durableObjects: Record<string, DurableObjectNamespace> = new Proxy(
  {} as Record<string, DurableObjectNamespace>,
  {
    get(_target, prop) {
      // Ignore symbol access
      if (typeof prop === 'symbol') {
        return undefined
      }

      // Get current context
      let ctx
      try {
        ctx = getContext()
      } catch {
        throw new Error(DURABLE_OBJECT_OUTSIDE_CONTEXT_ERROR)
      }

      const env = ctx.env as Record<string, unknown>

      // Convert object name to binding name
      const bindingName = objectNameToBindingName(prop)
      const binding = env[bindingName]

      if (binding !== undefined) {
        // Verify it looks like a DurableObjectNamespace
        if (
          typeof binding === 'object' &&
          binding !== null &&
          'idFromName' in binding &&
          'get' in binding
        ) {
          return binding as DurableObjectNamespace
        }
      }

      // Not found - provide helpful error
      const doBindings = getDurableObjectBindingNames(env)
      const availableObjects = doBindings.map(doBindingNameToObjectName)
      throw new Error(createMissingDurableObjectError(prop, availableObjects))
    },

    has(_target, prop) {
      if (typeof prop === 'symbol') {
        return false
      }

      try {
        const ctx = getContext()
        const env = ctx.env as Record<string, unknown>
        const bindingName = objectNameToBindingName(prop)
        const binding = env[bindingName]
        return (
          binding !== undefined &&
          typeof binding === 'object' &&
          binding !== null &&
          'idFromName' in binding &&
          'get' in binding
        )
      } catch {
        return false
      }
    },

    ownKeys() {
      try {
        const ctx = getContext()
        const env = ctx.env as Record<string, unknown>
        const doBindings = getDurableObjectBindingNames(env)
        return doBindings.map(doBindingNameToObjectName)
      } catch {
        return []
      }
    },

    getOwnPropertyDescriptor(_target, prop) {
      if (typeof prop === 'symbol') {
        return undefined
      }

      try {
        const ctx = getContext()
        const env = ctx.env as Record<string, unknown>
        const bindingName = objectNameToBindingName(prop)
        const binding = env[bindingName]
        if (
          binding !== undefined &&
          typeof binding === 'object' &&
          binding !== null &&
          'idFromName' in binding &&
          'get' in binding
        ) {
          return {
            enumerable: true,
            configurable: true,
            value: binding,
          }
        }
      } catch {
        // Outside context
      }
      return undefined
    },
  }
)

/**
 * Get a specific durable object namespace with type safety.
 *
 * @param name - The durable object class name (PascalCase)
 * @returns The typed durable object namespace
 * @throws Error if called outside request context
 * @throws Error if durable object is not found
 *
 * @example
 * ```typescript
 * import { getDurableObject } from '@cloudwerk/core/bindings'
 *
 * interface CounterMethods {
 *   increment(amount?: number): Promise<number>
 *   decrement(amount?: number): Promise<number>
 *   getValue(): Promise<number>
 * }
 *
 * export async function POST(request: Request, { params }: Context) {
 *   const Counter = getDurableObject<CounterMethods>('Counter')
 *   const id = Counter.idFromName(params.counterId)
 *   const counter = Counter.get(id)
 *
 *   const value = await counter.increment(5)
 *   return json({ value })
 * }
 * ```
 */
export function getDurableObject<T = unknown>(name: string): DurableObjectNamespace<T> {
  let ctx
  try {
    ctx = getContext()
  } catch {
    throw new Error(DURABLE_OBJECT_OUTSIDE_CONTEXT_ERROR)
  }

  const env = ctx.env as Record<string, unknown>
  const bindingName = objectNameToBindingName(name)
  const binding = env[bindingName]

  if (
    binding !== undefined &&
    typeof binding === 'object' &&
    binding !== null &&
    'idFromName' in binding &&
    'get' in binding
  ) {
    return binding as DurableObjectNamespace<T>
  }

  // Not found - provide helpful error
  const doBindings = getDurableObjectBindingNames(env)
  const availableObjects = doBindings.map(doBindingNameToObjectName)
  throw new Error(createMissingDurableObjectError(name, availableObjects))
}

/**
 * Check if a durable object exists in the current environment.
 *
 * @param name - The durable object class name (PascalCase) to check
 * @returns true if the durable object exists, false otherwise
 * @throws Error if called outside request context
 *
 * @example
 * ```typescript
 * import { hasDurableObject, getDurableObject } from '@cloudwerk/core/bindings'
 *
 * export async function POST(request: Request, { params }: Context) {
 *   if (hasDurableObject('Counter')) {
 *     const Counter = getDurableObject('Counter')
 *     const id = Counter.idFromName(params.counterId)
 *     const counter = Counter.get(id)
 *     const value = await counter.increment()
 *     return json({ value })
 *   }
 *   return json({ error: 'Counter not available' }, { status: 503 })
 * }
 * ```
 */
export function hasDurableObject(name: string): boolean {
  let ctx
  try {
    ctx = getContext()
  } catch {
    throw new Error(DURABLE_OBJECT_OUTSIDE_CONTEXT_ERROR)
  }

  const env = ctx.env as Record<string, unknown>
  const bindingName = objectNameToBindingName(name)
  const binding = env[bindingName]
  return (
    binding !== undefined &&
    typeof binding === 'object' &&
    binding !== null &&
    'idFromName' in binding &&
    'get' in binding
  )
}

/**
 * Get all available durable object names in the current environment.
 *
 * @returns Array of durable object class names (PascalCase)
 * @throws Error if called outside request context
 *
 * @example
 * ```typescript
 * import { getDurableObjectNames } from '@cloudwerk/core/bindings'
 *
 * export async function GET() {
 *   const names = getDurableObjectNames()
 *   return json({ availableDurableObjects: names })
 * }
 * ```
 */
export function getDurableObjectNames(): string[] {
  let ctx
  try {
    ctx = getContext()
  } catch {
    throw new Error(DURABLE_OBJECT_OUTSIDE_CONTEXT_ERROR)
  }

  const env = ctx.env as Record<string, unknown>
  const doBindings = getDurableObjectBindingNames(env)
  return doBindings.map(doBindingNameToObjectName)
}
