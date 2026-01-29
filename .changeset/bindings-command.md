---
"@cloudwerk/cli": minor
"@cloudwerk/core": minor
"@cloudwerk/ui": minor
---

Add `cloudwerk bindings` command for managing Cloudflare bindings

- `cloudwerk bindings` - View all configured bindings (production or specific environment)
- `cloudwerk bindings add [type]` - Add a new binding (d1, kv, r2, queue, do, secret)
- `cloudwerk bindings remove [name]` - Remove a binding
- `cloudwerk bindings update [name]` - Update an existing binding
- `cloudwerk bindings generate-types` - Regenerate TypeScript env.d.ts

Supports environment-specific bindings with `--env` flag. Automatically generates TypeScript type definitions in env.d.ts after modifications.
