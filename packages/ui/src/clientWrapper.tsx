/**
 * @cloudwerk/ui - Client Component Wrapper
 *
 * Wraps client components with hydration metadata for server-side rendering.
 * This wrapper is used by the esbuild plugin to transform imports of client components.
 */

import { serializeProps } from '@cloudwerk/core'

/**
 * Escape a string for safe use in an HTML attribute.
 */
function escapeHtmlAttribute(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

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
  const { componentId, bundlePath } = meta

  return function WrappedClientComponent(props: P): unknown {
    // Server-render the original component
    const rendered = Component(props)

    // Serialize props for client-side hydration
    const serializedProps = serializeProps(props as Record<string, unknown>)
    const escapedProps = escapeHtmlAttribute(serializedProps)

    // Return JSX with hydration wrapper
    // Note: We use raw JSX here which will be transformed by the JSX runtime
    return (
      <div
        data-hydrate-id={componentId}
        data-hydrate-props={escapedProps}
        data-hydrate-bundle={bundlePath}
      >
        {rendered}
      </div>
    )
  }
}

/**
 * Type for a client component wrapper function.
 */
export type ClientComponentWrapper = typeof createClientComponentWrapper
