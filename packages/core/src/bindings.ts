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
