# Plan: Integration Tests for Routing

## Overview

While unit tests cover individual components (scanner, compiler, resolver, server-entry generation), we lack integration tests that verify the complete request/response cycle. These tests would start an actual dev server and make HTTP requests to verify routes work end-to-end.

## Current State

### What's Covered by Unit Tests
- `core/compiler.test.ts` - Segment parsing, URL pattern generation, route sorting
- `core/scanner.test.ts` - File detection, route groups, file type categorization
- `core/resolver.test.ts` - Layout and middleware resolution for routes
- `core/resolver.errorBoundary.test.ts` - Error boundary resolution
- `vite-plugin/server-entry.test.ts` - Server entry code generation

### What's Missing
1. **HTTP Request/Response Tests** - No tests that actually make requests and verify responses
2. **Dev Server Tests** - No tests that start the Vite dev server with the plugin
3. **Full Route Registration Tests** - No tests that verify Hono receives and handles routes correctly
4. **Hydration Script Injection Tests** - No tests that verify the client-entry script is injected

## Implementation Plan

### Step 1: Create Test Infrastructure

**File:** `packages/vite-plugin/src/__tests__/integration/test-utils.ts`

Create utilities for integration testing:

```typescript
import { createServer, ViteDevServer } from 'vite'
import { cloudwerkPlugin } from '../../index.js'

interface TestServer {
  server: ViteDevServer
  fetch: (path: string, init?: RequestInit) => Promise<Response>
  close: () => Promise<void>
}

export async function createTestServer(fixtureDir: string): Promise<TestServer> {
  const server = await createServer({
    root: fixtureDir,
    plugins: [cloudwerkPlugin()],
    server: { port: 0 }, // Random available port
  })

  await server.listen()
  const port = server.config.server.port

  return {
    server,
    fetch: (path, init) => fetch(`http://localhost:${port}${path}`, init),
    close: () => server.close(),
  }
}
```

### Step 2: Create Test Fixtures

**Directory:** `packages/vite-plugin/src/__tests__/integration/fixtures/`

Create minimal test projects:

```
fixtures/
├── basic-app/
│   ├── app/
│   │   ├── page.tsx           # Home page
│   │   ├── layout.tsx         # Root layout
│   │   ├── about/
│   │   │   └── page.tsx       # Static route
│   │   └── api/
│   │       └── health/
│   │           └── route.ts   # API route
│   ├── cloudwerk.config.ts
│   └── package.json
│
├── dynamic-routes/
│   ├── app/
│   │   ├── users/
│   │   │   └── [id]/
│   │   │       └── page.tsx   # Dynamic route
│   │   ├── docs/
│   │   │   └── [...slug]/
│   │   │       └── page.tsx   # Catch-all route
│   │   └── shop/
│   │       └── [[...cat]]/
│   │           └── page.tsx   # Optional catch-all
│   ├── cloudwerk.config.ts
│   └── package.json
│
├── middleware-app/
│   ├── app/
│   │   ├── middleware.ts      # Root middleware
│   │   ├── page.tsx
│   │   └── admin/
│   │       ├── middleware.ts  # Nested middleware
│   │       └── page.tsx
│   ├── cloudwerk.config.ts
│   └── package.json
│
├── layouts-app/
│   ├── app/
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx
│   │   └── dashboard/
│   │       ├── layout.tsx     # Nested layout
│   │       └── page.tsx
│   ├── cloudwerk.config.ts
│   └── package.json
│
└── route-groups/
    ├── app/
    │   ├── (marketing)/
    │   │   ├── layout.tsx
    │   │   └── about/
    │   │       └── page.tsx
    │   └── (auth)/
    │       ├── layout.tsx
    │       └── login/
    │           └── page.tsx
    ├── cloudwerk.config.ts
    └── package.json
```

### Step 3: Write Integration Tests

**File:** `packages/vite-plugin/src/__tests__/integration/pages.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestServer, TestServer } from './test-utils.js'

describe('Page Routes', () => {
  let server: TestServer

  beforeAll(async () => {
    server = await createTestServer('fixtures/basic-app')
  })

  afterAll(async () => {
    await server.close()
  })

  it('should serve home page at /', async () => {
    const response = await server.fetch('/')
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/html')

    const html = await response.text()
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('Home Page') // Content from page.tsx
  })

  it('should serve static route at /about', async () => {
    const response = await server.fetch('/about')
    expect(response.status).toBe(200)

    const html = await response.text()
    expect(html).toContain('About Page')
  })

  it('should inject hydration script', async () => {
    const response = await server.fetch('/')
    const html = await response.text()

    expect(html).toContain('virtual:cloudwerk/client-entry')
  })

  it('should apply root layout', async () => {
    const response = await server.fetch('/')
    const html = await response.text()

    expect(html).toContain('Root Layout') // From layout.tsx
  })
})
```

**File:** `packages/vite-plugin/src/__tests__/integration/dynamic-routes.test.ts`

```typescript
describe('Dynamic Routes', () => {
  let server: TestServer

  beforeAll(async () => {
    server = await createTestServer('fixtures/dynamic-routes')
  })

  afterAll(async () => {
    await server.close()
  })

  describe('single dynamic segment [id]', () => {
    it('should match /users/123', async () => {
      const response = await server.fetch('/users/123')
      expect(response.status).toBe(200)

      const html = await response.text()
      expect(html).toContain('User ID: 123')
    })

    it('should match /users/abc', async () => {
      const response = await server.fetch('/users/abc')
      expect(response.status).toBe(200)
    })
  })

  describe('catch-all [...slug]', () => {
    it('should match /docs/getting-started', async () => {
      const response = await server.fetch('/docs/getting-started')
      expect(response.status).toBe(200)

      const html = await response.text()
      expect(html).toContain('Slug: getting-started')
    })

    it('should match /docs/api/reference/users', async () => {
      const response = await server.fetch('/docs/api/reference/users')
      expect(response.status).toBe(200)

      const html = await response.text()
      expect(html).toContain('Slug: api/reference/users')
    })

    it('should NOT match base path /docs', async () => {
      const response = await server.fetch('/docs')
      expect(response.status).toBe(404)
    })
  })

  describe('optional catch-all [[...cat]]', () => {
    it('should match base path /shop', async () => {
      const response = await server.fetch('/shop')
      expect(response.status).toBe(200)

      const html = await response.text()
      expect(html).toContain('Category: (none)')
    })

    it('should match /shop/electronics', async () => {
      const response = await server.fetch('/shop/electronics')
      expect(response.status).toBe(200)

      const html = await response.text()
      expect(html).toContain('Category: electronics')
    })

    it('should match /shop/electronics/phones/iphone', async () => {
      const response = await server.fetch('/shop/electronics/phones/iphone')
      expect(response.status).toBe(200)

      const html = await response.text()
      expect(html).toContain('Category: electronics/phones/iphone')
    })
  })
})
```

**File:** `packages/vite-plugin/src/__tests__/integration/api-routes.test.ts`

```typescript
describe('API Routes', () => {
  let server: TestServer

  beforeAll(async () => {
    server = await createTestServer('fixtures/basic-app')
  })

  afterAll(async () => {
    await server.close()
  })

  it('should handle GET request', async () => {
    const response = await server.fetch('/api/health')
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')

    const data = await response.json()
    expect(data).toEqual({ status: 'ok' })
  })

  it('should handle POST request', async () => {
    const response = await server.fetch('/api/health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true }),
    })
    expect(response.status).toBe(200)
  })

  it('should return 404 for unmatched routes', async () => {
    const response = await server.fetch('/api/nonexistent')
    expect(response.status).toBe(404)

    const data = await response.json()
    expect(data.error).toBe('Not Found')
  })
})
```

**File:** `packages/vite-plugin/src/__tests__/integration/middleware.test.ts`

```typescript
describe('Middleware', () => {
  let server: TestServer

  beforeAll(async () => {
    server = await createTestServer('fixtures/middleware-app')
  })

  afterAll(async () => {
    await server.close()
  })

  it('should execute root middleware on all routes', async () => {
    const response = await server.fetch('/')
    expect(response.headers.get('x-middleware')).toBe('root')
  })

  it('should execute nested middleware after root', async () => {
    const response = await server.fetch('/admin')
    expect(response.headers.get('x-middleware')).toBe('root,admin')
  })

  it('should allow middleware to modify response', async () => {
    const response = await server.fetch('/')
    expect(response.headers.get('x-custom-header')).toBe('added-by-middleware')
  })
})
```

**File:** `packages/vite-plugin/src/__tests__/integration/layouts.test.ts`

```typescript
describe('Layouts', () => {
  let server: TestServer

  beforeAll(async () => {
    server = await createTestServer('fixtures/layouts-app')
  })

  afterAll(async () => {
    await server.close()
  })

  it('should wrap page with root layout', async () => {
    const response = await server.fetch('/')
    const html = await response.text()

    expect(html).toContain('<div class="root-layout">')
    expect(html).toContain('Home Page')
  })

  it('should wrap nested page with both layouts', async () => {
    const response = await server.fetch('/dashboard')
    const html = await response.text()

    // Root layout should be outermost
    expect(html).toContain('<div class="root-layout">')
    // Dashboard layout should be inside root
    expect(html).toContain('<div class="dashboard-layout">')
    // Page content should be innermost
    expect(html).toContain('Dashboard Page')

    // Verify nesting order
    const rootIndex = html.indexOf('root-layout')
    const dashboardIndex = html.indexOf('dashboard-layout')
    const pageIndex = html.indexOf('Dashboard Page')

    expect(rootIndex).toBeLessThan(dashboardIndex)
    expect(dashboardIndex).toBeLessThan(pageIndex)
  })
})
```

**File:** `packages/vite-plugin/src/__tests__/integration/route-groups.test.ts`

```typescript
describe('Route Groups', () => {
  let server: TestServer

  beforeAll(async () => {
    server = await createTestServer('fixtures/route-groups')
  })

  afterAll(async () => {
    await server.close()
  })

  it('should exclude group from URL path', async () => {
    // (marketing)/about/page.tsx should be at /about, not /(marketing)/about
    const response = await server.fetch('/about')
    expect(response.status).toBe(200)
  })

  it('should apply group-specific layout', async () => {
    const aboutResponse = await server.fetch('/about')
    const aboutHtml = await aboutResponse.text()
    expect(aboutHtml).toContain('Marketing Layout')

    const loginResponse = await server.fetch('/login')
    const loginHtml = await loginResponse.text()
    expect(loginHtml).toContain('Auth Layout')
  })

  it('should return 404 for group name in URL', async () => {
    const response = await server.fetch('/(marketing)/about')
    expect(response.status).toBe(404)
  })
})
```

### Step 4: Add Data Loading Tests

**File:** `packages/vite-plugin/src/__tests__/integration/loaders.test.ts`

```typescript
describe('Data Loading', () => {
  let server: TestServer

  beforeAll(async () => {
    server = await createTestServer('fixtures/loaders-app')
  })

  afterAll(async () => {
    await server.close()
  })

  it('should execute page loader and pass data to component', async () => {
    const response = await server.fetch('/users/123')
    const html = await response.text()

    expect(html).toContain('User: John Doe')
    expect(html).toContain('ID: 123')
  })

  it('should execute layout loader', async () => {
    const response = await server.fetch('/dashboard')
    const html = await response.text()

    expect(html).toContain('User: Admin')
  })

  it('should pass params to loader', async () => {
    const response = await server.fetch('/products/abc-123')
    const html = await response.text()

    expect(html).toContain('Product ID: abc-123')
  })

  it('should pass searchParams to page', async () => {
    const response = await server.fetch('/search?q=test&page=2')
    const html = await response.text()

    expect(html).toContain('Query: test')
    expect(html).toContain('Page: 2')
  })
})
```

### Step 5: Add Error Handling Tests (After error.tsx Implementation)

**File:** `packages/vite-plugin/src/__tests__/integration/error-handling.test.ts`

```typescript
describe('Error Handling', () => {
  let server: TestServer

  beforeAll(async () => {
    server = await createTestServer('fixtures/error-app')
  })

  afterAll(async () => {
    await server.close()
  })

  describe('error.tsx', () => {
    it('should render error page when page throws', async () => {
      const response = await server.fetch('/throws-error')
      expect(response.status).toBe(500)

      const html = await response.text()
      expect(html).toContain('Something went wrong')
      expect(html).toContain('error-boundary')
    })

    it('should use nested error boundary when available', async () => {
      const response = await server.fetch('/admin/throws-error')
      const html = await response.text()

      expect(html).toContain('Admin Error Boundary')
    })

    it('should fall back to root error boundary', async () => {
      const response = await server.fetch('/other/throws-error')
      const html = await response.text()

      expect(html).toContain('Root Error Boundary')
    })
  })

  describe('not-found.tsx', () => {
    it('should render not-found page for 404', async () => {
      const response = await server.fetch('/nonexistent')
      expect(response.status).toBe(404)

      const html = await response.text()
      expect(html).toContain('Page Not Found')
    })

    it('should use nested not-found when available', async () => {
      const response = await server.fetch('/admin/nonexistent')
      const html = await response.text()

      expect(html).toContain('Admin Not Found')
    })

    it('should render not-found when NotFoundError is thrown', async () => {
      const response = await server.fetch('/users/999')
      expect(response.status).toBe(404)

      const html = await response.text()
      expect(html).toContain('User Not Found')
    })
  })
})
```

## Files to Create

1. `packages/vite-plugin/src/__tests__/integration/test-utils.ts`
2. `packages/vite-plugin/src/__tests__/integration/fixtures/` (multiple fixture projects)
3. `packages/vite-plugin/src/__tests__/integration/pages.test.ts`
4. `packages/vite-plugin/src/__tests__/integration/dynamic-routes.test.ts`
5. `packages/vite-plugin/src/__tests__/integration/api-routes.test.ts`
6. `packages/vite-plugin/src/__tests__/integration/middleware.test.ts`
7. `packages/vite-plugin/src/__tests__/integration/layouts.test.ts`
8. `packages/vite-plugin/src/__tests__/integration/route-groups.test.ts`
9. `packages/vite-plugin/src/__tests__/integration/loaders.test.ts`
10. `packages/vite-plugin/src/__tests__/integration/error-handling.test.ts` (after error.tsx implemented)

## Dependencies

- The error handling tests depend on implementing error.tsx/not-found.tsx support (see `.agency/plans/error-and-notfound-pages.md`)
- Integration tests require the dev server to start successfully
- Fixture projects need minimal but complete configurations

## Test Configuration

Update `packages/vite-plugin/vitest.config.ts` to include integration tests:

```typescript
export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts'],
    // Increase timeout for integration tests
    testTimeout: 30000,
    // Run integration tests sequentially to avoid port conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
})
```

## Priority

Medium-High - Integration tests provide confidence that the framework works end-to-end, catching issues that unit tests miss (like the middleware import bug and catch-all pattern issues we found manually).

## Estimated Complexity

Medium - Creating fixtures is straightforward, but test infrastructure for starting/stopping dev servers requires care to avoid flaky tests and port conflicts.
