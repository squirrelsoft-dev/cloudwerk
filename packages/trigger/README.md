# @cloudwerk/trigger

Event-driven triggers for Cloudwerk applications with support for scheduled, queue, R2, webhook, email, D1, and tail events.

## Installation

```bash
pnpm add @cloudwerk/trigger
```

## Quick Start

```typescript
// app/triggers/daily-cleanup.ts
import { defineTrigger } from '@cloudwerk/trigger'

export default defineTrigger({
  source: {
    type: 'scheduled',
    cron: '0 0 * * *', // Daily at midnight
  },
  async handle(event, ctx) {
    await ctx.env.DB.exec('DELETE FROM sessions WHERE expires_at < datetime("now")')
  },
})
```

## Trigger Types

### Scheduled (Cron)

```typescript
defineTrigger({
  source: { type: 'scheduled', cron: '0 9 * * 1-5', timezone: 'America/New_York' },
  handle: async (event, ctx) => { /* ... */ },
})
```

### Webhook

```typescript
import { stripeVerifier } from '@cloudwerk/trigger/verifiers'

defineTrigger({
  source: {
    type: 'webhook',
    path: '/webhooks/stripe',
    verifier: stripeVerifier({ secret: process.env.STRIPE_WEBHOOK_SECRET }),
  },
  handle: async (event, ctx) => { /* ... */ },
})
```

### Queue

```typescript
defineTrigger({
  source: { type: 'queue', name: 'notifications', batchSize: 25 },
  handle: async (event, ctx) => { /* ... */ },
})
```

### R2 (Object Storage)

```typescript
defineTrigger({
  source: { type: 'r2', bucket: 'uploads', events: ['object:create'], prefix: 'images/' },
  handle: async (event, ctx) => { /* ... */ },
})
```

### Email

```typescript
defineTrigger({
  source: { type: 'email', domain: 'support.myapp.com' },
  handle: async (event, ctx) => { /* ... */ },
})
```

### D1 (Database Changes)

```typescript
defineTrigger({
  source: { type: 'd1', database: 'DB', tables: ['users'], operations: ['INSERT', 'UPDATE'] },
  handle: async (event, ctx) => { /* ... */ },
})
```

### Tail (Log Consumption)

```typescript
defineTrigger({
  source: { type: 'tail', workers: ['api-worker'], filters: [{ field: 'outcome', value: 'exception' }] },
  handle: async (event, ctx) => { /* ... */ },
})
```

## Built-in Webhook Verifiers

```typescript
import {
  stripeVerifier,
  githubVerifier,
  slackVerifier,
  shopifyVerifier,
  linearVerifier,
  customHmacVerifier,
} from '@cloudwerk/trigger/verifiers'
```

## Documentation

For complete documentation, visit the [Cloudwerk Triggers Guide](https://cloudwerk.dev/guides/triggers/).

## License

MIT
