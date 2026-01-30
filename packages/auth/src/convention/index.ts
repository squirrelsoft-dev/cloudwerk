/**
 * @cloudwerk/auth - Convention Module
 *
 * Convention-based authentication configuration for Cloudwerk.
 *
 * @example
 * ```typescript
 * // app/auth/providers/github.ts
 * import { defineProvider, github } from '@cloudwerk/auth/convention'
 *
 * export default defineProvider(
 *   github({
 *     clientId: process.env.GITHUB_CLIENT_ID!,
 *     clientSecret: process.env.GITHUB_CLIENT_SECRET!,
 *   })
 * )
 * ```
 *
 * @example
 * ```typescript
 * // app/auth/config.ts
 * import { defineAuthConfig } from '@cloudwerk/auth/convention'
 *
 * export default defineAuthConfig({
 *   basePath: '/auth',
 *   session: { strategy: 'database' },
 * })
 * ```
 */

// Types
export type {
  AuthConfigDefinition,
  AuthCallbacksDefinition,
  AuthPagesDefinition,
  RBACDefinition,
  RoleDefinition,
  ProviderDefinition,
  AuthFileType,
  ScannedAuthFile,
  AuthScanResult,
  AuthProviderEntry,
  AuthRouteEntry,
  AuthValidationError,
  AuthValidationWarning,
  AuthManifest,
} from './types.js'

// Provider definition
export {
  defineProvider,
  isProviderDefinition,
} from './define-provider.js'

// Config definition
export {
  defineAuthConfig,
  isAuthConfigDefinition,
  mergeAuthConfig,
  DEFAULT_AUTH_CONFIG,
} from './define-auth-config.js'

// Callbacks definition
export {
  defineAuthCallbacks,
  isAuthCallbacksDefinition,
  getCallbackHandlers,
} from './define-callbacks.js'

// Pages definition
export {
  defineAuthPages,
  isAuthPagesDefinition,
  mergeAuthPages,
  DEFAULT_AUTH_PAGES,
} from './define-pages.js'

// RBAC definition
export {
  defineRBAC,
  isRBACDefinition,
  role,
  permissions,
  expandRolePermissions,
  getRoleIds,
  getAllPermissions,
} from './define-rbac.js'

// Re-export provider factories for convenience
export { github } from '../providers/github.js'
export { google } from '../providers/google.js'
export { discord } from '../providers/discord.js'
export { credentials } from '../providers/credentials.js'
