/**
 * @cloudwerk/ui - Hydration Utilities
 *
 * Server-side helpers for wrapping client components with hydration metadata
 * and generating the client-side hydration bootstrap script.
 */

import type { HydrationManifest } from '@cloudwerk/core'
import { serializeProps } from '@cloudwerk/core'

// ============================================================================
// Types
// ============================================================================

/**
 * Options for wrapping a component for hydration.
 */
export interface WrapForHydrationOptions {
  /** Unique component ID */
  componentId: string
  /** Props to serialize for client-side hydration */
  props: Record<string, unknown>
  /** Custom wrapper element tag (default: 'div') */
  wrapperTag?: string
}

/**
 * Options for generating hydration script.
 */
export interface HydrationScriptOptions {
  /** Whether to include source maps in development */
  includeSourceMaps?: boolean
  /** Custom hydration endpoint path */
  hydrationEndpoint?: string
}

// ============================================================================
// Hydration Wrapper
// ============================================================================

/**
 * Wrap a server-rendered element with hydration metadata.
 *
 * This wraps the component's HTML output with a container element
 * that includes data attributes for client-side hydration:
 * - `data-hydrate-id`: The component ID for looking up the client bundle
 * - `data-hydrate-props`: JSON-serialized props to pass during hydration
 *
 * @param html - Server-rendered HTML string
 * @param options - Hydration options
 * @returns HTML string with hydration wrapper
 *
 * @example
 * ```typescript
 * const html = wrapForHydration('<button>Count: 0</button>', {
 *   componentId: 'components_Counter',
 *   props: { initialCount: 0 },
 * })
 * // Returns:
 * // <div data-hydrate-id="components_Counter" data-hydrate-props='{"initialCount":0}'>
 * //   <button>Count: 0</button>
 * // </div>
 * ```
 */
export function wrapForHydration(html: string, options: WrapForHydrationOptions): string {
  const { componentId, props, wrapperTag = 'div' } = options

  // Serialize props (filters out non-serializable values)
  const serializedProps = serializeProps(props)

  // Escape the props for safe HTML attribute embedding
  const escapedProps = escapeHtmlAttribute(serializedProps)

  return `<${wrapperTag} data-hydrate-id="${componentId}" data-hydrate-props="${escapedProps}">${html}</${wrapperTag}>`
}

/**
 * Escape a string for safe use in an HTML attribute.
 *
 * @param str - String to escape
 * @returns Escaped string
 */
function escapeHtmlAttribute(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// ============================================================================
// Hydration Script Generation
// ============================================================================

/**
 * Generate the hydration bootstrap script to include in the HTML response.
 *
 * This script:
 * 1. Finds all elements with `data-hydrate-id` attributes
 * 2. Loads the corresponding client bundles
 * 3. Hydrates each component with its serialized props
 *
 * @param manifest - Hydration manifest with component metadata
 * @param options - Script generation options
 * @returns Script tags for hydration
 *
 * @example
 * ```typescript
 * const script = generateHydrationScript(manifest, {
 *   hydrationEndpoint: '/__cloudwerk',
 * })
 * // Insert at the end of the <body> tag
 * ```
 */
export function generateHydrationScript(
  manifest: HydrationManifest,
  options: HydrationScriptOptions = {}
): string {
  const { hydrationEndpoint = '/__cloudwerk' } = options

  // If no client components, return empty string
  if (manifest.components.size === 0) {
    return ''
  }

  // Build the component bundle map
  const bundleMap: Record<string, string> = {}
  for (const [id, meta] of manifest.components) {
    bundleMap[id] = meta.bundlePath
  }

  // Generate the hydration bootstrap script
  // This runs after DOM is ready and hydrates all marked elements
  // Note: The render function from hono/jsx/dom replaces container content safely
  // using JSX virtual DOM diffing, not raw HTML insertion
  const script = `
<script type="module">
(async function() {
  // Bundle map for component lookups
  const bundles = ${JSON.stringify(bundleMap)};

  // Find all elements that need hydration
  const elements = document.querySelectorAll('[data-hydrate-id]');
  if (elements.length === 0) return;

  // Cache for loaded modules
  const moduleCache = new Map();

  // Load a component module
  async function loadComponent(bundlePath) {
    if (moduleCache.has(bundlePath)) {
      return moduleCache.get(bundlePath);
    }
    const module = await import(bundlePath);
    moduleCache.set(bundlePath, module);
    return module;
  }

  // Hydrate each element
  for (const el of elements) {
    const componentId = el.getAttribute('data-hydrate-id');
    const propsJson = el.getAttribute('data-hydrate-props');

    if (!componentId || !bundles[componentId]) {
      console.warn('[Cloudwerk] Unknown client component:', componentId);
      continue;
    }

    try {
      // Parse props
      const props = propsJson ? JSON.parse(propsJson) : {};

      // Load the component module
      const bundlePath = bundles[componentId];
      const module = await loadComponent(bundlePath);
      const Component = module.default;

      if (!Component) {
        console.error('[Cloudwerk] No default export in component:', componentId);
        continue;
      }

      // Import hono/jsx/dom for hydration
      const { render } = await import('${hydrationEndpoint}/runtime.js');

      // Hydrate the component using hono/jsx/dom render
      // This safely replaces content using virtual DOM diffing
      render(Component(props), el);

      // Remove hydration attributes after successful hydration
      el.removeAttribute('data-hydrate-id');
      el.removeAttribute('data-hydrate-props');
    } catch (error) {
      console.error('[Cloudwerk] Failed to hydrate component:', componentId, error);
    }
  }
})();
</script>
`.trim()

  return script
}

/**
 * Generate script tags for preloading client bundles.
 *
 * This adds modulepreload hints for better performance.
 *
 * @param manifest - Hydration manifest with component metadata
 * @returns Link tags for modulepreload
 */
export function generatePreloadHints(manifest: HydrationManifest): string {
  if (manifest.components.size === 0) {
    return ''
  }

  const hints: string[] = []

  for (const meta of manifest.components.values()) {
    hints.push(`<link rel="modulepreload" href="${meta.bundlePath}">`)
  }

  return hints.join('\n')
}

// ============================================================================
// Hydration Runtime
// ============================================================================

/**
 * Generate the hydration runtime module.
 *
 * This is served at `/__cloudwerk/runtime.js` and provides the render
 * function that uses hono/jsx/dom for client-side hydration.
 *
 * The render function uses hono/jsx/dom's built-in virtual DOM diffing
 * to safely update the DOM without raw HTML insertion.
 *
 * @returns JavaScript module source code
 */
export function generateHydrationRuntime(): string {
  return `
// Cloudwerk Hydration Runtime
// Uses hono/jsx/dom for client-side rendering with virtual DOM diffing
import { render as honoRender } from 'hono/jsx/dom';

export function render(element, container) {
  // Use hono/jsx/dom render which safely updates DOM via virtual DOM diffing
  // This replaces the server-rendered content with the interactive version
  honoRender(element, container);
}

// Re-export hooks for client components
export {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useReducer,
  useSyncExternalStore,
  useTransition,
  useDeferredValue,
  useId,
} from 'hono/jsx/dom';
`.trim()
}
