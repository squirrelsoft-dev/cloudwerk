/**
 * @cloudwerk/ui - Renderer Registry
 *
 * Exports all available renderer implementations.
 *
 * Note: React renderer is not exported here because React is an optional
 * peer dependency. Import directly from './react.js' if React is installed.
 */

export { honoJsxRenderer, renderStream, renderToStream } from './hono-jsx.js'

// React renderer can be imported directly when React is installed:
// import { reactRenderer, reactRenderToStream } from '@cloudwerk/ui/renderers/react'
