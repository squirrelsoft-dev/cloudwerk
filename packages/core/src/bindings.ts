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
