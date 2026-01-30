/**
 * @cloudwerk/service
 *
 * Service extraction and RPC for Cloudwerk.
 *
 * Services enable you to define reusable business logic that can run:
 * - **Locally**: Direct function calls within your main Worker
 * - **Extracted**: As separate Workers using Cloudflare's native RPC
 *
 * The same API works in both modes - just change the configuration.
 *
 * @example
 * ```typescript
 * // Define a service (app/services/email/service.ts)
 * import { defineService } from '@cloudwerk/service'
 *
 * export default defineService({
 *   methods: {
 *     async send({ to, subject, body }) {
 *       await sendEmail(to, subject, body)
 *       return { success: true }
 *     }
 *   }
 * })
 * ```
 *
 * @example
 * ```typescript
 * // Call services from route handlers
 * import { services } from '@cloudwerk/core/bindings'
 *
 * export async function POST(request: Request) {
 *   const { to, subject, body } = await request.json()
 *
 *   // Works identically whether local or extracted!
 *   const result = await services.email.send({ to, subject, body })
 *
 *   return json(result)
 * }
 * ```
 */

export * from './types.js'

// ============================================================================
// Error Classes
// ============================================================================

export {
  ServiceError,
  ServiceNoMethodsError,
  ServiceInvalidMethodError,
  ServiceConfigError,
  ServiceContextError,
  ServiceNotFoundError,
  ServiceMethodError,
  ServiceInitError,
} from './errors.js'

// ============================================================================
// Service Definition
// ============================================================================

export { defineService, isServiceDefinition } from './define-service.js'

// ============================================================================
// Lifecycle Hooks
// ============================================================================

export { HooksManager, createHooksManager } from './hooks/index.js'
