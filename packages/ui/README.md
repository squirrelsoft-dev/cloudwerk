# @cloudwerk/ui

UI rendering abstraction for Cloudwerk. Supports Hono JSX (default) and React.

## Installation

```bash
npm install @cloudwerk/ui
```

For React support:
```bash
npm install @cloudwerk/ui react react-dom
```

## Key Exports

```typescript
import {
  // Rendering
  render,    // Render JSX to Response
  html,      // Create HTML Response from string
  hydrate,   // Client-side hydration

  // Renderer management
  setActiveRenderer,
  initReactRenderer,

  // Hydration utilities
  wrapForHydration,
  generateHydrationScript
} from '@cloudwerk/ui'
```

## Basic Usage

```typescript
// Render a JSX component
import { render } from '@cloudwerk/ui'

export function GET() {
  return render(<HomePage />)
}

// With options
return render(<NotFoundPage />, { status: 404 })

// Raw HTML response
import { html } from '@cloudwerk/ui'

return html('<!DOCTYPE html><html><body>Hello</body></html>')
```

## React Renderer

To use React instead of Hono JSX:

```typescript
import { initReactRenderer, setActiveRenderer } from '@cloudwerk/ui'

// Register and activate React renderer
initReactRenderer()
setActiveRenderer('react')
```

## Client Entry Point

For client-side hydration, import from the client subpath:

```typescript
import { hydrate } from '@cloudwerk/ui/client'
```

## Documentation

For full documentation, visit: https://github.com/squirrelsoft-dev/cloudwerk

## Part of Cloudwerk

This package is part of the [Cloudwerk](https://github.com/squirrelsoft-dev/cloudwerk) monorepo.
