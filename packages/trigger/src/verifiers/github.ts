/**
 * GitHub webhook signature verifier.
 *
 * @see https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
 */

import type { WebhookVerifier, WebhookVerificationResult } from '../types.js'
import { computeHmac, timingSafeEqual } from './utils.js'

/**
 * Create a GitHub webhook signature verifier.
 *
 * @param secret - GitHub webhook secret
 * @returns WebhookVerifier function
 *
 * @example
 * ```typescript
 * import { defineTrigger, verifiers } from '@cloudwerk/trigger'
 *
 * export default defineTrigger({
 *   source: {
 *     type: 'webhook',
 *     path: '/webhooks/github',
 *     verify: verifiers.github(process.env.GITHUB_WEBHOOK_SECRET),
 *   },
 *   async handle(event) {
 *     const githubEvent = event.headers.get('x-github-event')
 *     switch (githubEvent) {
 *       case 'push':
 *         // Handle push event
 *         break
 *       case 'pull_request':
 *         // Handle PR event
 *         break
 *     }
 *   }
 * })
 * ```
 */
export function githubVerifier(secret: string): WebhookVerifier {
  return async (
    request: Request,
    rawBody: ArrayBuffer
  ): Promise<WebhookVerificationResult> => {
    // GitHub uses X-Hub-Signature-256 (SHA-256) or X-Hub-Signature (SHA-1)
    const signatureHeader =
      request.headers.get('x-hub-signature-256') ||
      request.headers.get('x-hub-signature')

    if (!signatureHeader) {
      return {
        valid: false,
        error: 'Missing X-Hub-Signature-256 or X-Hub-Signature header',
      }
    }

    // Determine algorithm based on header
    const useSha256 = signatureHeader.startsWith('sha256=')
    const algorithm = useSha256 ? 'SHA-256' : 'SHA-1'
    const prefix = useSha256 ? 'sha256=' : 'sha1='

    if (!signatureHeader.startsWith(prefix)) {
      return {
        valid: false,
        error: `Invalid signature format (expected ${prefix} prefix)`,
      }
    }

    const expectedSignature = signatureHeader.slice(prefix.length)

    // Compute signature
    const computedSignature = await computeHmac(algorithm, secret, rawBody)

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
 * Alias for githubVerifier.
 */
export const github = githubVerifier
