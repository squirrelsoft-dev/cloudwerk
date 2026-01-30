---
"@cloudwerk/queue": minor
"@cloudwerk/core": minor
"@cloudwerk/cli": minor
"@cloudwerk/vite-plugin": minor
---

feat(queue): implement queue producers and consumers for Cloudwerk

Add comprehensive queue support for Cloudflare Workers:

- **@cloudwerk/queue**: New package with `defineQueue()` API for creating queue consumers, supporting single message processing, batch processing, error handling, and optional Zod schema validation
- **@cloudwerk/core**: Queue scanner for `app/queues/` directory discovery, queue compiler for manifest generation, and typed queue producer proxy (`queues.email.send()`) in bindings
- **@cloudwerk/cli**: Queue type generation for `.cloudwerk/types/queues.d.ts` and wrangler.toml queue configuration generation
- **@cloudwerk/vite-plugin**: Queue scanning integration and consumer registration in server entry

Also includes dead letter queue (DLQ) support with utilities for handling failed messages.
