# Cloudwerk Dev Server - Full Requirements

> **Status:** Approved for v1 implementation
> **Related Issue:** [RFC #3](https://github.com/squirrelsoft-dev/cloudwerk/issues/3)

## Overview

The Cloudwerk dev server provides a fast, local development experience with hot module replacement (HMR). It supports two modes: a fast Node-based mode for rapid iteration, and an accurate workerd-based mode for production parity testing.

---

## Goals

1. **Fast feedback loop** - Changes reflect in browser in <100ms
2. **HMR for client and server** - No full page reloads when possible
3. **Local Cloudflare bindings** - D1, KV, R2, Queues work locally
4. **Production parity when needed** - Option to run actual workerd runtime
5. **Zero config to start** - `cloudwerk dev` just works

---

## Commands

```bash
# Start dev server (fast mode, default)
cloudwerk dev

# Start dev server (accurate mode, uses workerd)
cloudwerk dev --accurate

# Start dev server on specific port
cloudwerk dev --port 4000

# Start with specific config
cloudwerk dev --config ./cloudwerk.config.ts
```

---

## Dev Server Modes

### Fast Mode (Default)

Runs in Node.js with mocked Cloudflare bindings. Optimized for speed.

**Characteristics:**
- True HMR for server-side code
- Vite handles client-side HMR
- Cloudflare bindings mocked with local equivalents
- Sub-100ms feedback loop
- May have subtle behavioral differences from production

**Binding Mocks:**

| Cloudflare Service | Local Mock |
|--------------------|------------|
| D1 | better-sqlite3 |
| KV | In-memory Map (persisted to `.cloudwerk/kv`) |
| R2 | Local filesystem (`.cloudwerk/r2`) |
| Queues | Synchronous execution (immediate) |
| Durable Objects | In-memory (single instance) |
| Environment Variables | Loaded from `.dev.vars` or `.env` |

### Accurate Mode

Runs in workerd (actual Workers runtime). Optimized for production parity.

**Characteristics:**
- Uses `@cloudflare/vite-plugin` or Miniflare under the hood
- Actual V8 isolate behavior
- Real binding semantics
- Slower restarts (no true HMR, fast rebuild + restart)
- Use when debugging edge cases or before deploy

---

## Architecture

### Fast Mode Architecture

```
+-------------------------------------------------------------+
|                     Dev Server (Node.js)                     |
|                                                              |
|  +---------------------+    +-----------------------------+  |
|  |    Vite Dev Server  |    |      Hono App (Node)        |  |
|  |                     |    |                             |  |
|  |  - Client HMR       |    |  - Routes loaded via        |  |
|  |  - Asset bundling   |    |    dynamic import()         |  |
|  |  - CSS processing   |    |  - HMR via module           |  |
|  |                     |    |    invalidation             |  |
|  +---------------------+    +-----------------------------+  |
|             |                          |                     |
|             +----------+---------------+                     |
|                        |                                     |
|                        v                                     |
|  +-------------------------------------------------------------+
|  |                   Binding Mocks                          |  |
|  |  +-----+  +----+  +----+  +-------+  +---------------+   |  |
|  |  | D1  |  | KV |  | R2 |  |Queues |  |Durable Objects|   |  |
|  |  +-----+  +----+  +----+  +-------+  +---------------+   |  |
|  +-------------------------------------------------------------+
+-------------------------------------------------------------+
                           |
                           v
                    +-------------+
                    |   Browser   |
                    +-------------+
```

### Accurate Mode Architecture

```
+-------------------------------------------------------------+
|                     Dev Server                               |
|                                                              |
|  +---------------------+    +-----------------------------+  |
|  |    Vite Dev Server  |    |     workerd (Miniflare)     |  |
|  |                     |    |                             |  |
|  |  - Client HMR       |    |  - Actual Workers runtime   |  |
|  |  - Asset bundling   |    |  - Real isolate behavior    |  |
|  |                     |    |  - Local bindings via       |  |
|  |                     |    |    Miniflare                |  |
|  +---------------------+    +-----------------------------+  |
+-------------------------------------------------------------+
```

---

## HMR Strategy

### Client-Side HMR

Handled by Vite. Standard React/Preact HMR:

- Component changes hot reload
- CSS changes inject without reload
- State preserved when possible

### Server-Side HMR (Fast Mode Only)

When a server file changes:

1. **File watcher** detects change
2. **Vite** invalidates the module in its module graph
3. **Next request** triggers fresh `import()` of the route
4. **Response** reflects new code

```typescript
// Simplified dev server hot reload
app.all('*', async (c) => {
  // Dynamic import - Vite handles invalidation
  const routes = await import('./app/routes/index.ts?t=' + Date.now())
  return routes.handler(c)
})
```

For accurate mode, file changes trigger:
1. Fast rebuild (esbuild)
2. workerd restart
3. Browser refetch

---

## File Watching

### Watched Paths

```
app/
  routes/         # Route changes -> HMR
  jobs/           # Job changes -> HMR
  middleware.ts   # Middleware changes -> HMR
db/
  schema.ts       # Schema changes -> warning, suggest migration
cloudwerk.config.ts # Config changes -> full restart
.dev.vars           # Env changes -> full restart
```

### Watch Behavior

| File Type | Fast Mode | Accurate Mode |
|-----------|-----------|---------------|
| Route files | HMR | Rebuild + restart |
| Layout files | HMR | Rebuild + restart |
| Middleware | HMR | Rebuild + restart |
| Config | Full restart | Full restart |
| Client components | Vite HMR | Vite HMR |
| CSS | Vite HMR (inject) | Vite HMR (inject) |
| Static assets | Vite HMR | Vite HMR |
| DB schema | Warning | Warning |

---

## Local Bindings

### D1 (Database)

**Implementation:** better-sqlite3

```typescript
// Mock implementation
import Database from 'better-sqlite3'

const db = new Database('.cloudwerk/d1/main.sqlite')

export const createD1Mock = (name: string) => ({
  prepare: (sql: string) => ({
    bind: (...args: any[]) => ({
      all: () => db.prepare(sql).all(...args),
      first: () => db.prepare(sql).get(...args),
      run: () => db.prepare(sql).run(...args),
    }),
    all: () => db.prepare(sql).all(),
    first: () => db.prepare(sql).get(),
    run: () => db.prepare(sql).run(),
  }),
  batch: async (statements: any[]) => {
    // Execute in transaction
  },
  exec: (sql: string) => db.exec(sql),
})
```

**Persistence:** `.cloudwerk/d1/{binding-name}.sqlite`

### KV (Key-Value)

**Implementation:** In-memory Map with file persistence

```typescript
export const createKVMock = (name: string) => {
  const store = new Map<string, { value: string; metadata?: any; expiration?: number }>()

  return {
    get: async (key: string, options?: any) => {
      const entry = store.get(key)
      if (!entry) return null
      if (entry.expiration && Date.now() > entry.expiration) {
        store.delete(key)
        return null
      }
      return entry.value
    },
    put: async (key: string, value: string, options?: any) => {
      store.set(key, {
        value,
        metadata: options?.metadata,
        expiration: options?.expirationTtl
          ? Date.now() + options.expirationTtl * 1000
          : undefined,
      })
    },
    delete: async (key: string) => {
      store.delete(key)
    },
    list: async (options?: any) => {
      // Return keys matching prefix
    },
  }
}
```

**Persistence:** `.cloudwerk/kv/{binding-name}.json`

### R2 (Object Storage)

**Implementation:** Local filesystem

```typescript
export const createR2Mock = (name: string) => {
  const basePath = `.cloudwerk/r2/${name}`

  return {
    get: async (key: string) => {
      const filePath = path.join(basePath, key)
      if (!fs.existsSync(filePath)) return null
      return {
        body: fs.createReadStream(filePath),
        // ... metadata
      }
    },
    put: async (key: string, value: ReadableStream | ArrayBuffer | string) => {
      const filePath = path.join(basePath, key)
      fs.mkdirSync(path.dirname(filePath), { recursive: true })
      fs.writeFileSync(filePath, value)
    },
    delete: async (key: string) => {
      const filePath = path.join(basePath, key)
      fs.unlinkSync(filePath)
    },
    list: async (options?: any) => {
      // List files in directory
    },
  }
}
```

**Persistence:** `.cloudwerk/r2/{binding-name}/`

### Queues

**Implementation:** Synchronous execution in dev (no actual queue)

```typescript
export const createQueueMock = (name: string, consumers: Map<string, Function>) => ({
  send: async (message: any) => {
    const consumer = consumers.get(name)
    if (consumer) {
      // Execute immediately in dev
      console.log(`[Queue:${name}] Processing message`)
      await consumer({
        messages: [{ id: crypto.randomUUID(), body: message, ack: () => {}, retry: () => {} }],
      })
    } else {
      console.warn(`[Queue:${name}] No consumer registered`)
    }
  },
  sendBatch: async (messages: any[]) => {
    for (const msg of messages) {
      await this.send(msg)
    }
  },
})
```

**Behavior:** Messages processed immediately, synchronously. No retry logic in dev.

### Durable Objects

**Implementation:** In-memory single instance

```typescript
const instances = new Map<string, DurableObject>()

export const createDurableObjectMock = (binding: string, className: string, DurableObjectClass: any) => ({
  get: (id: DurableObjectId) => {
    const key = `${binding}:${id.toString()}`
    if (!instances.has(key)) {
      instances.set(key, new DurableObjectClass())
    }
    const instance = instances.get(key)!

    return {
      fetch: async (request: Request) => instance.fetch(request),
    }
  },
  idFromName: (name: string) => ({ toString: () => name }),
  idFromString: (id: string) => ({ toString: () => id }),
  newUniqueId: () => ({ toString: () => crypto.randomUUID() }),
})
```

**Limitations in dev:**
- Single instance (no distributed behavior)
- In-memory only (state lost on restart)
- No hibernation API

### Environment Variables

**Sources (in order of precedence):**
1. `.dev.vars` (Cloudflare convention)
2. `.env.local`
3. `.env`
4. `cloudwerk.config.ts` env block

```bash
# .dev.vars
DATABASE_URL=local
API_SECRET=dev-secret
```

---

## Dev Server Output

### Startup

```
$ cloudwerk dev

  Cloudwerk v0.1.0

  Local:    http://localhost:3000
  Network:  http://192.168.1.100:3000
  Mode:     fast (Node.js + HMR)

  Bindings:
    D1:      main -> .cloudwerk/d1/main.sqlite
    KV:      cache -> .cloudwerk/kv/cache.json
    R2:      uploads -> .cloudwerk/r2/uploads/

  Ready in 247ms

```

### File Changes

```
[HMR] app/routes/api/users/route.ts updated (23ms)
[HMR] app/routes/dashboard/_layout.tsx updated (18ms)
```

### Errors

```
Error in app/routes/api/users/route.ts

  SyntaxError: Unexpected token '}'

    12 |   const user = await db.query(...)
    13 |   return json({ user })
  > 14 | }}
       |  ^

  Fix the error and save to reload.
```

### Warnings

```
Warning: Schema change detected in db/schema.ts
  Run `cloudwerk db migrate` to apply changes.
```

---

## Configuration

### cloudwerk.config.ts

```typescript
import { defineConfig } from '@cloudwerk/core'

export default defineConfig({
  dev: {
    // Server options
    port: 3000,
    host: 'localhost',      // or '0.0.0.0' for network access

    // Mode
    mode: 'fast',           // 'fast' | 'accurate'

    // HTTPS (optional)
    https: {
      key: './certs/key.pem',
      cert: './certs/cert.pem',
    },

    // Proxy API requests (optional)
    proxy: {
      '/external-api': {
        target: 'https://api.example.com',
        changeOrigin: true,
      },
    },

    // Open browser on start
    open: true,             // or '/dashboard' to open specific path

    // Binding persistence
    persist: true,          // persist D1/KV/R2 data between restarts
    persistPath: '.cloudwerk', // where to store local data
  },
})
```

### CLI Flags Override Config

```bash
cloudwerk dev --port 4000 --mode accurate --no-open
```

---

## Request Handling Flow

### Fast Mode

```
Browser Request
      |
      v
+------------------+
|  Vite Dev Server |
|                  |
|  Static assets?  |--Yes--> Serve from Vite
|                  |
+--------+---------+
         | No
         v
+------------------+
|  Cloudwerk       |
|  Router          |
|                  |
|  Match route     |
|  Load handler    |
|  (dynamic        |
|   import)        |
+--------+---------+
         |
         v
+------------------+
|  Inject Mocked   |
|  Bindings        |
|                  |
|  c.env = {       |
|    DB: d1Mock,   |
|    KV: kvMock,   |
|    ...           |
|  }               |
+--------+---------+
         |
         v
+------------------+
|  Run Middleware  |
|  Chain           |
+--------+---------+
         |
         v
+------------------+
|  Execute Route   |
|  Handler         |
+--------+---------+
         |
         v
    Response
```

---

## Error Overlay

When errors occur, display an error overlay in the browser with:
- Error type and message
- File path and line number
- Code snippet with highlighted error line
- "Open in editor" button

---

## Data Directory Structure

```
.cloudwerk/
  d1/
    main.sqlite           # D1 database
  kv/
    cache.json            # KV store
  r2/
    uploads/              # R2 bucket
      images/
        photo.jpg
      documents/
  cache/
    build/                # Build cache
  logs/
    dev.log               # Dev server logs
```

### Cleaning Local Data

```bash
# Clear all local data
cloudwerk dev --clean

# Clear specific binding
cloudwerk dev --clean-d1
cloudwerk dev --clean-kv
cloudwerk dev --clean-r2
```

---

## Integration with Other Commands

### Database Commands

```bash
# Dev server stays running, migrations apply to local D1
cloudwerk db migrate

# Seed local database
cloudwerk db seed
```

### Type Generation

```bash
# Regenerate route types (runs automatically on file change)
cloudwerk generate
```

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Cold start | <500ms |
| HMR (server) | <100ms |
| HMR (client) | <50ms |
| Full rebuild | <2s |
| Memory usage | <200MB idle |

---

## Dependencies

### Core

- `vite` - Build tooling and client HMR
- `hono` - Router (runs in Node for fast mode)
- `esbuild` - Fast TypeScript compilation
- `chokidar` - File watching

### Binding Mocks

- `better-sqlite3` - D1 mock
- (built-in) - KV, R2, Queue mocks

### Accurate Mode

- `miniflare` or `@cloudflare/vite-plugin` - workerd integration
- `workerd` - Actual Workers runtime

---

## Future Considerations

- **Inspector/debugger support** - Chrome DevTools integration
- **Network throttling** - Simulate slow connections
- **Request recording** - Replay requests for debugging
- **Multiple workers** - Service binding simulation
- **Edge caching simulation** - Test cache behavior locally
- **Scheduled events** - Cron trigger simulation via UI
