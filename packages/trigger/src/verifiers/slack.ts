/**
 * Slack webhook signature verifier.
 *
 * @see https://api.slack.com/authentication/verifying-requests-from-slack
 */

import type { WebhookVerifier, WebhookVerificationResult } from '../types.js'
import { computeHmac, timingSafeEqual } from './utils.js'

/**
 * Default tolerance for timestamp validation (5 minutes).
 */
const DEFAULT_TOLERANCE_SECONDS = 300

export interface SlackVerifierOptions {
  /**
   * Tolerance for timestamp validation in seconds.
   * @default 300 (5 minutes)
   */
  tolerance?: number
}

/**
 * Create a Slack webhook signature verifier.
 *
 * @param signingSecret - Slack signing secret
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
 *     path: '/webhooks/slack',
 *     verify: verifiers.slack(process.env.SLACK_SIGNING_SECRET),
 *   },
 *   async handle(event) {
 *     const payload = event.payload
 *     // Handle Slack event
 *   }
 * })
 * ```
 */
export function slackVerifier(
  signingSecret: string,
  options: SlackVerifierOptions = {}
): WebhookVerifier {
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE_SECONDS

  return async (
    request: Request,
    rawBody: ArrayBuffer
  ): Promise<WebhookVerificationResult> => {
    const timestamp = request.headers.get('x-slack-request-timestamp')
    const signature = request.headers.get('x-slack-signature')

    if (!timestamp) {
      return {
        valid: false,
        error: 'Missing X-Slack-Request-Timestamp header',
      }
    }

    if (!signature) {
      return {
        valid: false,
        error: 'Missing X-Slack-Signature header',
      }
    }

    // Validate timestamp
    const timestampNum = parseInt(timestamp, 10)
    if (isNaN(timestampNum)) {
      return {
        valid: false,
        error: 'Invalid timestamp',
      }
    }

    const now = Math.floor(Date.now() / 1000)
    if (Math.abs(now - timestampNum) > tolerance) {
      return {
        valid: false,
        error: `Timestamp outside tolerance (${tolerance}s)`,
      }
    }

    // Verify signature format
    if (!signature.startsWith('v0=')) {
      return {
        valid: false,
        error: 'Invalid signature format (expected v0= prefix)',
      }
    }

    const expectedSignature = signature.slice(3)

    // Compute signature: v0:timestamp:body
    const body = new TextDecoder().decode(rawBody)
    const sigBasestring = `v0:${timestamp}:${body}`
    const sigBasestringBytes = new TextEncoder().encode(sigBasestring)

    const computedSignature = await computeHmac(
      'SHA-256',
      signingSecret,
      sigBasestringBytes.buffer
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
 * Alias for slackVerifier.
 */
export const slack = slackVerifier
