---
"@cloudwerk/trigger": minor
"@cloudwerk/core": minor
"@cloudwerk/cli": minor
---

feat(trigger): add @cloudwerk/trigger package for event-driven triggers

Introduces the @cloudwerk/trigger package with support for:

- **Trigger Sources**: scheduled (cron), queue, R2, webhook, email, D1, and tail
- **defineTrigger()**: Factory function for creating type-safe trigger definitions
- **Event Types**: Full TypeScript types for all trigger event types
- **Error Handling**: Custom error classes and onError handlers
- **Webhook Verifiers**: Built-in signature verification for Stripe, GitHub, Slack, Twilio, Shopify, Linear
- **Trigger Chaining**: emit() helper for invoking other triggers with trace ID propagation
- **Testing Utilities**: mockEvent factories and testTrigger() helper
- **Observability**: Metrics collection and execution timers

Also adds to @cloudwerk/core:
- **Trigger Scanner**: Discovers trigger files in app/triggers/ with fan-out subdirectory support
- **Trigger Compiler**: Compiles triggers to manifest with validation

Also adds to @cloudwerk/cli:
- **cloudwerk triggers**: Overview of discovered triggers
- **cloudwerk triggers list**: List all triggers with details (--type filter, --json output)
- **cloudwerk triggers validate**: Validate trigger configurations (--strict mode)
- **cloudwerk triggers generate**: Regenerate wrangler.toml and TypeScript types

Example usage:

```typescript
// app/triggers/daily-cleanup.ts
import { defineTrigger } from '@cloudwerk/trigger'

export default defineTrigger({
  source: { type: 'scheduled', cron: '0 0 * * *' },
  async handle(event, ctx) {
    console.log(`[${ctx.traceId}] Running cleanup`)
    await cleanupOldRecords()
  }
})

// app/triggers/stripe-webhook.ts
import { defineTrigger, verifiers } from '@cloudwerk/trigger'

export default defineTrigger({
  source: {
    type: 'webhook',
    path: '/webhooks/stripe',
    verify: verifiers.stripe(process.env.STRIPE_WEBHOOK_SECRET),
  },
  async handle(event) {
    if (event.payload.type === 'checkout.session.completed') {
      await handleCheckout(event.payload)
    }
  }
})
```
