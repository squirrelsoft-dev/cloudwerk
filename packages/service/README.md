# @cloudwerk/service

Reusable services for Cloudwerk applications with local execution or extraction to separate Workers.

## Installation

```bash
pnpm add @cloudwerk/service
```

## Quick Start

### 1. Define a service

```typescript
// app/services/email/service.ts
import { defineService } from '@cloudwerk/service'

export default defineService({
  methods: {
    async send({ to, subject, body }) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to, subject, html: body }),
      })
      return response.json()
    },
  },
})
```

### 2. Use the service

```typescript
import { services } from '@cloudwerk/core/bindings'

const result = await services.email.send({
  to: 'user@example.com',
  subject: 'Hello',
  body: '<h1>Welcome!</h1>',
})
```

## Service Modes

Configure how services run in `cloudwerk.config.ts`:

### Local Mode

Services run as direct function calls in the main Worker.

```typescript
export default defineConfig({
  services: { mode: 'local' },
})
```

### Extracted Mode

Services run as separate Workers using Cloudflare service bindings.

```typescript
export default defineConfig({
  services: { mode: 'extracted' },
})
```

### Hybrid Mode

Mix local and extracted services.

```typescript
export default defineConfig({
  services: {
    mode: 'hybrid',
    email: { mode: 'extracted' },
    cache: { mode: 'local' },
  },
})
```

## Lifecycle Hooks

```typescript
export default defineService({
  methods: {
    async processPayment(orderId, amount) { /* ... */ },
  },
  hooks: {
    onInit: async () => { /* Service initialized */ },
    onBefore: async (method, args) => { /* Before each call */ },
    onAfter: async (method, result) => { /* After success */ },
    onError: async (method, error) => { /* On failure */ },
  },
})
```

## Extraction Configuration

```typescript
export default defineService({
  methods: { /* ... */ },
  config: {
    extraction: {
      workerName: 'email-service',
      bindings: ['RESEND_API_KEY', 'DB'],
    },
  },
})
```

## Documentation

For complete documentation, visit the [Cloudwerk Services Guide](https://cloudwerk.dev/guides/services/).

## License

MIT
