/**
 * @cloudwerk/core - Context Exports
 *
 * Proxy-based exports that provide ergonomic access to request context
 * without calling getContext() in every handler.
 *
 * @example
 * ```typescript
 * import { params, request, getRequestId } from '@cloudwerk/core/context'
 *
 * export async function GET() {
 *   const userId = params.id
 *   const authHeader = request.headers.get('Authorization')
 *   const reqId = getRequestId()
 *   return json({ userId, requestId: reqId })
 * }
 * ```
 */

import { getContext } from './context.js'
import type { CloudwerkContext, ExecutionContext } from './types.js'

// ============================================================================
// Error Messages
// ============================================================================

const OUTSIDE_CONTEXT_ERROR = `Context accessed outside of request handler.

This can happen when:
1. Accessing context at module-load time (top-level code)
2. Accessing context in a setTimeout/setInterval callback
3. The request context was not properly initialized

Context can only be accessed during request handling within a Cloudwerk application.

Example of correct usage:
  import { params, request } from '@cloudwerk/core/context'

  export async function GET() {
    const userId = params.id
    return json({ userId })
  }
`

function getContextSafe(): CloudwerkContext {
  try {
    return getContext()
  } catch {
    throw new Error(OUTSIDE_CONTEXT_ERROR)
  }
}

// ============================================================================
// Proxy Objects
// ============================================================================

/**
 * Proxy for route parameters from dynamic segments.
 *
 * @example
 * ```typescript
 * import { params } from '@cloudwerk/core/context'
 *
 * // For route /users/[id]/posts/[postId]/page.tsx
 * export async function GET() {
 *   const { id, postId } = params
 *   return json({ userId: id, postId })
 * }
 * ```
 */
export const params: Record<string, string> = new Proxy(
  {} as Record<string, string>,
  {
    get(_target, prop) {
      if (typeof prop === 'symbol') {
        return undefined
      }
      const ctx = getContextSafe()
      return ctx.params[prop]
    },

    has(_target, prop) {
      if (typeof prop === 'symbol') {
        return false
      }
      try {
        const ctx = getContext()
        return prop in ctx.params
      } catch {
        return false
      }
    },

    ownKeys() {
      try {
        const ctx = getContext()
        return Object.keys(ctx.params)
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
        if (prop in ctx.params) {
          return {
            enumerable: true,
            configurable: true,
            value: ctx.params[prop],
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
 * Proxy for the current Request object.
 *
 * Provides access to request properties like url, headers, method, etc.
 *
 * @example
 * ```typescript
 * import { request } from '@cloudwerk/core/context'
 *
 * export async function GET() {
 *   const url = new URL(request.url)
 *   const authHeader = request.headers.get('Authorization')
 *   return json({ path: url.pathname })
 * }
 * ```
 */
export const request: Request = new Proxy({} as Request, {
  get(_target, prop) {
    const ctx = getContextSafe()
    const value = (ctx.request as unknown as Record<string | symbol, unknown>)[prop]

    // Bind methods to the request object
    if (typeof value === 'function') {
      return value.bind(ctx.request)
    }

    return value
  },

  has(_target, prop) {
    try {
      const ctx = getContext()
      return prop in ctx.request
    } catch {
      return false
    }
  },
})

/**
 * Proxy for the Cloudflare environment bindings.
 *
 * @example
 * ```typescript
 * import { env } from '@cloudwerk/core/context'
 *
 * export async function GET() {
 *   const db = env.DB as D1Database
 *   const posts = await db.prepare('SELECT * FROM posts').all()
 *   return json(posts)
 * }
 * ```
 */
export const env: Record<string, unknown> = new Proxy(
  {} as Record<string, unknown>,
  {
    get(_target, prop) {
      if (typeof prop === 'symbol') {
        return undefined
      }
      const ctx = getContextSafe()
      return (ctx.env as Record<string, unknown>)[prop]
    },

    has(_target, prop) {
      if (typeof prop === 'symbol') {
        return false
      }
      try {
        const ctx = getContext()
        return prop in (ctx.env as Record<string, unknown>)
      } catch {
        return false
      }
    },

    ownKeys() {
      try {
        const ctx = getContext()
        return Object.keys(ctx.env as Record<string, unknown>)
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
        const envObj = ctx.env as Record<string, unknown>
        if (prop in envObj) {
          return {
            enumerable: true,
            configurable: true,
            value: envObj[prop],
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
 * Proxy for the Cloudflare execution context.
 *
 * Provides access to waitUntil() for background tasks.
 *
 * @example
 * ```typescript
 * import { executionCtx } from '@cloudwerk/core/context'
 *
 * export async function POST() {
 *   const data = await request.json()
 *
 *   // Fire-and-forget background task
 *   executionCtx.waitUntil(
 *     sendAnalytics({ event: 'data_submitted', data })
 *   )
 *
 *   return json({ success: true })
 * }
 * ```
 */
export const executionCtx: ExecutionContext = new Proxy({} as ExecutionContext, {
  get(_target, prop) {
    const ctx = getContextSafe()
    const value = (ctx.executionCtx as unknown as Record<string | symbol, unknown>)[prop]

    // Bind methods to the execution context object
    if (typeof value === 'function') {
      return value.bind(ctx.executionCtx)
    }

    return value
  },

  has(_target, prop) {
    try {
      const ctx = getContext()
      return prop in ctx.executionCtx
    } catch {
      return false
    }
  },
})

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the auto-generated request ID for tracing.
 *
 * Each request is assigned a unique UUID that can be used for
 * logging, debugging, and distributed tracing.
 *
 * @returns The unique request ID
 * @throws Error if called outside request context
 *
 * @example
 * ```typescript
 * import { getRequestId } from '@cloudwerk/core/context'
 *
 * export async function GET() {
 *   const requestId = getRequestId()
 *   console.log(`[${requestId}] Processing request`)
 *   return json({ requestId })
 * }
 * ```
 */
export function getRequestId(): string {
  const ctx = getContextSafe()
  return ctx.requestId
}

/**
 * Get a value from the request context data store.
 *
 * Useful for reading data set by middleware.
 *
 * @param key - The key to retrieve
 * @returns The value, or undefined if not set
 * @throws Error if called outside request context
 *
 * @example
 * ```typescript
 * import { get } from '@cloudwerk/core/context'
 *
 * export async function GET() {
 *   // Access user set by auth middleware
 *   const user = get<User>('user')
 *   if (!user) {
 *     return new Response('Unauthorized', { status: 401 })
 *   }
 *   return json({ user })
 * }
 * ```
 */
export function get<T>(key: string): T | undefined {
  const ctx = getContextSafe()
  return ctx.get<T>(key)
}

/**
 * Set a value in the request context data store.
 *
 * Useful for sharing data between middleware and handlers.
 *
 * @param key - The key to set
 * @param value - The value to store
 * @throws Error if called outside request context
 *
 * @example
 * ```typescript
 * import { set } from '@cloudwerk/core/context'
 * import type { Middleware } from '@cloudwerk/core'
 *
 * export const middleware: Middleware = async (request, next) => {
 *   const user = await validateSession(request)
 *   set('user', user)
 *   return next()
 * }
 * ```
 */
export function set<T>(key: string, value: T): void {
  const ctx = getContextSafe()
  ctx.set<T>(key, value)
}
