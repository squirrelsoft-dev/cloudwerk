/**
 * Shopify webhook signature verifier.
 *
 * @see https://shopify.dev/docs/apps/webhooks/configuration/https#step-5-verify-the-webhook
 */

import type { WebhookVerifier, WebhookVerificationResult } from '../types.js'
import { computeHmac, timingSafeEqual } from './utils.js'

/**
 * Create a Shopify webhook signature verifier.
 *
 * @param secret - Shopify webhook signing secret (from Partner Dashboard)
 * @returns WebhookVerifier function
 *
 * @example
 * ```typescript
 * import { defineTrigger, verifiers } from '@cloudwerk/trigger'
 *
 * export default defineTrigger({
 *   source: {
 *     type: 'webhook',
 *     path: '/webhooks/shopify',
 *     verify: verifiers.shopify(process.env.SHOPIFY_WEBHOOK_SECRET),
 *   },
 *   async handle(event) {
 *     const topic = event.headers.get('x-shopify-topic')
 *     switch (topic) {
 *       case 'orders/create':
 *         // Handle new order
 *         break
 *       case 'products/update':
 *         // Handle product update
 *         break
 *     }
 *   }
 * })
 * ```
 */
export function shopifyVerifier(secret: string): WebhookVerifier {
  return async (
    request: Request,
    rawBody: ArrayBuffer
  ): Promise<WebhookVerificationResult> => {
    const signature = request.headers.get('x-shopify-hmac-sha256')

    if (!signature) {
      return {
        valid: false,
        error: 'Missing X-Shopify-Hmac-Sha256 header',
      }
    }

    // Compute HMAC-SHA256
    const computedSignatureHex = await computeHmac('SHA-256', secret, rawBody)

    // Convert hex to base64 (Shopify uses base64)
    const computedSignatureBytes = new Uint8Array(
      computedSignatureHex.match(/.{2}/g)!.map((byte) => parseInt(byte, 16))
    )
    const computedSignature = btoa(
      String.fromCharCode(...computedSignatureBytes)
    )

    // Compare signatures
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
 * Alias for shopifyVerifier.
 */
export const shopify = shopifyVerifier
