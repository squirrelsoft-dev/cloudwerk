# @cloudwerk/queue

Type-safe queue consumers for Cloudwerk applications with schema validation, dead letter queues, and batch processing.

## Installation

```bash
pnpm add @cloudwerk/queue
```

## Quick Start

### 1. Define a queue consumer

```typescript
// app/queues/email.ts
import { defineQueue } from '@cloudwerk/queue'

interface EmailMessage {
  to: string
  subject: string
  body: string
}

export default defineQueue<EmailMessage>({
  async process(message) {
    await sendEmail(message.body)
    message.ack()
  },
})
```

### 2. Send messages

```typescript
import { queues } from '@cloudwerk/core/bindings'

await queues.email.send({
  to: 'user@example.com',
  subject: 'Welcome!',
  body: 'Thanks for signing up.',
})
```

## Features

### Schema Validation

```typescript
import { z } from 'zod'

const EmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string(),
})

export default defineQueue<z.infer<typeof EmailSchema>>({
  schema: EmailSchema,
  async process(message) {
    // message.body is validated and typed
    message.ack()
  },
})
```

### Configuration

```typescript
export default defineQueue<OrderMessage>({
  config: {
    batchSize: 25,
    maxRetries: 5,
    retryDelay: '2m',
    deadLetterQueue: 'orders-dlq',
  },
  async process(message) { /* ... */ },
})
```

### Batch Processing

```typescript
export default defineQueue<AnalyticsEvent>({
  config: { batchSize: 100 },
  async processBatch(messages) {
    await batchInsert(messages.map(m => m.body))
    messages.forEach(m => m.ack())
  },
})
```

### Message Handling

```typescript
async process(message) {
  try {
    await processWork(message.body)
    message.ack()           // Success - remove from queue
  } catch (error) {
    if (isRetryable(error)) {
      message.retry()       // Try again
    } else {
      message.deadLetter()  // Send to DLQ
    }
  }
}
```

## Sending Messages

```typescript
import { queues } from '@cloudwerk/core/bindings'

// Single message
await queues.email.send({ to: '...', subject: '...', body: '...' })

// With delay
await queues.email.send(message, { delaySeconds: 60 })

// Batch
await queues.notifications.sendBatch([...messages])
```

## Documentation

For complete documentation, visit the [Cloudwerk Queues Guide](https://cloudwerk.dev/guides/queues/).

## License

MIT
