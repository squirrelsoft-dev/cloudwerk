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
 * Optional renderers (require additional dependencies):
 * - 'react': React renderer - requires react and react-dom packages
 *
 * Future renderers (not yet implemented):
 * - 'preact': Preact renderer
 *
 * Note: The React renderer is not auto-registered because React is an optional
 * peer dependency. To use it, call initReactRenderer() after installing React.
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
 * Initialize and register the React renderer.
 *
 * This must be called before using setActiveRenderer('react').
 * Requires react and react-dom packages to be installed.
 *
 * @throws Error if React packages are not installed
 *
 * @example
 * import { initReactRenderer, setActiveRenderer } from '@cloudwerk/ui'
 *
 * // Initialize React renderer (requires react and react-dom)
 * await initReactRenderer()
 *
 * // Now you can use React
 * setActiveRenderer('react')
 */
export async function initReactRenderer(): Promise<void> {
  if (renderers['react']) {
    return // Already registered
  }

  try {
    const { reactRenderer } = await import('./renderers/react.js')
    renderers['react'] = reactRenderer
  } catch (error) {
    throw new Error(
      'Failed to initialize React renderer. ' +
        'Make sure react and react-dom are installed: npm install react react-dom\n' +
        `Original error: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Set the active renderer by name.
 *
 * Called during app initialization based on the `ui.renderer` config option.
 * The renderer must be registered (either built-in or via registerRenderer).
 *
 * For the React renderer, you must call initReactRenderer() first.
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
    if (name === 'react') {
      throw new Error(
        `React renderer is not initialized. Call initReactRenderer() first, ` +
          `or install react and react-dom packages.`
      )
    }
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
 * // ['hono-jsx'] (or ['hono-jsx', 'react'] if initReactRenderer() was called)
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
  // Remove all custom renderers (preserve only hono-jsx)
  for (const name of Object.keys(renderers)) {
    if (name !== 'hono-jsx') {
      delete renderers[name]
    }
  }
  // Reset to default
  activeRenderer = honoJsxRenderer
  activeRendererName = 'hono-jsx'
}
