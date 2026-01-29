# @cloudwerk/utils

Browser-safe utilities for Cloudwerk. Zero dependencies, works in both server and browser environments.

## Installation

```bash
npm install @cloudwerk/utils
```

## Exports

```typescript
import {
  serializeProps,
  deserializeProps,
  escapeHtmlAttribute
} from '@cloudwerk/utils'
```

## API

### `serializeProps(props: unknown): string`

Serialize props to a JSON string for embedding in HTML attributes.

```typescript
const serialized = serializeProps({ user: { name: 'Alice' } })
// '{"user":{"name":"Alice"}}'
```

### `deserializeProps<T>(value: string): T`

Deserialize props from a JSON string.

```typescript
const props = deserializeProps<{ user: { name: string } }>(serialized)
// { user: { name: 'Alice' } }
```

### `escapeHtmlAttribute(value: string): string`

Escape a string for safe use in HTML attributes.

```typescript
const safe = escapeHtmlAttribute('Hello "World"')
// 'Hello &quot;World&quot;'
```

## Use Case

These utilities are primarily used internally by `@cloudwerk/ui` for client component hydration, but are available for direct use when building custom rendering solutions.

## Documentation

For full documentation, visit: https://github.com/squirrelsoft-dev/cloudwerk

## Part of Cloudwerk

This package is part of the [Cloudwerk](https://github.com/squirrelsoft-dev/cloudwerk) monorepo.
