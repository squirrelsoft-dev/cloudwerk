/**
 * Twilio webhook signature verifier.
 *
 * @see https://www.twilio.com/docs/usage/security#validating-requests
 */

import type { WebhookVerifier, WebhookVerificationResult } from '../types.js'
import { computeHmac, timingSafeEqual } from './utils.js'

export interface TwilioVerifierOptions {
  /**
   * The full URL of your webhook endpoint.
   * Required for signature validation.
   */
  url: string
}

/**
 * Create a Twilio webhook signature verifier.
 *
 * @param authToken - Twilio Auth Token
 * @param options - Verifier options including the webhook URL
 * @returns WebhookVerifier function
 *
 * @example
 * ```typescript
 * import { defineTrigger, verifiers } from '@cloudwerk/trigger'
 *
 * export default defineTrigger({
 *   source: {
 *     type: 'webhook',
 *     path: '/webhooks/twilio',
 *     verify: verifiers.twilio(process.env.TWILIO_AUTH_TOKEN, {
 *       url: 'https://your-app.com/webhooks/twilio',
 *     }),
 *   },
 *   async handle(event) {
 *     const { From, Body } = event.payload
 *     // Handle SMS or voice webhook
 *   }
 * })
 * ```
 */
export function twilioVerifier(
  authToken: string,
  options: TwilioVerifierOptions
): WebhookVerifier {
  const { url } = options

  return async (
    request: Request,
    rawBody: ArrayBuffer
  ): Promise<WebhookVerificationResult> => {
    const signature = request.headers.get('x-twilio-signature')

    if (!signature) {
      return {
        valid: false,
        error: 'Missing X-Twilio-Signature header',
      }
    }

    // Parse form data from body
    const body = new TextDecoder().decode(rawBody)
    const params = new URLSearchParams(body)

    // Sort parameters alphabetically and concatenate
    const sortedParams = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}${value}`)
      .join('')

    // Signature is computed over URL + sorted params
    const signatureBase = url + sortedParams
    const signatureBaseBytes = new TextEncoder().encode(signatureBase)

    // Twilio uses SHA-1 HMAC, base64 encoded
    const computedSignatureHex = await computeHmac(
      'SHA-1',
      authToken,
      signatureBaseBytes.buffer
    )

    // Convert hex to base64
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
 * Alias for twilioVerifier.
 */
export const twilio = twilioVerifier
