/**
 * @cloudwerk/durable-object
 *
 * Durable Objects support for Cloudwerk with native Cloudflare RPC.
 *
 * @example
 * ```typescript
 * // Define a durable object (app/objects/counter.ts)
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
 *     ctx.sql.run(`CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY)`)
 *     return { value: 0 }
 *   },
 *
 *   methods: {
 *     async increment(amount = 1) {
 *       this.state.value += amount
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
 * // Access durable objects from route handlers
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
 */

// ============================================================================
// Types
// ============================================================================

export type {
  // Utility Types
  Awaitable,
  SupportedExtension,

  // Context Types
  DurableObjectContext,
  DurableObjectHandlerContext,

  // Cloudflare Types
  DurableObjectStorage,
  DurableObjectStorageListOptions,
  DurableObjectTransaction,
  SqlStorage,
  SqlStorageCursor,
  DurableObjectId,
  DurableObjectNamespace,
  DurableObjectStub,

  // Configuration Types
  DurableObjectConfig,
  DurableObjectDefinition,

  // Scanner Types
  ScannedDurableObject,
  DurableObjectScanResult,

  // Manifest Types
  DurableObjectEntry,
  DurableObjectValidationError,
  DurableObjectValidationWarning,
  DurableObjectManifest,

  // Migration Types
  DurableObjectMigration,

  // Build Options Types
  BuildDurableObjectManifestOptions,
} from './types.js'

// ============================================================================
// Error Classes
// ============================================================================

export {
  DurableObjectError,
  DurableObjectConfigError,
  DurableObjectNoHandlerError,
  DurableObjectContextError,
  DurableObjectNotFoundError,
  DurableObjectStateError,
  DurableObjectSchemaValidationError,
  DurableObjectRPCError,
  DurableObjectMethodNotFoundError,
  DurableObjectAlarmError,
  DurableObjectWebSocketError,
} from './errors.js'

// ============================================================================
// Durable Object Definition
// ============================================================================

export {
  defineDurableObject,
  isDurableObjectDefinition,
  getMethodNames,
  hasHandlers,
  hasWebSocketSupport,
} from './define-durable-object.js'
