/**
 * Stripe webhook signature verifier.
 *
 * @see https://stripe.com/docs/webhooks/signatures
 */

import type { WebhookVerifier, WebhookVerificationResult } from '../types.js'
import { computeHmac, timingSafeEqual, parseSignatureHeader } from './utils.js'

/**
 * Default tolerance for timestamp validation (5 minutes).
 */
const DEFAULT_TOLERANCE_SECONDS = 300

export interface StripeVerifierOptions {
  /**
   * Tolerance for timestamp validation in seconds.
   * @default 300 (5 minutes)
   */
  tolerance?: number
}

/**
 * Create a Stripe webhook signature verifier.
 *
 * @param secret - Stripe webhook signing secret (whsec_...)
 * @param options - Verifier options
 * @returns WebhookVerifier function
 *
 * @example
 * ```typescript
 * import { defineTrigger, verifiers } from '@cloudwerk/trigger'
 *
 * export default defineTrigger({
 *   source: {
 *     type: 'webhook',
 *     path: '/webhooks/stripe',
 *     verify: verifiers.stripe(process.env.STRIPE_WEBHOOK_SECRET),
 *   },
 *   async handle(event) {
 *     const stripeEvent = event.payload
 *     switch (stripeEvent.type) {
 *       case 'checkout.session.completed':
 *         // Handle checkout completion
 *         break
 *     }
 *   }
 * })
 * ```
 */
export function stripeVerifier(
  secret: string,
  options: StripeVerifierOptions = {}
): WebhookVerifier {
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE_SECONDS

  return async (
    request: Request,
    rawBody: ArrayBuffer
  ): Promise<WebhookVerificationResult> => {
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return {
        valid: false,
        error: 'Missing stripe-signature header',
      }
    }

    // Parse signature header (t=timestamp,v1=signature)
    const parts = parseSignatureHeader(signature)
    const timestamp = parts.get('t')
    const expectedSignature = parts.get('v1')

    if (!timestamp || !expectedSignature) {
      return {
        valid: false,
        error: 'Invalid stripe-signature header format',
      }
    }

    // Validate timestamp
    const timestampNum = parseInt(timestamp, 10)
    if (isNaN(timestampNum)) {
      return {
        valid: false,
        error: 'Invalid timestamp in signature',
      }
    }

    const now = Math.floor(Date.now() / 1000)
    if (Math.abs(now - timestampNum) > tolerance) {
      return {
        valid: false,
        error: `Timestamp outside tolerance (${tolerance}s)`,
      }
    }

    // Compute expected signature
    const payload = new TextDecoder().decode(rawBody)
    const signedPayload = `${timestamp}.${payload}`
    const signedPayloadBytes = new TextEncoder().encode(signedPayload)

    const computedSignature = await computeHmac(
      'SHA-256',
      secret,
      signedPayloadBytes.buffer
    )

    // Compare signatures
    if (!timingSafeEqual(computedSignature, expectedSignature)) {
      return {
        valid: false,
        error: 'Signature mismatch',
      }
    }

    return { valid: true }
  }
}

/**
 * Alias for stripeVerifier.
 */
export const stripe = stripeVerifier
