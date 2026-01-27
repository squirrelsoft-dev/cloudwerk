/**
 * @cloudwerk/core - Request Context
 *
 * AsyncLocalStorage-based request context for accessing Cloudflare bindings,
 * middleware data, and execution context without explicit parameter passing.
 */

import { AsyncLocalStorage } from 'node:async_hooks'
import type { Context, Handler, MiddlewareHandler } from 'hono'
import type { CloudwerkContext, CloudwerkHandler, ExecutionContext } from './types.js'

// ============================================================================
// Internal Context Storage
// ============================================================================

/**
 * Internal AsyncLocalStorage instance for request-scoped context.
 * This is not exported to prevent direct manipulation.
 */
const contextStorage = new AsyncLocalStorage<CloudwerkContext<unknown>>()

// ============================================================================
// Context Creation
// ============================================================================

/**
 * Create a CloudwerkContext from a Hono context.
 *
 * @param honoContext - The Hono request context
 * @returns A new CloudwerkContext instance
 *
 * @example
 * const ctx = createContext<MyEnv>(c)
 * ctx.env.DB // Access D1 binding
 * ctx.request.url // Access request URL
 */
export function createContext<Env = Record<string, unknown>>(
  honoContext: Context
): CloudwerkContext<Env> {
  // Internal data store for get/set operations
  const dataStore = new Map<string, unknown>()

  // Generate unique request ID for tracing
  const requestId = crypto.randomUUID()

  // Extract execution context from Hono (may throw in some environments)
  let executionCtx: ExecutionContext
  try {
    executionCtx = honoContext.executionCtx
  } catch {
    // Fallback for environments without execution context (e.g., tests, non-Workers)
    executionCtx = {
      waitUntil: () => {},
      passThroughOnException: () => {},
    }
  }

  return {
    request: honoContext.req.raw,
    env: honoContext.env as Env,
    executionCtx,
    params: {}, // Will be set by router when handling dynamic routes
    requestId,

    get<T>(key: string): T | undefined {
      return dataStore.get(key) as T | undefined
    },

    set<T>(key: string, value: T): void {
      dataStore.set(key, value)
    },
  }
}

// ============================================================================
// Context Execution
// ============================================================================

/**
 * Run a function within a request context.
 *
 * @param ctx - The CloudwerkContext to use
 * @param fn - The function to execute within the context
 * @returns The return value of the function
 *
 * @example
 * const result = runWithContext(ctx, () => {
 *   const currentCtx = getContext()
 *   return currentCtx.env.DB.prepare('SELECT * FROM users').all()
 * })
 */
export function runWithContext<T>(ctx: CloudwerkContext, fn: () => T): T {
  return contextStorage.run(ctx, fn)
}

// ============================================================================
// Context Access
// ============================================================================

/**
 * Get the current request context.
 *
 * @returns The current CloudwerkContext
 * @throws Error if called outside of a request handler
 *
 * @example
 * // In a route handler:
 * export function GET() {
 *   const ctx = getContext<MyEnv>()
 *   const db = ctx.env.DB
 *   const userId = ctx.params.id
 *   return json({ userId })
 * }
 *
 * @example
 * // In a service function:
 * async function getCurrentUser() {
 *   const { env, request } = getContext<MyEnv>()
 *   const token = request.headers.get('Authorization')
 *   return env.DB.prepare('SELECT * FROM users WHERE token = ?').bind(token).first()
 * }
 */
export function getContext<Env = Record<string, unknown>>(): CloudwerkContext<Env> {
  const ctx = contextStorage.getStore()

  if (!ctx) {
    throw new Error(
      `getContext() called outside of request handler.

This function can only be used during request handling within a Cloudwerk application.
If you're seeing this error on Cloudflare Workers, ensure nodejs_compat is enabled:

  # wrangler.toml
  compatibility_flags = ["nodejs_compat"]`
    )
  }

  return ctx as CloudwerkContext<Env>
}

// ============================================================================
// Context Middleware
// ============================================================================

/**
 * Hono middleware that creates and wraps requests with CloudwerkContext.
 *
 * This middleware should be applied first in the middleware chain to ensure
 * all subsequent handlers have access to the context.
 *
 * @returns Hono middleware handler
 *
 * @example
 * import { Hono } from 'hono'
 * import { contextMiddleware } from '@cloudwerk/core'
 *
 * const app = new Hono()
 * app.use('*', contextMiddleware())
 */
export function contextMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const ctx = createContext(c)

    // Run the rest of the middleware chain within the context
    return runWithContext(ctx, async () => {
      await next()
    })
  }
}

// ============================================================================
// Handler Adapter
// ============================================================================

/**
 * Create a Hono-compatible handler from a Cloudwerk-native handler.
 *
 * This adapter bridges the gap between Cloudwerk's handler signature
 * `(request: Request, context: { params }) => Response` and Hono's
 * handler signature `(c: Context) => Response`.
 *
 * @param handler - A Cloudwerk-native route handler
 * @returns A Hono-compatible handler
 *
 * @example
 * import { Hono } from 'hono'
 * import { createHandlerAdapter } from '@cloudwerk/core'
 *
 * const app = new Hono()
 *
 * const myHandler: CloudwerkHandler<{ id: string }> = (request, { params }) => {
 *   return Response.json({ userId: params.id })
 * }
 *
 * app.get('/users/:id', createHandlerAdapter(myHandler))
 */
export function createHandlerAdapter<TParams = Record<string, string>>(
  handler: CloudwerkHandler<TParams>
): Handler {
  return async (c: Context) => {
    // Extract params from Hono context
    const params = c.req.param() as TParams

    // Update CloudwerkContext params for getContext() access
    const ctx = getContext()
    Object.assign(ctx.params, params)

    // Call native handler with standard Request and params
    return handler(c.req.raw, { params })
  }
}
