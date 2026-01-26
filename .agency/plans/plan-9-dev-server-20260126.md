# Implementation Plan: Issue #9 - Dev Server Command

> **Date**: 2026-01-26
> **Issue**: [#9 feat(cli): implement dev server command](https://github.com/squirrelsoft-dev/cloudwerk/issues/9)
> **Reviewer**: Backend Architect Agent
> **Status**: Ready for Approval

---

## Summary

Implement the `cloudwerk dev` CLI command that starts a local development server. The server uses Hono running in Node.js with routes dynamically compiled from `app/routes/` using `@cloudwerk/core`. This is the MVP dev server - focused on API routes (`route.ts`) with future iterations adding page rendering, HMR, and binding mocks.

---

## Scope

### In Scope

- CLI entry point with argument parsing (`--port`, `--config`, `--host`, `--verbose`)
- Config loading via `loadConfig()` from @cloudwerk/core
- Route scanning via `scanRoutes()` and `buildRouteManifest()`
- **API routes only** (`route.ts` files) - not `page.tsx` files
- Hono app creation with dynamic route registration
- TypeScript compilation on-the-fly using `esbuild`
- HTTP server startup on configurable port (default 3000)
- Clean console output showing server URL and routes
- Graceful shutdown on Ctrl+C (SIGINT/SIGTERM)
- Error handling with helpful messages

### Out of Scope

- **Page rendering** (`page.tsx`) - requires SSR/Vite integration (future issue)
- HMR / file watching (future enhancement)
- Binding mocks (D1, KV, R2) - future enhancement
- Accurate mode (workerd) - future enhancement
- Vite integration for client HMR - future enhancement
- Error overlay - future enhancement
- Auto-open browser - future enhancement

---

## Technical Approach

### Architecture

```
packages/cli/
  src/
    index.ts                  # CLI entry point (bin)
    commands/
      dev.ts                  # Dev command implementation
    server/
      createApp.ts            # Hono app factory
      registerRoutes.ts       # Route registration logic
      loadHandler.ts          # Dynamic import with TS compilation
    utils/
      logger.ts               # Console output utilities
    types.ts                  # CLI-specific types
```

### Route Handler Contract

Route files (`route.ts`) must export named HTTP method handlers:

```typescript
// app/users/route.ts
import type { RouteHandler } from '@cloudwerk/core'
import { json, created } from '@cloudwerk/core'

export const GET: RouteHandler = (c) => {
  return json({ users: [] })
}

export const POST: RouteHandler = async (c) => {
  const body = await c.req.json()
  return created({ id: 1, ...body })
}
```

Supported exports: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`, `HEAD`

### Dev Server Flow

```
1. Parse CLI args (--port, --config, --host, --verbose)
2. Determine working directory (from path argument or cwd)
3. Load config via loadConfig(cwd)
4. Resolve routes directory from config (default: "app")
5. Scan routes via scanRoutes(routesDir, { extensions: config.extensions })
6. Build manifest via buildRouteManifest(scanResult, rootDir, resolveLayouts, resolveMiddleware)
7. Validate manifest - report errors/warnings
8. Create Hono app instance
9. For each route.ts in manifest:
   a. Compile TypeScript via esbuild
   b. Dynamic import the compiled module
   c. Register each exported HTTP method with Hono
10. Start Node.js HTTP server via @hono/node-server
11. Print startup banner (URL, routes)
12. Handle graceful shutdown (SIGINT/SIGTERM)
```

### TypeScript Compilation Strategy

Use `esbuild` for on-the-fly TypeScript compilation:

```typescript
// loadHandler.ts
import { build } from 'esbuild'

export async function loadRouteHandler(absolutePath: string) {
  const result = await build({
    entryPoints: [absolutePath],
    bundle: true,           // Bundle imports
    write: false,           // Return in-memory
    format: 'esm',
    platform: 'node',
    external: ['@cloudwerk/core', 'hono'],  // Don't bundle these
  })

  const code = result.outputFiles[0].text
  const dataUrl = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`

  return import(dataUrl)
}
```

### Tech Stack

| Dependency | Purpose |
|------------|---------|
| `commander` | CLI argument parsing (simpler than yargs, used by Vite) |
| `@hono/node-server` | Node.js HTTP adapter for Hono |
| `@cloudwerk/core` | Route scanning, manifest building, config loading |
| `esbuild` | Fast TypeScript compilation |
| `picocolors` | Terminal colors |

---

## File Changes

### New Files

| File | Description | Est. LOC |
|------|-------------|----------|
| `packages/cli/src/index.ts` | CLI entry point, command registration | 50 |
| `packages/cli/src/commands/dev.ts` | Dev command implementation | 100 |
| `packages/cli/src/server/createApp.ts` | Hono app factory | 80 |
| `packages/cli/src/server/registerRoutes.ts` | Route registration logic | 60 |
| `packages/cli/src/server/loadHandler.ts` | TypeScript compilation + dynamic import | 50 |
| `packages/cli/src/utils/logger.ts` | Console output utilities | 40 |
| `packages/cli/src/types.ts` | CLI-specific types | 30 |
| `packages/cli/vitest.config.ts` | Test configuration | 20 |
| `packages/cli/tsconfig.json` | TypeScript configuration | 25 |

**Total New**: ~455 LOC

### Modified Files

| File | Changes |
|------|---------|
| `packages/cli/package.json` | Add dependencies, bin, scripts, exports |

### Test Files

| File | Description | Est. LOC |
|------|-------------|----------|
| `packages/cli/src/__tests__/dev.test.ts` | Dev command tests | 100 |
| `packages/cli/src/__tests__/createApp.test.ts` | App factory tests | 80 |
| `packages/cli/src/__tests__/loadHandler.test.ts` | Handler loading tests | 60 |
| `packages/cli/src/__tests__/__fixtures__/basic-app/` | Test fixture: basic routes | - |
| `packages/cli/src/__tests__/__fixtures__/with-middleware/` | Test fixture: middleware | - |

**Total Tests**: ~240 LOC + fixtures

---

## Implementation Phases

### Phase 1: CLI Scaffolding

**Objective**: Set up CLI package structure and entry point

**Tasks**:
1. Update `packages/cli/package.json`:
   - Add dependencies: `commander`, `@hono/node-server`, `esbuild`, `picocolors`
   - Add devDependencies: `typescript`, `vitest`, `tsup`, `@vitest/coverage-v8`
   - Add `bin` configuration: `"cloudwerk": "./dist/index.js"`
   - Add scripts: `build`, `dev`, `test`
   - Add `type: "module"` and exports

2. Create `packages/cli/tsconfig.json`

3. Create `packages/cli/src/index.ts`:
   ```typescript
   #!/usr/bin/env node
   import { program } from 'commander'
   import { dev } from './commands/dev.js'

   program
     .name('cloudwerk')
     .description('Cloudwerk CLI')
     .version('0.0.1')

   program
     .command('dev [path]')
     .description('Start development server')
     .option('-p, --port <number>', 'Port to listen on', '3000')
     .option('-H, --host <host>', 'Host to bind', 'localhost')
     .option('-c, --config <path>', 'Path to config file')
     .option('--verbose', 'Enable verbose logging')
     .action(dev)

   program.parse()
   ```

4. Create `packages/cli/src/types.ts` with CLI types

5. Create `packages/cli/src/utils/logger.ts` with logging utilities

**Deliverables**: Working CLI that shows help, version

### Phase 2: Dev Command Core

**Objective**: Implement the dev server functionality

**Tasks**:
1. Create `packages/cli/src/server/loadHandler.ts`:
   - Implement `loadRouteHandler(absolutePath)` using esbuild
   - Handle compilation errors gracefully
   - Return module exports

2. Create `packages/cli/src/server/registerRoutes.ts`:
   - Implement `registerRoutes(app, manifest, logger)`
   - For each route entry where `fileType === 'route'`:
     - Load handler via `loadRouteHandler()`
     - Extract exported HTTP methods (GET, POST, etc.)
     - Register with Hono: `app.get(pattern, handler)`
   - Handle and log errors per route

3. Create `packages/cli/src/server/createApp.ts`:
   - Implement `createApp(manifest, config, logger)`
   - Create Hono instance
   - Apply global middleware if configured
   - Call `registerRoutes()`
   - Add error handling middleware

4. Create `packages/cli/src/commands/dev.ts`:
   - Parse options and resolve working directory
   - Load config via `loadConfig()`
   - Scan routes and build manifest
   - Report validation errors/warnings
   - Create app via `createApp()`
   - Start server via `serve()` from `@hono/node-server`
   - Print startup banner

**Deliverables**: Working dev server that serves API routes

### Phase 3: Polish & Error Handling

**Objective**: Production-quality error handling and UX

**Tasks**:
1. Add graceful shutdown:
   ```typescript
   process.on('SIGINT', () => {
     logger.info('\nShutting down...')
     server.close()
     process.exit(0)
   })
   ```

2. Handle error scenarios:
   - Config file not found: Use defaults, log info
   - Routes directory not found: Create or error with helpful message
   - No routes found: Warning, not error
   - Port in use: Error with suggestion `--port <alt>`
   - Route compilation error: Log error, skip route, continue
   - @cloudwerk/core not built: Check dist/, suggest `pnpm build`

3. Improve console output:
   - Startup banner with Cloudwerk branding
   - List discovered routes (truncated if >10)
   - Show bound address and network URL
   - Color-coded logs (info, warn, error)

4. Add request logging in verbose mode:
   ```
   [GET] /api/users 200 23ms
   [POST] /api/users 201 45ms
   ```

**Deliverables**: Polished dev server with great DX

### Phase 4: Testing

**Objective**: Comprehensive test coverage

**Tasks**:
1. Create test fixtures:
   - `__fixtures__/basic-app/` - Simple routes
   - `__fixtures__/with-middleware/` - Middleware chain
   - `__fixtures__/with-dynamic-routes/` - `[id]` params

2. Write unit tests:
   - `loadHandler.test.ts` - TypeScript compilation
   - `dev.test.ts` - CLI argument parsing

3. Write integration tests:
   - `createApp.test.ts` - App factory with fixtures
   - Server startup and HTTP requests via `supertest`

4. Achieve 80%+ code coverage

**Deliverables**: Test suite with fixtures

---

## Testing Strategy

### Test Pyramid

| Type | Coverage Target | Tools |
|------|-----------------|-------|
| Unit | 40% | Vitest |
| Integration | 40% | Vitest + supertest |
| E2E | 20% | Vitest + actual HTTP |

### Test Scenarios

1. **CLI Parsing**:
   - Default values (port 3000, host localhost)
   - Custom port, host, config
   - Path argument vs `--config` flag
   - Help and version output

2. **Config Loading**:
   - With `cloudwerk.config.ts`
   - Without config (defaults)
   - Invalid config

3. **Route Loading**:
   - Basic GET handler
   - Multiple methods (GET, POST)
   - Dynamic routes `[id]`
   - Nested routes

4. **Server Lifecycle**:
   - Starts successfully
   - Handles requests
   - Graceful shutdown

5. **Error Handling**:
   - Port in use
   - Invalid route file
   - Missing export

---

## Risks & Mitigation

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| TypeScript compilation performance | Medium | Medium | Cache compiled modules in Map; esbuild is fast (~10ms per file) |
| Dynamic import cache issues | Medium | Low | Use timestamp query string for cache busting during dev |
| Windows path handling | Low | Medium | Use `path.posix` for URL patterns; test in CI |
| ESM/CJS compatibility | Medium | Low | Use ESM throughout (`"type": "module"`); test both |
| Circular dependencies in routes | Low | Low | Test with complex fixtures; esbuild handles this |
| Port conflicts | Low | High | Detect `EADDRINUSE`, suggest alternative port |

---

## Success Criteria

### Acceptance Criteria (from Issue)

- [x] `cloudwerk dev` starts server
- [x] Loads config from `cloudwerk.config.ts`
- [x] Routes are compiled from `app/routes/`
- [x] Server responds on localhost:3000
- [x] Clean console output showing server URL
- [x] Graceful shutdown on Ctrl+C

### Additional Criteria

- [ ] TypeScript routes compile and execute correctly
- [ ] Dynamic route parameters work (`/users/:id`)
- [ ] Validation errors are reported clearly
- [ ] Port conflict error is helpful
- [ ] 80%+ test coverage
- [ ] Works on macOS, Linux (Windows nice-to-have)

---

## Dependencies

### Blocked By

- **Issue #8**: `@cloudwerk/core` route compiler
  - Status: Code complete (181 tests, 81.77% coverage)
  - Issue marked OPEN but implementation exists
  - Can proceed - core package is functional

### Blocks

- None directly, but enables future issues:
  - HMR / file watching
  - Binding mocks
  - Page rendering with Vite
  - Accurate mode (workerd)

---

## CLI Interface

```
cloudwerk dev [path]

Start development server

Arguments:
  path                    Working directory (default: current directory)

Options:
  -p, --port <number>     Port to listen on (default: 3000)
  -H, --host <host>       Host to bind (default: localhost)
  -c, --config <path>     Path to config file
  --verbose               Enable verbose logging
  -h, --help              Show help

Examples:
  cloudwerk dev                    # Start in current directory
  cloudwerk dev ./my-app           # Start in ./my-app
  cloudwerk dev --port 4000        # Use port 4000
  cloudwerk dev --host 0.0.0.0     # Expose to network
```

---

## Console Output

### Startup

```
  Cloudwerk v0.1.0

  > Local:    http://localhost:3000/
  > Network:  http://192.168.1.100:3000/

  Routes:
    GET  /api/health
    GET  /api/users
    POST /api/users
    GET  /api/users/:id
    PUT  /api/users/:id

  Ready in 247ms
```

### Errors

```
Error: Port 3000 is already in use

  Try using a different port:
    cloudwerk dev --port 4000
```

```
Error in app/routes/users/route.ts

  SyntaxError: Unexpected token '}'

    12 |   const user = await db.query(...)
    13 |   return json({ user })
  > 14 | }}
       |  ^

  Fix the error and save to restart.
```

---

## Next Steps

To approve this plan and begin implementation:

```bash
/agency:implement .agency/plans/plan-9-dev-server-20260126.md
```

To modify requirements or approach, please provide feedback.

---

## Alternative Approaches Considered

### A: Use tsx/ts-node instead of esbuild

**Pros**: Simpler setup, handles all TS features
**Cons**: Slower, heavier dependency
**Decision**: Use esbuild for speed (10ms vs 100ms compilation)

### B: Skip TypeScript compilation, require pre-built routes

**Pros**: Simpler implementation
**Cons**: Bad DX, requires separate build step
**Decision**: Compile on-the-fly for instant feedback

### C: Use Vite dev server from the start

**Pros**: HMR, client bundling, mature
**Cons**: Complex setup, scope creep
**Decision**: Start simple with Node.js + esbuild, add Vite later for page rendering

---

## References

- [RFC 003: Dev Server](../docs/rfcs/003-dev-server.md)
- [RFC 002: Routing System](../docs/rfcs/002-routing-system.md)
- [@cloudwerk/core API](../packages/core/src/index.ts)
- [Hono Node.js Adapter](https://hono.dev/getting-started/nodejs)
- [esbuild Build API](https://esbuild.github.io/api/#build)
