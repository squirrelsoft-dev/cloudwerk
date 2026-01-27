/**
 * @cloudwerk/core - Client Component Utilities
 *
 * Utilities for detecting and processing client components marked with 'use client' directive.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Information about a detected client component.
 */
export interface ClientComponentInfo {
  /** Absolute file path to the client component */
  filePath: string
  /** Unique ID for this component (used for hydration) */
  componentId: string
  /** Export name (default or named) */
  exportName: string
}

/**
 * Metadata for tracking client components during SSR.
 */
export interface ClientComponentMeta {
  /** Unique component ID */
  componentId: string
  /** Bundle path for the client-side JavaScript */
  bundlePath: string
  /** Source file path */
  sourceFile: string
}

/**
 * Hydration manifest mapping component IDs to their bundle paths.
 */
export interface HydrationManifest {
  /** Map of component ID to metadata */
  components: Map<string, ClientComponentMeta>
  /** Base path for client bundles */
  basePath: string
  /** Generated timestamp */
  generatedAt: Date
}

// ============================================================================
// Use Client Detection
// ============================================================================

/**
 * Regular expression to detect 'use client' directive at the top of a file.
 *
 * The directive must be:
 * - At the very beginning of the file (after optional whitespace/comments)
 * - Either 'use client' or "use client" (single or double quotes)
 * - Followed by a semicolon or newline
 *
 * This matches the React Server Components convention.
 */
const USE_CLIENT_REGEX = /^(?:\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*)\s*['"]use client['"]\s*;?/

/**
 * Check if a file contains the 'use client' directive at the top.
 *
 * The directive must be at the very beginning of the file (after any
 * leading comments or whitespace). This follows the React Server Components
 * convention.
 *
 * @param code - Source code to check
 * @returns true if the file has a 'use client' directive
 *
 * @example
 * ```typescript
 * import { hasUseClientDirective } from '@cloudwerk/core'
 *
 * const code = `'use client'
 *
 * export default function Counter() {
 *   const [count, setCount] = useState(0)
 *   return <button onClick={() => setCount(c => c + 1)}>{count}</button>
 * }`
 *
 * hasUseClientDirective(code) // => true
 * ```
 */
export function hasUseClientDirective(code: string): boolean {
  return USE_CLIENT_REGEX.test(code)
}

/**
 * Generate a unique component ID from a file path.
 *
 * The ID is based on the relative path from the app directory,
 * making it stable across builds.
 *
 * @param filePath - Absolute or relative file path
 * @param appDir - App directory path for making relative paths
 * @returns Unique component ID
 *
 * @example
 * ```typescript
 * generateComponentId('/app/components/Counter.tsx', '/app')
 * // => 'components_Counter'
 * ```
 */
export function generateComponentId(filePath: string, appDir: string): string {
  // Normalize paths
  const normalizedFilePath = filePath.replace(/\\/g, '/')
  const normalizedAppDir = appDir.replace(/\\/g, '/')

  // Get relative path from app directory
  let relativePath = normalizedFilePath
  if (normalizedFilePath.startsWith(normalizedAppDir)) {
    relativePath = normalizedFilePath.slice(normalizedAppDir.length)
  }

  // Remove leading slash and file extension
  relativePath = relativePath.replace(/^\//, '').replace(/\.(tsx?|jsx?)$/, '')

  // Replace path separators and special characters with underscores
  const id = relativePath.replace(/[/\\[\]().-]/g, '_')

  return id
}

// ============================================================================
// Hydration Manifest
// ============================================================================

/**
 * Create an empty hydration manifest.
 *
 * @param basePath - Base path for client bundles
 * @returns Empty hydration manifest
 */
export function createHydrationManifest(basePath: string = '/__cloudwerk'): HydrationManifest {
  return {
    components: new Map(),
    basePath,
    generatedAt: new Date(),
  }
}

/**
 * Add a client component to the hydration manifest.
 *
 * @param manifest - Hydration manifest to update
 * @param info - Client component info
 * @param bundlePath - Path to the client bundle
 */
export function addToHydrationManifest(
  manifest: HydrationManifest,
  info: ClientComponentInfo,
  bundlePath: string
): void {
  manifest.components.set(info.componentId, {
    componentId: info.componentId,
    bundlePath,
    sourceFile: info.filePath,
  })
}

/**
 * Serialize hydration manifest to JSON for embedding in HTML.
 *
 * @param manifest - Hydration manifest
 * @returns JSON string representation
 */
export function serializeHydrationManifest(manifest: HydrationManifest): string {
  const obj: Record<string, unknown> = {
    basePath: manifest.basePath,
    components: Object.fromEntries(manifest.components),
  }
  return JSON.stringify(obj)
}

// ============================================================================
// Props Serialization
// ============================================================================

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
