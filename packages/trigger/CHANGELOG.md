# @cloudwerk/trigger

## 0.1.3

### Patch Changes

- Updated dependencies [[`30285a8`](https://github.com/squirrelsoft-dev/cloudwerk/commit/30285a8468f670bb0c57386c3a470f19bba2ee49)]:
  - @cloudwerk/core@0.15.1

## 0.1.2

### Patch Changes

- Updated dependencies [[`3a54d33`](https://github.com/squirrelsoft-dev/cloudwerk/commit/3a54d330f2eb5e1bbb5c1aef62917e061df61ef6)]:
  - @cloudwerk/core@0.15.0

## 0.1.1

### Patch Changes

- Updated dependencies [[`5f38299`](https://github.com/squirrelsoft-dev/cloudwerk/commit/5f3829954b73d119ef57bceddc6c806a5fbaca3c)]:
  - @cloudwerk/core@0.14.0

## 0.1.0

### Minor Changes

- [#217](https://github.com/squirrelsoft-dev/cloudwerk/pull/217) [`96b77e6`](https://github.com/squirrelsoft-dev/cloudwerk/commit/96b77e6056f5b6c522dfaf07264aafa48f26249f) Thanks [@sbeardsley](https://github.com/sbeardsley)! - feat(trigger): add @cloudwerk/trigger package for event-driven triggers

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
  import { defineTrigger } from "@cloudwerk/trigger";

  export default defineTrigger({
    source: { type: "scheduled", cron: "0 0 * * *" },
    async handle(event, ctx) {
      console.log(`[${ctx.traceId}] Running cleanup`);
      await cleanupOldRecords();
    },
  });

  // app/triggers/stripe-webhook.ts
  import { defineTrigger, verifiers } from "@cloudwerk/trigger";

  export default defineTrigger({
    source: {
      type: "webhook",
      path: "/webhooks/stripe",
      verify: verifiers.stripe(process.env.STRIPE_WEBHOOK_SECRET),
    },
    async handle(event) {
      if (event.payload.type === "checkout.session.completed") {
        await handleCheckout(event.payload);
      }
    },
  });
  ```

### Patch Changes

- Updated dependencies [[`96b77e6`](https://github.com/squirrelsoft-dev/cloudwerk/commit/96b77e6056f5b6c522dfaf07264aafa48f26249f), [`068b10f`](https://github.com/squirrelsoft-dev/cloudwerk/commit/068b10ffbe84dbbe38307c3ebdfe415f53a1904b), [`c179642`](https://github.com/squirrelsoft-dev/cloudwerk/commit/c179642bd67ced2d170bcdb4a723767aacd81eb0), [`39d7a47`](https://github.com/squirrelsoft-dev/cloudwerk/commit/39d7a4783a5aca94073cdd6b142cc74789856e61)]:
  - @cloudwerk/core@0.13.0
