---
"@cloudwerk/service": minor
"@cloudwerk/core": minor
"@cloudwerk/cli": minor
"@cloudwerk/vite-plugin": minor
---

feat(service): implement convention-based service extraction

Introduces the `@cloudwerk/service` package and related infrastructure for defining services that can run locally or be extracted as separate Cloudflare Workers.

### New Package: @cloudwerk/service

- `defineService()` API for creating service definitions with methods, lifecycle hooks, and extraction configuration
- `HooksManager` for handling `onInit`, `onBefore`, `onAfter`, and `onError` lifecycle hooks
- Type-safe service definitions with full TypeScript support

### Core Package Updates

- Service scanner (`scanServices`, `scanServicesSync`) for discovering `app/services/*/service.ts` files
- Service compiler (`buildServiceManifest`, `compileService`) for generating service manifests
- `services` proxy in `@cloudwerk/core/bindings` for transparent local/extracted mode switching
- Helper functions: `getService`, `hasService`, `getServiceNames`, `registerLocalService`

### CLI Package Updates

- New `cloudwerk services` command group:
  - `cloudwerk services list` - List all discovered services
  - `cloudwerk services info <name>` - Show service details
  - `cloudwerk services extract <name>` - Extract to separate Worker
  - `cloudwerk services inline <name>` - Convert back to local mode
  - `cloudwerk services deploy <name>` - Deploy extracted service
  - `cloudwerk services status` - Show all services status
- Service type generator for `.cloudwerk/types/services.d.ts`
- Service worker generator for WorkerEntrypoint wrappers
- Service wrangler.toml generator for service bindings
- Service SDK generator for external consumption

### Vite Plugin Updates

- Service scanning integration for hot module reloading
- File watching for `app/services/*/service.ts` changes
- Service manifest generation and server entry updates
- Local service registration in generated server entry

### How It Works

1. Define a service in `app/services/email/service.ts`:
```typescript
import { defineService } from '@cloudwerk/service'

export default defineService({
  methods: {
    async send({ to, subject, body }) {
      // Send email
      return { success: true }
    }
  }
})
```

2. Call it from route handlers:
```typescript
import { services } from '@cloudwerk/core/bindings'

export async function POST() {
  const result = await services.email.send({
    to: 'user@example.com',
    subject: 'Hello',
    body: 'Welcome!'
  })
  return json(result)
}
```

3. Extract to a separate Worker when needed:
```bash
cloudwerk services extract email
cloudwerk services deploy email
```

The same API works in both local and extracted modes - Cloudflare's native RPC handles the communication automatically via service bindings.
