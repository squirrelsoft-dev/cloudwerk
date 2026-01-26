# Cloudwerk Routing System - Full Requirements

> **Status:** Approved for v1 implementation
> **Related Issue:** [RFC #2](https://github.com/squirrelsoft-dev/cloudwerk/issues/2)

## Overview

Cloudwerk uses file-based routing that compiles to a Hono application. Routes are defined by the file system structure under `app/routes/`, with conventions for pages, API routes, layouts, and middleware.

---

## File Conventions

| File | Purpose |
|------|---------|
| `page.tsx` | UI route (SSR, returns HTML) |
| `route.ts` | API route (returns JSON) |
| `_layout.tsx` | Layout wrapper for directory and children |
| `middleware.ts` | Middleware for directory and children |
| `error.tsx` | Error boundary (future) |
| `loading.tsx` | Loading state (future, for streaming SSR) |

---

## Directory Structure

```
app/
├── routes/
│   ├── _layout.tsx              # Root layout
│   ├── middleware.ts            # Global middleware
│   ├── page.tsx                 # GET /
│   ├── about/
│   │   └── page.tsx             # GET /about
│   ├── dashboard/
│   │   ├── _layout.tsx          # Dashboard layout (wraps all /dashboard/* routes)
│   │   ├── middleware.ts        # Dashboard middleware (runs for all /dashboard/*)
│   │   ├── page.tsx             # GET /dashboard
│   │   └── settings/
│   │       └── page.tsx         # GET /dashboard/settings
│   ├── api/
│   │   └── users/
│   │       ├── route.ts         # GET/POST /api/users
│   │       └── [userId]/
│   │           └── route.ts     # GET/PUT/DELETE /api/users/:userId
│   └── posts/
│       ├── page.tsx             # GET /posts
│       └── [slug]/
│           └── page.tsx         # GET /posts/:slug
├── jobs/                        # Queue consumers (separate convention)
└── middleware.ts                # Alternative location for global middleware
```

---

## Dynamic Routes

### Basic Dynamic Segments

Folder names wrapped in brackets become route parameters:

```
app/routes/users/[userId]/route.ts  →  /users/:userId
app/routes/posts/[slug]/page.tsx    →  /posts/:slug
```

### Catch-All Routes

Use `[...param]` for catch-all segments:

```
app/routes/docs/[...path]/page.tsx  →  /docs/*path
```

This matches `/docs/a`, `/docs/a/b`, `/docs/a/b/c`, etc.

### Optional Catch-All

Use `[[...param]]` for optional catch-all (matches with or without segments):

```
app/routes/shop/[[...categories]]/page.tsx
```

Matches `/shop`, `/shop/electronics`, `/shop/electronics/phones`, etc.

---

## Route Parameters

### Accessing Parameters

```typescript
// app/routes/users/[userId]/posts/[postId]/route.ts
export const GET = async (c) => {
  const { userId, postId } = c.req.param()
  // Both are strings
  return c.json({ userId, postId })
}
```

### Typed Parameters

Types are inferred from the file path. The framework generates a route manifest at build time:

```typescript
// Generated: .cloudwerk/routes.d.ts
export interface RouteParams {
  '/users/:userId': { userId: string }
  '/users/:userId/posts/:postId': { userId: string; postId: string }
  '/posts/:slug': { slug: string }
}
```

Routes can import and use these types:

```typescript
import type { RouteParams } from '@cloudwerk/core'

type Params = RouteParams['/users/:userId']

export const GET = async (c: Context<{ params: Params }>) => {
  const { userId } = c.req.param() // typed as string
}
```

---

## HTTP Methods

### API Routes (route.ts)

Export named functions for each HTTP method:

```typescript
// app/routes/api/users/route.ts
import { json } from '@cloudwerk/core'

export const GET = async (c) => {
  const users = await db.query('SELECT * FROM users')
  return json(users)
}

export const POST = async (c) => {
  const body = await c.req.json()
  const user = await db.insert('users', body)
  return json(user, { status: 201 })
}
```

Supported method exports:
- `GET`
- `POST`
- `PUT`
- `PATCH`
- `DELETE`
- `HEAD`
- `OPTIONS`
- `ALL` (catch-all for any method)

### Page Routes (page.tsx)

Pages only respond to GET requests and return rendered HTML:

```typescript
// app/routes/about/page.tsx
export default function AboutPage() {
  return (
    <div>
      <h1>About Us</h1>
    </div>
  )
}
```

---

## Layouts

### Basic Layout

`_layout.tsx` files wrap all routes in their directory and subdirectories:

```typescript
// app/routes/_layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <title>My App</title>
      </head>
      <body>{children}</body>
    </html>
  )
}
```

### Nested Layouts

Layouts nest automatically based on directory structure:

```typescript
// app/routes/dashboard/_layout.tsx
export default function DashboardLayout({ children }) {
  return (
    <div class="flex">
      <Sidebar />
      <main class="flex-1">{children}</main>
    </div>
  )
}
```

A request to `/dashboard/settings` renders:
```
RootLayout
  └── DashboardLayout
        └── SettingsPage
```

### Layout with Data Loading

Layouts can export a `loader` function:

```typescript
// app/routes/dashboard/_layout.tsx
export const loader = async (c) => {
  const user = c.get('user')
  const notifications = await db.query(
    'SELECT * FROM notifications WHERE userId = ?',
    [user.id]
  )
  return { notifications }
}

export default function DashboardLayout({ children, data }) {
  return (
    <div>
      <header>
        <NotificationBell count={data.notifications.length} />
      </header>
      {children}
    </div>
  )
}
```

---

## Middleware

### Middleware Levels

1. **Global** - `app/middleware.ts` or `app/routes/middleware.ts`
2. **Directory** - `app/routes/dashboard/middleware.ts`
3. **Route** - Exported from route file

### Execution Order

Middleware executes in order: global → parent directories → child directories → route

```
Request to /dashboard/settings:
1. app/middleware.ts (global)
2. app/routes/middleware.ts (if exists)
3. app/routes/dashboard/middleware.ts
4. app/routes/dashboard/settings/route.ts middleware export
5. Route handler
```

### Middleware File Format

```typescript
// app/routes/dashboard/middleware.ts
import { type MiddlewareHandler } from '@cloudwerk/core'
import { requireAuth } from '@cloudwerk/auth'

export default [
  requireAuth(),
  // additional middleware...
] satisfies MiddlewareHandler[]
```

Or export a single middleware:

```typescript
export default requireAuth()
```

### Route-Level Middleware

```typescript
// app/routes/api/admin/users/route.ts
import { requireAuth, requireRole } from '@cloudwerk/auth'

export const middleware = [requireAuth(), requireRole('admin')]

export const GET = async (c) => {
  // Only admins reach here
}
```

### Writing Custom Middleware

```typescript
import { type MiddlewareHandler } from '@cloudwerk/core'

export const logger = (): MiddlewareHandler => {
  return async (c, next) => {
    const start = Date.now()
    await next()
    const ms = Date.now() - start
    console.log(`${c.req.method} ${c.req.path} - ${ms}ms`)
  }
}

export const requireAuth = (): MiddlewareHandler => {
  return async (c, next) => {
    const session = await getSession(c)
    if (!session) {
      return c.redirect('/login')
    }
    c.set('user', session.user)
    await next()
  }
}
```

---

## Route Configuration

Routes can export a `config` object for declarative settings:

```typescript
// app/routes/api/users/route.ts
export const config = {
  // Authentication
  auth: 'required',  // 'required' | 'optional' | 'none'

  // Rate limiting
  rateLimit: {
    requests: 100,
    window: '1m',  // '1m', '1h', '1d'
  },

  // CORS
  cors: true,  // or { origin: 'https://example.com', ... }

  // Runtime
  runtime: 'edge',  // future: 'edge' | 'node'
}

export const GET = async (c) => {
  // ...
}
```

The framework reads `config` at build time and applies appropriate middleware automatically.

---

## Route Groups

Use parentheses for route groups that don't affect the URL:

```
app/routes/
├── (marketing)/
│   ├── _layout.tsx      # Marketing layout
│   ├── page.tsx         # GET /
│   ├── about/
│   │   └── page.tsx     # GET /about
│   └── pricing/
│       └── page.tsx     # GET /pricing
├── (app)/
│   ├── _layout.tsx      # App layout
│   └── dashboard/
│       └── page.tsx     # GET /dashboard
```

The `(marketing)` and `(app)` folders are organizational only—they don't appear in the URL.

---

## Pages vs API Routes

### When Both Exist

If both `page.tsx` and `route.ts` exist in the same directory:

```
app/routes/users/
├── page.tsx    # UI for /users
└── route.ts    # API for /users
```

**Resolution rules:**
- Requests with `Accept: application/json` → `route.ts`
- Requests with `Accept: text/html` → `page.tsx`
- Ambiguous requests → `page.tsx` (prefer UI)

### Recommendation

For v1, keep API routes under `/api/` to avoid ambiguity:

```
app/routes/
├── users/
│   └── page.tsx           # GET /users (UI)
└── api/
    └── users/
        └── route.ts       # /api/users (API)
```

---

## Compilation Target

### v1: Single Hono App

All routes compile to a single Hono application:

```typescript
// Generated: .cloudwerk/server.ts
import { Hono } from 'hono'

const app = new Hono()

// Global middleware
app.use('*', logger())
app.use('*', errorHandler())

// Routes
app.get('/', homePageHandler)
app.get('/about', aboutPageHandler)
app.get('/dashboard', dashboardMiddleware, dashboardPageHandler)
app.get('/dashboard/settings', dashboardMiddleware, settingsPageHandler)
app.get('/api/users', apiUsersGetHandler)
app.post('/api/users', apiUsersPostHandler)
app.get('/api/users/:userId', apiUserGetHandler)

export default app
```

### Future: Service Bindings

Later versions may support splitting into multiple Workers with Service Bindings:

```
app/
├── routes/          # Main worker
└── workers/
    ├── email/       # Email worker (Service Binding)
    └── analytics/   # Analytics worker (Service Binding)
```

---

## Data Loading

### Page Loaders

Pages can export a `loader` function for server-side data fetching:

```typescript
// app/routes/posts/[slug]/page.tsx
export const loader = async (c) => {
  const { slug } = c.req.param()
  const post = await db.query('SELECT * FROM posts WHERE slug = ?', [slug])

  if (!post) {
    throw new NotFoundError()
  }

  return { post }
}

export default function PostPage({ data }) {
  return (
    <article>
      <h1>{data.post.title}</h1>
      <div>{data.post.content}</div>
    </article>
  )
}
```

### Loader Context

Loaders receive the Hono context with access to:
- `c.req` - Request object
- `c.env` - Cloudflare bindings (D1, KV, R2, etc.)
- `c.get('user')` - Data set by middleware
- `c.req.param()` - Route parameters

---

## Error Handling

### Route-Level Errors

Throw errors in loaders or handlers:

```typescript
import { NotFoundError, UnauthorizedError } from '@cloudwerk/core'

export const loader = async (c) => {
  const post = await db.query(...)

  if (!post) {
    throw new NotFoundError('Post not found')
  }

  if (post.private && !c.get('user')) {
    throw new UnauthorizedError()
  }

  return { post }
}
```

### Error Boundaries (Future)

```typescript
// app/routes/dashboard/error.tsx
export default function DashboardError({ error }) {
  return (
    <div>
      <h1>Something went wrong</h1>
      <p>{error.message}</p>
    </div>
  )
}
```

---

## Response Helpers

```typescript
import { json, html, redirect, notFound } from '@cloudwerk/core'

// JSON response
return json({ data })
return json({ data }, { status: 201 })
return json({ error: 'Bad request' }, { status: 400 })

// Redirect
return redirect('/login')
return redirect('/dashboard', 301)

// Not found
return notFound()

// Custom HTML (for API routes that need HTML)
return html('<h1>Hello</h1>')
```

---

## Special Files Summary

| File | Location | Purpose |
|------|----------|---------|
| `page.tsx` | Any route directory | UI route handler |
| `route.ts` | Any route directory | API route handler |
| `_layout.tsx` | Any route directory | Layout wrapper |
| `middleware.ts` | Root or any route directory | Middleware chain |
| `error.tsx` | Any route directory | Error boundary (future) |
| `loading.tsx` | Any route directory | Loading UI (future) |
| `not-found.tsx` | Root only | 404 page |

---

## Open for Future Consideration

- **Static generation hints** - `export const dynamic = 'force-static'`
- **Revalidation** - `export const revalidate = 3600`
- **Streaming SSR** - `loading.tsx` with Suspense boundaries
- **Parallel routes** - `@modal/page.tsx` convention
- **Intercepting routes** - `(.)photo/[id]/page.tsx` convention
