# Plan: Implement error.tsx and not-found.tsx Support

## Overview

The scanner already detects `error.tsx` and `not-found.tsx` files and includes them in the `ScanResult`. However, these files are not being used by the server-entry generator. This plan outlines the implementation needed to render custom error and 404 pages.

## Current State

### What Works
- Scanner detects error.tsx files → `scanResult.errors[]`
- Scanner detects not-found.tsx files → `scanResult.notFound[]`
- Resolver can find applicable error/not-found boundaries for routes
- Types exist: `ErrorBoundaryProps` in `@cloudwerk/core`

### What's Missing
- Server-entry doesn't import error/not-found modules
- No try-catch around page rendering to catch errors
- Hono's `onError` and `notFound` handlers return raw JSON instead of rendering pages
- No logic to find the closest error/not-found boundary for a given route

## Implementation Plan

### Step 1: Update Route Manifest to Include Error/NotFound Boundaries

**File:** `packages/core/src/build.ts`

Add fields to `RouteEntry` type and manifest builder:
```typescript
interface RouteEntry {
  // ... existing fields
  errorBoundary?: string  // Absolute path to closest error.tsx
  notFoundPage?: string   // Absolute path to closest not-found.tsx
}
```

The resolver should find the closest error.tsx/not-found.tsx by walking up the directory tree from the route.

### Step 2: Import Error and NotFound Modules in Server Entry

**File:** `packages/vite-plugin/src/virtual-modules/server-entry.ts`

Add imports for error and not-found modules similar to layouts:
```typescript
// Error Boundary Imports
const errorImports: string[] = []
const errorModules = new Map<string, string>() // path -> varName

// NotFound Page Imports
const notFoundImports: string[] = []
const notFoundModules = new Map<string, string>()
```

### Step 3: Wrap Page Rendering with Error Handling

**File:** `packages/vite-plugin/src/virtual-modules/server-entry.ts`

Modify `registerPage` function to catch errors:
```typescript
app.get(pattern, async (c) => {
  try {
    // ... existing loader and render logic
  } catch (error) {
    // Find the error boundary for this route
    const errorModule = findErrorBoundary(pattern)
    if (errorModule) {
      return renderErrorPage(error, errorModule)
    }
    throw error // Let Hono's onError handle it
  }
})
```

### Step 4: Update Hono's notFound Handler

**File:** `packages/vite-plugin/src/virtual-modules/server-entry.ts`

Replace the generic JSON 404 with a page renderer:
```typescript
app.notFound((c) => {
  // Find the closest not-found page for the requested path
  const notFoundModule = findNotFoundPage(c.req.path)
  if (notFoundModule) {
    return renderNotFoundPage(notFoundModule)
  }
  // Fallback to JSON for API routes
  return c.json({ error: 'Not Found', path: c.req.path }, 404)
})
```

### Step 5: Update Hono's onError Handler

**File:** `packages/vite-plugin/src/virtual-modules/server-entry.ts`

Replace the generic JSON error with a page renderer:
```typescript
app.onError((err, c) => {
  // Check for special Cloudwerk errors
  if (err instanceof NotFoundError) {
    return handleNotFound(c)
  }
  if (err instanceof RedirectError) {
    return c.redirect(err.url, err.status)
  }

  // Find the closest error boundary
  const errorModule = findErrorBoundary(c.req.path)
  if (errorModule) {
    return renderErrorPage(err, errorModule, c)
  }

  // Fallback to JSON for API routes
  console.error('Request error:', err.message)
  return c.json({ error: 'Internal Server Error', message: err.message }, 500)
})
```

### Step 6: Implement Boundary Resolution Functions

Add helper functions to find the closest boundary:
```typescript
function findErrorBoundary(path: string): ErrorModule | null {
  // Match path segments to find closest error.tsx
  // e.g., /admin/users → check /admin/error.tsx, then /error.tsx
}

function findNotFoundPage(path: string): NotFoundModule | null {
  // Match path segments to find closest not-found.tsx
}
```

### Step 7: Update renderWithHydration to Accept Status Code

The current `renderWithHydration` function only returns a 200 status. Update it to accept an optional status code:

```typescript
/**
 * Render element to a Response, injecting hydration script before </body>.
 * @param element - The JSX element to render
 * @param status - HTTP status code (default: 200)
 */
function renderWithHydration(element: unknown, status: number = 200): Response {
  const html = '<!DOCTYPE html>' + String(element)

  const hydrationScript = '<script type="module" src="/@id/__x00__virtual:cloudwerk/client-entry"></script>'
  const bodyCloseRegex = /<\/body>/i
  const injectedHtml = bodyCloseRegex.test(html)
    ? html.replace(bodyCloseRegex, hydrationScript + '</body>')
    : html + hydrationScript

  return new Response(injectedHtml, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
```

### Step 8: Implement Page Renderers

```typescript
function renderErrorPage(error: Error, errorModule: ErrorModule): Response {
  const props: ErrorBoundaryProps = {
    error: {
      message: error.message,
      digest: generateErrorDigest(error),
    },
    errorType: determineErrorType(error),
  }
  const element = errorModule.default(props)
  return renderWithHydration(element, 500)
}

function renderNotFoundPage(notFoundModule: NotFoundModule): Response {
  const element = notFoundModule.default({})
  return renderWithHydration(element, 404)
}
```

## Files to Modify

1. `packages/core/src/build.ts` - Add error/notFound to RouteEntry
2. `packages/core/src/resolver.ts` - Add functions to resolve boundaries
3. `packages/vite-plugin/src/virtual-modules/server-entry.ts` - Main implementation

## Testing

1. Create test project with:
   - Root error.tsx and not-found.tsx
   - Nested /admin/error.tsx and /admin/not-found.tsx
   - Pages that throw errors

2. Verify:
   - `/throw-error` renders root error.tsx
   - `/admin/throw-error` renders admin error.tsx
   - `/nonexistent` renders root not-found.tsx
   - `/admin/nonexistent` renders admin not-found.tsx
   - Error boundaries receive correct props (message, digest, errorType)

## API Routes Consideration

For API routes (route.ts), we should NOT render HTML error pages. Instead:
- Check if the route is an API route
- If API route, return JSON errors
- If page route, render error/not-found pages

## Priority

Medium - This feature is documented but not implemented. Users following the docs will expect it to work.

## Estimated Complexity

Medium - Requires changes across core and vite-plugin packages, plus careful error handling logic.
