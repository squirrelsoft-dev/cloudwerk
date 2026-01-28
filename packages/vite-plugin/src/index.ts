/**
 * @cloudwerk/vite-plugin
 *
 * Vite plugin for Cloudwerk file-based routing with virtual entry generation.
 *
 * @packageDocumentation
 */

export { cloudwerkPlugin } from './plugin.js'

export type {
  CloudwerkVitePluginOptions,
  ResolvedCloudwerkOptions,
  ClientComponentInfo,
} from './types.js'

export {
  VIRTUAL_MODULE_IDS,
  RESOLVED_VIRTUAL_IDS,
} from './types.js'

// Export virtual module generators for build tooling
export { generateServerEntry } from './virtual-modules/server-entry.js'
export { generateClientEntry } from './virtual-modules/client-entry.js'

// Default export for convenient usage
export { cloudwerkPlugin as default } from './plugin.js'
