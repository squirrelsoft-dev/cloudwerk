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

// Default export for convenient usage
export { cloudwerkPlugin as default } from './plugin.js'
