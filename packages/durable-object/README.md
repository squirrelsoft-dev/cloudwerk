# @cloudwerk/durable-object

Convention-based Durable Objects for Cloudwerk applications with native RPC, SQLite/KV storage, WebSockets, and alarms.

## Installation

```bash
pnpm add @cloudwerk/durable-object
```

## Quick Start

### 1. Define a Durable Object

```typescript
// app/objects/counter.ts
import { defineDurableObject } from '@cloudwerk/durable-object'

interface CounterState {
  count: number
}

export default defineDurableObject<CounterState>({
  init: async (ctx) => ({ count: 0 }),

  methods: {
    async increment(ctx, amount: number = 1) {
      ctx.setState({ count: ctx.state.count + amount })
      await ctx.storage.put('state', ctx.state)
      return ctx.state.count
    },

    async getCount(ctx) {
      return ctx.state.count
    },
  },
})
```

### 2. Use the Durable Object

```typescript
import { durableObjects } from '@cloudwerk/core/bindings'

const counter = durableObjects.counter.get('user-123')
const count = await counter.increment(5)
```

## Features

### Native RPC Methods

Methods are exposed as native Cloudflare RPC - no HTTP serialization needed.

```typescript
const counter = durableObjects.counter.get('my-counter')
await counter.increment(5)    // Direct RPC call
await counter.reset()
```

### Storage Options

#### Key-Value Storage

```typescript
await ctx.storage.put('key', value)
const value = await ctx.storage.get('key')
await ctx.storage.delete('key')
```

#### SQLite Storage

```typescript
ctx.sql.exec('CREATE TABLE IF NOT EXISTS messages (...)')
ctx.sql.prepare('SELECT * FROM messages WHERE user_id = ?').bind(userId).all()
```

### WebSocket Support

```typescript
export default defineDurableObject({
  async fetch(request, ctx) {
    const pair = new WebSocketPair()
    ctx.acceptWebSocket(pair[1], ['room-123'])
    return new Response(null, { status: 101, webSocket: pair[0] })
  },

  async webSocketMessage(ws, message, ctx) {
    for (const client of ctx.getWebSockets('room-123')) {
      client.send(message)
    }
  },
})
```

### Alarms

```typescript
export default defineDurableObject({
  async init(ctx) {
    await ctx.setAlarm(Date.now() + 60_000)
    return { count: 0 }
  },

  async alarm(ctx) {
    await processScheduledWork(ctx)
    await ctx.setAlarm(Date.now() + 60_000)
  },
})
```

### Transactions

```typescript
await ctx.storage.transaction(async () => {
  const from = await ctx.storage.get('account:from')
  const to = await ctx.storage.get('account:to')
  // Atomic updates
  await ctx.storage.put({ 'account:from': from, 'account:to': to })
})
```

## Documentation

For complete documentation, visit the [Cloudwerk Durable Objects Guide](https://cloudwerk.dev/guides/durable-objects/).

## License

MIT
