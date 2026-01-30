---
"@cloudwerk/durable-object": minor
"@cloudwerk/core": minor
---

feat(durable-object): implement Durable Objects support for Cloudwerk

This release adds convention-based Durable Object support, enabling type-safe, stateful edge computing with native Cloudflare RPC.

## New Package: @cloudwerk/durable-object

### Features

- **defineDurableObject()**: Factory function for creating durable object definitions
  - Type-safe state management with generics
  - Native Cloudflare RPC support via `methods` config
  - Built-in handlers for `fetch`, `alarm`, and WebSocket events
  - SQLite storage support with `sqlite: true` flag
  - Zod schema validation for state

- **Error Classes**: Comprehensive error handling
  - `DurableObjectError` base class
  - `DurableObjectConfigError`, `DurableObjectNotFoundError`
  - `DurableObjectStateError`, `DurableObjectRPCError`
  - WebSocket and alarm-specific errors

### Usage Example

```typescript
// app/objects/counter.ts
import { defineDurableObject } from '@cloudwerk/durable-object'

interface CounterState {
  value: number
}

export default defineDurableObject<CounterState>({
  sqlite: true,

  async init(ctx) {
    ctx.sql.run(`CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY)`)
    return { value: 0 }
  },

  methods: {
    async increment(amount = 1) {
      this.state.value += amount
      return this.state.value
    },

    async getValue() {
      return this.state.value
    },
  },
})
```

```typescript
// In route handlers
import { durableObjects } from '@cloudwerk/bindings'

export async function POST(request: Request, { params }: Context) {
  const id = durableObjects.Counter.idFromName(params.id)
  const counter = durableObjects.Counter.get(id)

  // Native RPC - direct method calls!
  const value = await counter.increment(5)

  return Response.json({ value })
}
```

## Core Package Updates

### Scanner (`durable-object-scanner.ts`)
- Scans `app/objects/` for durable object definitions
- Name conversion utilities: `fileNameToObjectName`, `objectNameToBindingName`, `objectNameToClassName`
- Both async and sync scanning functions

### Compiler (`durable-object-compiler.ts`)
- Compiles scanned files into `DurableObjectManifest`
- Validation for duplicate names, invalid formats
- Entry updates from loaded definitions

### Bindings (`bindings.ts`)
- `durableObjects` proxy for typed namespace access
- `getDurableObject()`, `hasDurableObject()`, `getDurableObjectNames()` helpers
- Full TypeScript support for RPC methods

## CLI Utilities (for future CLI commands)

- `durable-object-class-generator.ts`: Generates DurableObject classes from definitions
- `durable-object-wrangler.ts`: Generates wrangler.toml bindings and migrations
- `durable-object-migrations.ts`: Tracks class additions/removals/renames
- `durable-object-type-generator.ts`: Generates `.cloudwerk/types/durable-objects.d.ts`
