# Cloudwerk

The full-stack framework for Cloudflare Workers.

> ⚠️ **Status: Pre-alpha** - This project is in early development. APIs will change.

## What is Cloudwerk?

Cloudwerk is an opinionated framework for building full-stack applications on Cloudflare. It provides:

- **File-based routing** that compiles to Hono
- **Integrated data layer** with D1, KV, and R2
- **Auth & sessions** out of the box
- **Background jobs** via Queues as first-class citizens
- **Dev server with HMR** that actually works
- **Type-safe end-to-end** from database to client

## Quick Start

```bash
npx create-cloudwerk-app my-app
cd my-app
cloudwerk dev
```

## Packages

| Package | Description |
|---------|-------------|
| `@cloudwerk/cli` | Dev server, build, deploy commands |
| `@cloudwerk/core` | Routing, middleware, config |
| `@cloudwerk/data` | D1 integration, typed queries, migrations |
| `@cloudwerk/auth` | Sessions, auth middleware, OAuth |
| `@cloudwerk/queue` | Queue producers and consumers |
| `@cloudwerk/storage` | Unified KV + R2 abstraction |
| `@cloudwerk/realtime` | Durable Objects, WebSocket helpers |
| `@cloudwerk/ui` | SSR with Preact/React |

## Project Structure

```
my-app/
├── cloudwerk.config.ts
├── app/
│   ├── routes/
│   │   ├── index.tsx          # GET /
│   │   └── api/
│   │       └── users/
│   │           └── route.ts   # /api/users
│   ├── jobs/
│   │   └── process-order.ts   # Queue consumer
│   └── middleware.ts
├── db/
│   └── schema.ts
└── public/
```

## Example

```typescript
// app/routes/api/orders/route.ts
import { json } from '@cloudwerk/core'
import { db } from '@cloudwerk/data'
import { queue } from '@cloudwerk/queue'
import { requireAuth } from '@cloudwerk/auth'

export const middleware = [requireAuth()]

export const POST = async (c) => {
  const user = c.get('user')
  const body = await c.req.json()

  const order = await db.insert('orders', {
    userId: user.id,
    items: body.items,
  })

  await queue('process-orders').send({ orderId: order.id })

  return json({ order })
}
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

This project uses GitHub Issues for tracking work. Look for issues labeled `good first issue` or `rfc` to get started.

## License

MIT
