# @cloudwerk/vite-plugin

Vite plugin for Cloudwerk file-based routing with virtual entry generation.

## Installation

```bash
npm install @cloudwerk/vite-plugin vite
```

## Setup

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import cloudwerk from '@cloudwerk/vite-plugin'

export default defineConfig({
  plugins: [
    cloudwerk({
      // Options (all optional)
      appDir: 'app',        // Directory containing app files
      routesDir: 'routes',  // Subdirectory for routes
      renderer: 'hono-jsx', // 'hono-jsx' or 'react'
      verbose: false,       // Enable debug logging
    })
  ]
})
```

## Virtual Modules

The plugin generates virtual modules for your application:

| Module | Description |
|--------|-------------|
| `virtual:cloudwerk/server-entry` | Server entry with route registration |
| `virtual:cloudwerk/client-entry` | Client entry for hydration |
| `virtual:cloudwerk/manifest` | Compiled route manifest |

Import in your code:

```typescript
import app from 'virtual:cloudwerk/server-entry'
import manifest from 'virtual:cloudwerk/manifest'
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `appDir` | `string` | `'app'` | Directory containing route files |
| `routesDir` | `string` | `'routes'` | Subdirectory within appDir for routes |
| `config` | `object` | - | Override Cloudwerk configuration |
| `serverEntry` | `string` | - | Custom server entry file path |
| `clientEntry` | `string` | - | Custom client entry file path |
| `renderer` | `string` | `'hono-jsx'` | UI renderer (`'hono-jsx'` or `'react'`) |
| `verbose` | `boolean` | `false` | Enable verbose logging |

## Documentation

For full documentation, visit: https://github.com/squirrelsoft-dev/cloudwerk

## Part of Cloudwerk

This package is part of the [Cloudwerk](https://github.com/squirrelsoft-dev/cloudwerk) monorepo.
