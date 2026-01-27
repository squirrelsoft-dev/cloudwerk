/**
 * @cloudwerk/ui - Renderer Selection
 *
 * Manages the active renderer and provides registration functionality.
 */

import type { Renderer } from './types.js'
import { honoJsxRenderer } from './renderers/hono-jsx.js'

// ============================================================================
// Renderer Registry
// ============================================================================

/**
 * Registry of available renderers.
 *
 * Built-in renderers:
 * - 'hono-jsx': Default renderer using Hono JSX
 *
 * Future renderers (not yet implemented):
 * - 'react': React renderer
 * - 'preact': Preact renderer
 */
const renderers: Record<string, Renderer> = {
  'hono-jsx': honoJsxRenderer,
}

/**
 * Currently active renderer instance.
 * Defaults to hono-jsx renderer.
 */
let activeRenderer: Renderer = honoJsxRenderer

/**
 * Name of the currently active renderer.
 * Defaults to 'hono-jsx'.
 */
let activeRendererName: string = 'hono-jsx'

// ============================================================================
// Renderer Access Functions
// ============================================================================

/**
 * Get the currently active renderer instance.
 *
 * @returns The active Renderer implementation
 *
 * @example
 * const renderer = getActiveRenderer()
 * const response = renderer.render(<App />)
 */
export function getActiveRenderer(): Renderer {
  return activeRenderer
}

/**
 * Get the name of the currently active renderer.
 *
 * @returns The renderer name (e.g., 'hono-jsx', 'react', 'preact')
 *
 * @example
 * console.log(`Using ${getActiveRendererName()} renderer`)
 */
export function getActiveRendererName(): string {
  return activeRendererName
}

// ============================================================================
// Renderer Configuration Functions
// ============================================================================

/**
 * Set the active renderer by name.
 *
 * Called during app initialization based on the `ui.renderer` config option.
 * The renderer must be registered (either built-in or via registerRenderer).
 *
 * @param name - Renderer name from config (e.g., 'hono-jsx', 'react')
 * @throws Error if renderer is not found
 *
 * @example
 * // Initialize from config
 * setActiveRenderer(config.ui?.renderer ?? 'hono-jsx')
 */
export function setActiveRenderer(name: string): void {
  const renderer = renderers[name]
  if (!renderer) {
    const available = Object.keys(renderers).join(', ')
    throw new Error(`Unknown renderer "${name}". Available renderers: ${available}`)
  }
  activeRenderer = renderer
  activeRendererName = name
}

/**
 * Register a custom renderer.
 *
 * Allows third-party renderer implementations to be used.
 * The renderer must implement the Renderer interface.
 *
 * @param name - Unique name for the renderer
 * @param renderer - Renderer implementation
 * @throws Error if a renderer with that name is already registered
 *
 * @example
 * // Register a custom renderer
 * registerRenderer('solid', solidRenderer)
 *
 * // Then use it in config
 * // ui: { renderer: 'solid' }
 */
export function registerRenderer(name: string, renderer: Renderer): void {
  if (renderers[name]) {
    throw new Error(
      `Renderer "${name}" is already registered. Use a different name.`
    )
  }
  renderers[name] = renderer
}

/**
 * Get a list of all available renderer names.
 *
 * Useful for validation and error messages.
 *
 * @returns Array of registered renderer names
 *
 * @example
 * const available = getAvailableRenderers()
 * // ['hono-jsx']
 */
export function getAvailableRenderers(): string[] {
  return Object.keys(renderers)
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Reset renderers to default state.
 *
 * @internal Used for testing only - ensures test isolation.
 */
export function _resetRenderers(): void {
  // Remove all custom renderers
  for (const name of Object.keys(renderers)) {
    if (name !== 'hono-jsx') {
      delete renderers[name]
    }
  }
  // Reset to default
  activeRenderer = honoJsxRenderer
  activeRendererName = 'hono-jsx'
}
