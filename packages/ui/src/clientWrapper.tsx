/**
 * @cloudwerk/ui - Client Component Wrapper
 *
 * Wraps client components with hydration metadata for server-side rendering.
 * This wrapper is used by the esbuild plugin to transform imports of client components.
 *
 * IMPORTANT: This file must NOT use JSX syntax. The @cloudwerk/ui package is
 * compiled with jsxImportSource: "hono/jsx", so any JSX here would produce
 * Hono JSX elements. When the active renderer is React, those Hono elements
 * would be nested inside a React element tree, causing "Objects are not valid
 * as a React child" errors. Instead, we use the active renderer's createElement
 * method at runtime to produce elements compatible with whichever JSX runtime
 * is in use.
 */

import { serializeProps } from '@cloudwerk/utils'
import { getActiveRenderer, getActiveRendererName } from './renderer.js'

/**
 * Metadata for a wrapped client component.
 */
export interface ClientComponentMeta {
  /** Unique component ID for hydration */
  componentId: string
  /** Path to the client bundle */
  bundlePath: string
}

/**
 * Creates a wrapper component that adds hydration metadata.
 *
 * The wrapper:
 * 1. Server-renders the original component
 * 2. Wraps the output with a div containing hydration attributes
 * 3. The client-side hydration script uses these attributes to hydrate
 *
 * @param Component - The original client component
 * @param meta - Component metadata for hydration
 * @returns Wrapped component that includes hydration metadata
 *
 * @example
 * ```tsx
 * // Original import:
 * import Counter from './components/counter'
 *
 * // Transformed to:
 * import _Counter from './components/counter'
 * const Counter = createClientComponentWrapper(_Counter, {
 *   componentId: 'components_counter',
 *   bundlePath: '/__cloudwerk/components_counter.js'
 * })
 * ```
 */
export function createClientComponentWrapper<P extends Record<string, unknown>>(
  Component: (props: P) => unknown,
  meta: ClientComponentMeta
): (props: P) => unknown {
  // On the client, return the original component for hydration
  // The wrapper is only needed on the server to add hydration attributes
  if (typeof window !== 'undefined') {
    return Component
  }

  const { componentId, bundlePath } = meta

  return function WrappedClientComponent(props: P): unknown {
    // For React renderer, skip island wrapping — full-tree hydration handles everything.
    // This check must be at render time (not import time) because setActiveRenderer()
    // runs after module imports are hoisted.
    if (getActiveRendererName() === 'react') {
      return Component(props)
    }

    // Server-render the original component
    const rendered = Component(props)

    // Serialize props for client-side hydration
    const serializedProps = serializeProps(props as Record<string, unknown>)

    // Use the active renderer's createElement to produce elements compatible
    // with whichever JSX runtime is in use (React or Hono JSX)
    const renderer = getActiveRenderer()
    return renderer.createElement(
      'div',
      {
        'data-hydrate-id': componentId,
        'data-hydrate-props': serializedProps,
        'data-hydrate-bundle': bundlePath,
      },
      rendered
    )
  }
}

/**
 * Type for a client component wrapper function.
 */
export type ClientComponentWrapper = typeof createClientComponentWrapper
