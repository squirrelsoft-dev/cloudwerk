# @cloudwerk/auth

Authentication for Cloudwerk applications with providers, sessions, RBAC, multi-tenancy, and rate limiting.

## Installation

```bash
pnpm add @cloudwerk/auth
```

## Quick Start

### 1. Create auth configuration

```typescript
// app/auth/config.ts
import { defineAuthConfig } from '@cloudwerk/auth/convention'

export default defineAuthConfig({
  basePath: '/auth',
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
})
```

### 2. Add a provider

```typescript
// app/auth/providers/github.ts
import { defineProvider, github } from '@cloudwerk/auth/convention'

export default defineProvider(
  github({
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  })
)
```

### 3. Protect routes

```typescript
// app/dashboard/page.tsx
import { requireAuth } from '@cloudwerk/auth'

export async function loader() {
  const user = requireAuth() // Redirects if not logged in
  return { user }
}

export default function DashboardPage({ user }) {
  return <h1>Welcome, {user.name}</h1>
}
```

## Features

- **Multiple Providers** - OAuth (GitHub, Google, Discord), credentials, email/magic link, WebAuthn/passkeys
- **Session Strategies** - Database (KV) or JWT (stateless)
- **RBAC** - Role-based access control with permission hierarchies
- **Multi-Tenancy** - Subdomain, path, header, or cookie-based tenant resolution
- **Rate Limiting** - Built-in limiters for login, password reset, and email verification
- **Client-Side** - `signIn()`, `signOut()`, `getSession()` helpers

## Context Helpers

```typescript
import {
  getUser,
  getSession,
  isAuthenticated,
  requireAuth,
  hasRole,
  hasPermission,
  requireRole,
  requirePermission,
} from '@cloudwerk/auth'
```

## Documentation

For complete documentation, visit the [Cloudwerk Auth Guide](https://cloudwerk.dev/guides/authentication/).

## License

MIT
