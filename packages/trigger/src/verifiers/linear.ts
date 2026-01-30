/**
 * Linear webhook signature verifier.
 *
 * @see https://developers.linear.app/docs/graphql/webhooks#webhook-security
 */

import type { WebhookVerifier, WebhookVerificationResult } from '../types.js'
import { computeHmac, timingSafeEqual } from './utils.js'

/**
 * Create a Linear webhook signature verifier.
 *
 * @param secret - Linear webhook signing secret
 * @returns WebhookVerifier function
 *
 * @example
 * ```typescript
 * import { defineTrigger, verifiers } from '@cloudwerk/trigger'
 *
 * export default defineTrigger({
 *   source: {
 *     type: 'webhook',
 *     path: '/webhooks/linear',
 *     verify: verifiers.linear(process.env.LINEAR_WEBHOOK_SECRET),
 *   },
 *   async handle(event) {
 *     const { action, type, data } = event.payload
 *     switch (type) {
 *       case 'Issue':
 *         if (action === 'create') {
 *           // Handle new issue
 *         }
 *         break
 *     }
 *   }
 * })
 * ```
 */
export function linearVerifier(secret: string): WebhookVerifier {
  return async (
    request: Request,
    rawBody: ArrayBuffer
  ): Promise<WebhookVerificationResult> => {
    const signature = request.headers.get('linear-signature')

    if (!signature) {
      return {
        valid: false,
        error: 'Missing Linear-Signature header',
      }
    }

    // Compute HMAC-SHA256
    const computedSignature = await computeHmac('SHA-256', secret, rawBody)

    // Compare signatures (Linear uses hex)
    if (!timingSafeEqual(computedSignature, signature)) {
      return {
        valid: false,
        error: 'Signature mismatch',
      }
    }

    return { valid: true }
  }
}

/**
 * Alias for linearVerifier.
 */
export const linear = linearVerifier
