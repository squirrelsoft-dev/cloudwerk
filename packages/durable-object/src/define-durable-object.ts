/**
 * @cloudwerk/durable-object - defineDurableObject()
 *
 * Factory function for creating Durable Object definitions with native RPC support.
 */

import type { DurableObjectConfig, DurableObjectDefinition } from './types.js'
import { DurableObjectConfigError, DurableObjectNoHandlerError } from './errors.js'

// ============================================================================
// Validation
// ============================================================================

/**
 * Valid name pattern for durable objects.
 * Must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens.
 */
const NAME_PATTERN = /^[a-z][a-z0-9-]*$/

/**
 * Reserved method names that cannot be used in the methods config.
 */
const RESERVED_METHODS = new Set([
  'fetch',
  'alarm',
  'webSocketMessage',
  'webSocketClose',
  'webSocketError',
  'constructor',
  'init',
])

/**
 * Validate durable object configuration.
 *
 * @param config - Durable object configuration to validate
 * @throws DurableObjectConfigError if configuration is invalid
 * @throws DurableObjectNoHandlerError if no handler is defined
 */
function validateConfig<TState, TEnv>(
  config: DurableObjectConfig<TState, TEnv>
): void {
  // Must have at least one handler
  const hasHandler =
    config.fetch !== undefined ||
    config.alarm !== undefined ||
    config.webSocketMessage !== undefined ||
    (config.methods !== undefined && Object.keys(config.methods).length > 0)

  if (!hasHandler) {
    throw new DurableObjectNoHandlerError(config.name || 'unknown')
  }

  // Validate name if provided
  if (config.name !== undefined) {
    if (typeof config.name !== 'string' || config.name.length === 0) {
      throw new DurableObjectConfigError('name must be a non-empty string', 'name')
    }

    if (!NAME_PATTERN.test(config.name)) {
      throw new DurableObjectConfigError(
        'name must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens',
        'name'
      )
    }
  }

  // Validate sqlite flag
  if (config.sqlite !== undefined && typeof config.sqlite !== 'boolean') {
    throw new DurableObjectConfigError('sqlite must be a boolean', 'sqlite')
  }

  // Validate methods if provided
  if (config.methods !== undefined) {
    if (typeof config.methods !== 'object' || config.methods === null) {
      throw new DurableObjectConfigError('methods must be an object', 'methods')
    }

    for (const methodName of Object.keys(config.methods)) {
      // Check for reserved names
      if (RESERVED_METHODS.has(methodName)) {
        throw new DurableObjectConfigError(
          `'${methodName}' is a reserved method name and cannot be used in methods config`,
          'methods'
        )
      }

      // Check that method is a function
      if (typeof config.methods[methodName] !== 'function') {
        throw new DurableObjectConfigError(
          `methods.${methodName} must be a function`,
          'methods'
        )
      }

      // Validate method name format (must be valid JS identifier)
      if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(methodName)) {
        throw new DurableObjectConfigError(
          `'${methodName}' is not a valid method name. Method names must be valid JavaScript identifiers`,
          'methods'
        )
      }
    }
  }

  // Validate handlers are functions
  if (config.init !== undefined && typeof config.init !== 'function') {
    throw new DurableObjectConfigError('init must be a function', 'init')
  }

  if (config.fetch !== undefined && typeof config.fetch !== 'function') {
    throw new DurableObjectConfigError('fetch must be a function', 'fetch')
  }

  if (config.alarm !== undefined && typeof config.alarm !== 'function') {
    throw new DurableObjectConfigError('alarm must be a function', 'alarm')
  }

  if (
    config.webSocketMessage !== undefined &&
    typeof config.webSocketMessage !== 'function'
  ) {
    throw new DurableObjectConfigError(
      'webSocketMessage must be a function',
      'webSocketMessage'
    )
  }

  if (
    config.webSocketClose !== undefined &&
    typeof config.webSocketClose !== 'function'
  ) {
    throw new DurableObjectConfigError('webSocketClose must be a function', 'webSocketClose')
  }

  if (
    config.webSocketError !== undefined &&
    typeof config.webSocketError !== 'function'
  ) {
    throw new DurableObjectConfigError('webSocketError must be a function', 'webSocketError')
  }
}

// ============================================================================
// defineDurableObject()
// ============================================================================

/**
 * Define a Durable Object with native Cloudflare RPC support.
 *
 * This function creates a durable object definition that will be automatically
 * discovered and registered by Cloudwerk during build. The build process generates
 * a class extending Cloudflare's DurableObject with native RPC methods.
 *
 * @typeParam TState - The state type managed by this durable object
 * @typeParam TEnv - The environment bindings type
 * @param config - Durable object configuration
 * @returns Durable object definition
 *
 * @example
 * ```typescript
 * // app/objects/counter.ts
 * import { defineDurableObject } from '@cloudwerk/durable-object'
 *
 * interface CounterState {
 *   value: number
 * }
 *
 * export default defineDurableObject<CounterState>({
 *   sqlite: true,
 *
 *   async init(ctx) {
 *     ctx.sql.run(`CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY, action TEXT)`)
 *     return { value: 0 }
 *   },
 *
 *   methods: {
 *     async increment(amount = 1) {
 *       this.state.value += amount
 *       this.ctx.sql.run(`INSERT INTO logs (action) VALUES ('increment')`)
 *       return this.state.value
 *     },
 *
 *     async getValue() {
 *       return this.state.value
 *     },
 *   },
 * })
 * ```
 *
 * @example
 * ```typescript
 * // Usage in route handler:
 * import { durableObjects } from '@cloudwerk/bindings'
 *
 * export async function POST(request: Request, { params }: Context) {
 *   const id = durableObjects.Counter.idFromName(params.id)
 *   const stub = durableObjects.Counter.get(id)
 *
 *   // Native RPC - direct method calls!
 *   const value = await stub.increment(5)
 *
 *   return Response.json({ value })
 * }
 * ```
 *
 * @example
 * ```typescript
 * // With HTTP fetch handler
 * import { defineDurableObject } from '@cloudwerk/durable-object'
 *
 * export default defineDurableObject<{ count: number }>({
 *   init: () => ({ count: 0 }),
 *
 *   async fetch(request) {
 *     const url = new URL(request.url)
 *
 *     if (url.pathname === '/increment') {
 *       this.state.count++
 *     }
 *
 *     return new Response(String(this.state.count))
 *   },
 * })
 * ```
 *
 * @example
 * ```typescript
 * // With WebSocket support
 * import { defineDurableObject } from '@cloudwerk/durable-object'
 *
 * interface ChatState {
 *   messages: string[]
 * }
 *
 * export default defineDurableObject<ChatState>({
 *   init: () => ({ messages: [] }),
 *
 *   async fetch(request) {
 *     const upgradeHeader = request.headers.get('Upgrade')
 *     if (upgradeHeader !== 'websocket') {
 *       return new Response('Expected WebSocket', { status: 426 })
 *     }
 *
 *     const pair = new WebSocketPair()
 *     this.ctx.acceptWebSocket(pair[1])
 *
 *     return new Response(null, { status: 101, webSocket: pair[0] })
 *   },
 *
 *   async webSocketMessage(ws, message) {
 *     this.state.messages.push(String(message))
 *
 *     // Broadcast to all connected clients
 *     for (const client of this.ctx.getWebSockets()) {
 *       client.send(String(message))
 *     }
 *   },
 * })
 * ```
 *
 * @example
 * ```typescript
 * // With alarm handler
 * import { defineDurableObject } from '@cloudwerk/durable-object'
 *
 * interface CleanupState {
 *   lastCleanup: number
 * }
 *
 * export default defineDurableObject<CleanupState>({
 *   async init(ctx) {
 *     // Schedule first alarm for 1 hour from now
 *     await ctx.storage.setAlarm(Date.now() + 60 * 60 * 1000)
 *     return { lastCleanup: Date.now() }
 *   },
 *
 *   async alarm() {
 *     // Perform periodic cleanup
 *     this.state.lastCleanup = Date.now()
 *
 *     // Reschedule for next hour
 *     await this.ctx.storage.setAlarm(Date.now() + 60 * 60 * 1000)
 *   },
 *
 *   methods: {
 *     getLastCleanup() {
 *       return this.state.lastCleanup
 *     },
 *   },
 * })
 * ```
 */
export function defineDurableObject<TState = unknown, TEnv = unknown>(
  config: DurableObjectConfig<TState, TEnv>
): DurableObjectDefinition<TState, TEnv> {
  // Validate configuration
  validateConfig(config)

  // Create the definition object
  const definition: DurableObjectDefinition<TState, TEnv> = {
    __brand: 'cloudwerk-durable-object',
    name: config.name,
    sqlite: config.sqlite ?? false,
    schema: config.schema,
    config,
  }

  return definition
}

/**
 * Check if a value is a durable object definition created by defineDurableObject().
 *
 * @param value - Value to check
 * @returns true if value is a DurableObjectDefinition
 */
export function isDurableObjectDefinition(
  value: unknown
): value is DurableObjectDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__brand' in value &&
    (value as DurableObjectDefinition).__brand === 'cloudwerk-durable-object'
  )
}

/**
 * Extract method names from a durable object definition.
 *
 * @param definition - The durable object definition
 * @returns Array of method names
 */
export function getMethodNames(definition: DurableObjectDefinition): string[] {
  const methods = definition.config.methods
  if (!methods) {
    return []
  }
  return Object.keys(methods)
}

/**
 * Check if a durable object definition has any handlers.
 *
 * @param definition - The durable object definition
 * @returns true if at least one handler is defined
 */
export function hasHandlers(definition: DurableObjectDefinition): boolean {
  const { config } = definition
  return (
    config.fetch !== undefined ||
    config.alarm !== undefined ||
    config.webSocketMessage !== undefined ||
    (config.methods !== undefined && Object.keys(config.methods).length > 0)
  )
}

/**
 * Check if a durable object definition has WebSocket support.
 *
 * @param definition - The durable object definition
 * @returns true if any WebSocket handler is defined
 */
export function hasWebSocketSupport(definition: DurableObjectDefinition): boolean {
  const { config } = definition
  return (
    config.webSocketMessage !== undefined ||
    config.webSocketClose !== undefined ||
    config.webSocketError !== undefined
  )
}
