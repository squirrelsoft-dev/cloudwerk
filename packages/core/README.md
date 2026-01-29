# @cloudwerk/core

Core routing, middleware, and configuration for Cloudwerk - a full-stack framework for Cloudflare Workers.

## Installation

```bash
npm install @cloudwerk/core
```

## Entry Points

This package provides two entry points optimized for different use cases:

### `@cloudwerk/core/runtime`

Runtime-only exports for Cloudflare Workers. Excludes build-time dependencies to minimize bundle size.

```typescript
import {
  // Response helpers
  json, created, noContent, redirect, html, text,
  notFoundResponse, badRequest, unauthorized, forbidden,

  // Context and middleware
  getContext, createMiddlewareAdapter,

  // Errors
  NotFoundError, RedirectError, notFound,

  // Types
  type CloudwerkHandler, type CloudwerkHandlerContext,
  type PageProps, type LayoutProps, type LoaderArgs
} from '@cloudwerk/core/runtime'
```

### `@cloudwerk/core/build`

Build-time exports for CLI and tooling. Includes filesystem dependencies (fast-glob, esbuild).

```typescript
import {
  // Route compilation
  buildRouteManifest, scanRoutes, compileRoute,

  // Configuration
  loadConfig, defineConfig, DEFAULT_CONFIG,

  // Validation
  validateManifest, validateRoute,

  // Types
  type RouteManifest, type CloudwerkConfig
} from '@cloudwerk/core/build'
```

## Basic Usage

```typescript
// app/routes/users/[id]/route.ts
import { json, notFoundResponse } from '@cloudwerk/core/runtime'
import type { CloudwerkHandler } from '@cloudwerk/core/runtime'

export const GET: CloudwerkHandler = async (request, { params }) => {
  const user = await getUser(params.id)
  if (!user) return notFoundResponse()
  return json(user)
}
```

## Documentation

For full documentation, visit: https://github.com/squirrelsoft-dev/cloudwerk

## Part of Cloudwerk

This package is part of the [Cloudwerk](https://github.com/squirrelsoft-dev/cloudwerk) monorepo.
