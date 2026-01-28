/**
 * @cloudwerk/utils - Props Serialization
 *
 * Utilities for serializing and deserializing component props for hydration.
 * These functions are browser-safe and have no Node.js dependencies.
 */

/**
 * Serialize props for passing to client-side hydration.
 *
 * Props must be JSON-serializable. Functions, Symbols, and other
 * non-serializable values will be stripped or throw an error.
 *
 * @param props - Props object to serialize
 * @returns JSON string of serialized props
 * @throws Error if props contain non-serializable values
 *
 * @example
 * ```typescript
 * const props = { count: 0, label: 'Click me' }
 * serializeProps(props) // => '{"count":0,"label":"Click me"}'
 * ```
 */
export function serializeProps(props: Record<string, unknown>): string {
  // Filter out children and other non-serializable props
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

  try {
    return JSON.stringify(serializable)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to serialize props: ${message}`)
  }
}

/**
 * Deserialize props from a JSON string.
 *
 * @param json - JSON string of serialized props
 * @returns Deserialized props object
 */
export function deserializeProps(json: string): Record<string, unknown> {
  try {
    return JSON.parse(json) as Record<string, unknown>
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to deserialize props: ${message}`)
  }
}
