/**
 * @cloudwerk/ui - Client Component Wrapper
 *
 * Wraps client components with hydration metadata for server-side rendering.
 * This wrapper is used by the esbuild plugin to transform imports of client components.
 *
 * NOTE: This module is imported on both server and client. To avoid pulling in
 * Node.js-only dependencies from @cloudwerk/core, we inline the serializeProps
 * function here instead of importing it.
 */

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
 * Serialize props for hydration, filtering out non-serializable values.
 * Inlined here to avoid importing @cloudwerk/core which has Node.js dependencies.
 */
function serializeProps(props: Record<string, unknown>): string {
  const serializable: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(props)) {
    // Skip children - these are rendered server-side
    if (key === 'children') continue
    // Skip functions
    if (typeof value === 'function') continue
    // Skip symbols
    if (typeof value === 'symbol') continue
    // Skip undefined
    if (value === undefined) continue

    serializable[key] = value
  }

  return JSON.stringify(serializable)
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
  // On the client, return the original component for hydration
  // The wrapper is only needed on the server to add hydration attributes
  if (typeof window !== 'undefined') {
    return Component
  }

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
