# @cloudwerk/trigger

## 0.2.0

### Minor Changes

- [#298](https://github.com/squirrelsoft-dev/cloudwerk/pull/298) [`53f62e4`](https://github.com/squirrelsoft-dev/cloudwerk/commit/53f62e4cc626f5f57477a921e18eeedcaccc3f55) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Bump `vitest` from ^1.0.0 to ^4.0.0 and `@vitest/coverage-v8` from ^1.0.0 to ^4.0.0 across the root and every workspace package with a test script. This clears the critical advisory GHSA-5xrq-8626-4rwp (arbitrary file read/execute via the Vitest UI server, fixed in ≥3.2.6) and collapses the duplicate `vite@5.4.21` that vitest 1's vite-node pulled in — the lockfile now resolves a single `vite@6.4.3`. Vitest 4 requires Vite ≥6 and Node ≥20, both already satisfied. No `vitest.config.*`/`vite.config.*` migration was needed: no config used the removed `coverage.all`/`coverage.extensions` options (all already use `coverage.include`), no constructor `vi.spyOn` usage, no snapshots to re-baseline. All 1605 tests pass on vitest 4.1.10.

### Patch Changes

- Updated dependencies [[`fea241d`](https://github.com/squirrelsoft-dev/cloudwerk/commit/fea241db0bf53c6c1c586abf66d7064cd7b9d685), [`be8b381`](https://github.com/squirrelsoft-dev/cloudwerk/commit/be8b381726429cb8a1a847364a67abf2adcfc690), [`53f62e4`](https://github.com/squirrelsoft-dev/cloudwerk/commit/53f62e4cc626f5f57477a921e18eeedcaccc3f55), [`bf8ddb2`](https://github.com/squirrelsoft-dev/cloudwerk/commit/bf8ddb2a74f26fd83e269eaa04d318aa68d055de)]:
  - @cloudwerk/core@0.17.0

## 0.1.4

### Patch Changes

- Updated dependencies [[`00cc9c5`](https://github.com/squirrelsoft-dev/cloudwerk/commit/00cc9c509f0f19ab42a1cb7f8fcaec33fd4ff354)]:
  - @cloudwerk/core@0.15.3

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
