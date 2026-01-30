# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Cloudwerk is a full-stack framework for Cloudflare Workers. It provides file-based routing that compiles to Hono, with integrated support for D1, KV, R2, auth, and queues.

**Status**: Pre-alpha - APIs are unstable.

## Commands

```bash
# Build all packages (must run from repo root)
pnpm build

# Run all tests
pnpm test

# Run tests for a specific package
pnpm --filter @cloudwerk/core test
pnpm --filter @cloudwerk/cli test

# Run a single test file
pnpm --filter @cloudwerk/cli vitest --run src/server/__tests__/registerRoutes.page.test.ts

# Run tests in watch mode
pnpm --filter @cloudwerk/core test:watch

# Lint
pnpm lint

# Start dev server (for testing the CLI)
pnpm dev
```

## Package Structure

This is a pnpm monorepo with linked packages.

### Core Packages

- **@cloudwerk/core** (`packages/core/`) - Route compiler, file scanner, middleware adapter, config loader, response helpers. All core types are defined here.
- **@cloudwerk/cli** (`packages/cli/`) - Dev server, route registration with Hono, module loading (pages, layouts, handlers, middleware). Depends on core and ui.
- **@cloudwerk/ui** (`packages/ui/`) - Renderer abstraction for SSR. Currently wraps Hono JSX.

### Feature Packages

- **@cloudwerk/auth** (`packages/auth/`) - Authentication and session management. OAuth providers, session adapters, rate limiting, CSRF protection.
- **@cloudwerk/queue** (`packages/queue/`) - Queue consumer and producer abstractions for Cloudflare Queues.
- **@cloudwerk/trigger** (`packages/trigger/`) - Cron triggers and scheduled task handling.
- **@cloudwerk/durable-object** (`packages/durable-object/`) - Durable Object base classes and utilities.
- **@cloudwerk/service** (`packages/service/`) - Service bindings and RPC utilities.

### Planned Packages

- **@cloudwerk/data** - D1 database integration and query builder (planned)
- **@cloudwerk/storage** - R2 object storage integration (planned)
- **@cloudwerk/realtime** - WebSocket and real-time communication (planned)

## Architecture

### Route Compilation Flow

1. **Scanner** (`core/scanner.ts`) - Scans `app/` directory for route files (`page.tsx`, `route.ts`, `layout.tsx`, `middleware.ts`)
2. **Compiler** (`core/compiler.ts`) - Converts file paths to URL patterns (e.g., `users/[id]/page.tsx` → `/users/:id`)
3. **Resolver** (`core/resolver.ts`) - Determines which layouts and middleware apply to each route
4. **Manifest** - The compiled route manifest with all routes, layouts, middleware resolved

### Route Registration (CLI)

The CLI takes the manifest and registers routes with Hono:

- `registerRoutes.ts` - Main registration logic
- `loadPage.ts` / `loadLayout.ts` - Compile and load TSX components via esbuild
- `loadHandler.ts` - Load API route handlers
- `loadMiddleware.ts` - Load middleware functions

### Handler Signatures

Two handler signatures are supported:

```typescript
// Cloudwerk-native (preferred) - detected by arity === 2
export function GET(request: Request, { params }: CloudwerkHandlerContext) {
  return json({ id: params.id })
}

// Legacy Hono-style - detected by arity === 1
export function GET(c: Context) {
  return c.json({ id: c.req.param('id') })
}
```

### Page/Layout Data Loading

Pages and layouts can export `loader()` functions for server-side data loading:

```typescript
export async function loader({ params, request, context }: LoaderArgs) {
  const user = await getUser(params.id)
  if (!user) throw new NotFoundError()
  return { user }
}

export default function UserPage({ user }: PageProps & { user: User }) {
  return <h1>{user.name}</h1>
}
```

- Loaders run before render, data passed as props
- Layout loaders execute parent → child
- `NotFoundError` returns 404, `RedirectError` redirects

## Changesets

Add a changeset for any PR that changes package behavior:

```bash
pnpm changeset
```

Select affected packages (`@cloudwerk/core`, `@cloudwerk/cli`, `@cloudwerk/ui`), bump type (patch/minor/major), and write a summary. The packages are linked and should be bumped together.

## Key Types

All types are in `packages/core/src/types.ts`:

- `CloudwerkHandler` / `CloudwerkHandlerContext` - Route handler signature
- `PageProps` / `LayoutProps` - Component props
- `LoaderArgs` / `LoaderFunction` - Data loading
- `Middleware` - Middleware signature `(request, next) => Response`
- `RouteConfig` - Per-route config (auth, rate limiting, cache)
- `RouteManifest` / `RouteEntry` - Compiled route data
