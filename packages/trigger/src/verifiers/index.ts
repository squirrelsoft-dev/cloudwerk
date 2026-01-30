/**
 * @cloudwerk/trigger - Webhook Signature Verifiers
 *
 * Built-in verifiers for popular webhook providers.
 */

export { stripeVerifier, stripe } from './stripe.js'
export { githubVerifier, github } from './github.js'
export { slackVerifier, slack } from './slack.js'
export { twilioVerifier, twilio } from './twilio.js'
export { shopifyVerifier, shopify } from './shopify.js'
export { linearVerifier, linear } from './linear.js'
export { customVerifier, custom } from './custom.js'

// Re-export all verifiers as a convenience object
import { stripe } from './stripe.js'
import { github } from './github.js'
import { slack } from './slack.js'
import { twilio } from './twilio.js'
import { shopify } from './shopify.js'
import { linear } from './linear.js'
import { custom } from './custom.js'

/**
 * Collection of all built-in webhook verifiers.
 *
 * @example
 * ```typescript
 * import { defineTrigger, verifiers } from '@cloudwerk/trigger'
 *
 * export default defineTrigger({
 *   source: {
 *     type: 'webhook',
 *     path: '/webhooks/stripe',
 *     verify: verifiers.stripe(STRIPE_WEBHOOK_SECRET),
 *   },
 *   async handle(event) {
 *     // Handle verified webhook
 *   }
 * })
 * ```
 */
export const verifiers = {
  stripe,
  github,
  slack,
  twilio,
  shopify,
  linear,
  custom,
} as const
