/**
 * @cloudwerk/auth - Convention Types
 *
 * Type definitions for convention-based auth configuration.
 */

import type {
  Provider,
  AuthCallbacks,
  AuthEvents,
  SessionConfig,
  CookieConfig,
  CSRFConfig,
} from '../types.js'

// ============================================================================
// Config Definition Types
// ============================================================================

/**
 * Auth configuration options for defineAuthConfig().
 */
export interface AuthConfigDefinition {
  /**
   * Base path for auth routes.
   * @default '/auth'
   */
  basePath?: string

  /**
   * Session configuration.
   */
  session?: SessionConfig

  /**
   * Cookie configuration.
   */
  cookies?: CookieConfig

  /**
   * CSRF protection configuration.
   */
  csrf?: CSRFConfig

  /**
   * Secret for signing tokens/cookies.
   * In production, should be set via environment variable.
   */
  secret?: string

  /**
   * Trust X-Forwarded-* headers from proxy.
   * @default true
   */
  trustHost?: boolean

  /**
   * Enable debug logging.
   * @default false
   */
  debug?: boolean

  /**
   * Providers to disable (by id).
   * Useful for temporarily disabling providers without removing config.
   */
  disabledProviders?: string[]
}

/**
 * Auth callbacks definition for defineAuthCallbacks().
 */
export interface AuthCallbacksDefinition {
  /**
   * Called when a user signs in.
   * Return true to allow, false to deny, or URL string to redirect.
   */
  signIn?: AuthCallbacks['signIn']

  /**
   * Called when session is accessed.
   * Use to add custom data to the session object.
   */
  session?: AuthCallbacks['session']

  /**
   * Called when JWT is created/updated (JWT strategy only).
   * Use to add custom claims to the JWT.
   */
  jwt?: AuthCallbacks['jwt']

  /**
   * Called before redirects.
   * Use to customize redirect behavior.
   */
  redirect?: AuthCallbacks['redirect']

  /**
   * Called when a user signs out.
   * Useful for cleanup or logging.
   */
  signOut?: AuthEvents['signOut']
}

/**
 * Auth pages definition for defineAuthPages().
 */
export interface AuthPagesDefinition {
  /**
   * Custom sign-in page path.
   * @default '/auth/signin'
   */
  signIn?: string

  /**
   * Custom sign-out page path.
   * @default '/auth/signout'
   */
  signOut?: string

  /**
   * Custom error page path.
   * @default '/auth/error'
   */
  error?: string

  /**
   * Custom email verification request page path.
   * @default '/auth/verify-request'
   */
  verifyRequest?: string

  /**
   * Custom new user onboarding page path.
   */
  newUser?: string
}

/**
 * RBAC definition for defineRBAC().
 */
export interface RBACDefinition {
  /**
   * Available roles in the system.
   */
  roles: RoleDefinition[]

  /**
   * Default role assigned to new users.
   */
  defaultRole?: string

  /**
   * Role hierarchy (role -> roles it inherits from).
   */
  hierarchy?: Record<string, string[]>
}

/**
 * Role definition.
 */
export interface RoleDefinition {
  /**
   * Role identifier (e.g., 'admin', 'editor', 'user').
   */
  id: string

  /**
   * Display name for the role.
   */
  name: string

  /**
   * Permissions granted to this role.
   * Supports wildcards: '*', 'posts:*', 'posts:read'
   */
  permissions: string[]

  /**
   * Description of the role.
   */
  description?: string
}

// ============================================================================
// Provider Definition Types
// ============================================================================

/**
 * Provider definition wrapper.
 */
export interface ProviderDefinition<T extends Provider = Provider> {
  /**
   * The provider instance.
   */
  provider: T

  /**
   * Provider ID (extracted from provider).
   */
  id: string

  /**
   * Provider type.
   */
  type: T['type']
}

// ============================================================================
// Scanned File Types
// ============================================================================

/**
 * Type of auth file discovered by the scanner.
 */
export type AuthFileType =
  | 'provider'
  | 'config'
  | 'callbacks'
  | 'pages'
  | 'rbac'
  | 'unknown'

/**
 * A scanned auth file from the app/auth/ directory.
 */
export interface ScannedAuthFile {
  /**
   * Relative path from app/auth/ (e.g., 'providers/github.ts').
   */
  relativePath: string

  /**
   * Absolute filesystem path.
   */
  absolutePath: string

  /**
   * File name without extension (e.g., 'github').
   */
  name: string

  /**
   * File extension (e.g., '.ts').
   */
  extension: string

  /**
   * Type of auth file.
   */
  type: AuthFileType

  /**
   * For provider files, the provider ID.
   */
  providerId?: string
}

/**
 * Result of scanning the app/auth/ directory.
 */
export interface AuthScanResult {
  /**
   * All discovered auth files.
   */
  files: ScannedAuthFile[]

  /**
   * Config file if present.
   */
  configFile?: ScannedAuthFile

  /**
   * Callbacks file if present.
   */
  callbacksFile?: ScannedAuthFile

  /**
   * Pages file if present.
   */
  pagesFile?: ScannedAuthFile

  /**
   * RBAC file if present.
   */
  rbacFile?: ScannedAuthFile

  /**
   * Provider files.
   */
  providerFiles: ScannedAuthFile[]
}

// ============================================================================
// Manifest Types
// ============================================================================

/**
 * Compiled provider entry in the auth manifest.
 */
export interface AuthProviderEntry {
  /**
   * Provider ID (e.g., 'github', 'google', 'credentials').
   */
  id: string

  /**
   * Provider type.
   */
  type: Provider['type']

  /**
   * Source file path.
   */
  filePath: string

  /**
   * Display name.
   */
  name: string

  /**
   * Whether this provider is disabled.
   */
  disabled: boolean
}

/**
 * Compiled auth route entry.
 */
export interface AuthRouteEntry {
  /**
   * Route path pattern.
   */
  path: string

  /**
   * HTTP method.
   */
  method: 'GET' | 'POST'

  /**
   * Route handler type.
   */
  handler:
    | 'signin'
    | 'signin-provider'
    | 'callback'
    | 'signout'
    | 'session'
    | 'csrf'

  /**
   * Provider ID (for provider-specific routes).
   */
  providerId?: string
}

/**
 * Auth validation error.
 */
export interface AuthValidationError {
  /**
   * Error code.
   */
  code: string

  /**
   * Error message.
   */
  message: string

  /**
   * Source file path.
   */
  filePath?: string
}

/**
 * Auth validation warning.
 */
export interface AuthValidationWarning {
  /**
   * Warning code.
   */
  code: string

  /**
   * Warning message.
   */
  message: string

  /**
   * Source file path.
   */
  filePath?: string
}

/**
 * Complete auth manifest.
 */
export interface AuthManifest {
  /**
   * Discovered providers.
   */
  providers: AuthProviderEntry[]

  /**
   * Config file info.
   */
  config?: {
    filePath: string
    basePath: string
    sessionStrategy: 'jwt' | 'database'
    debug: boolean
  }

  /**
   * Callbacks file info.
   */
  callbacks?: {
    filePath: string
    handlers: string[]
  }

  /**
   * Pages configuration.
   */
  pages?: AuthPagesDefinition

  /**
   * RBAC configuration.
   */
  rbac?: {
    roles: string[]
    defaultRole: string
  }

  /**
   * Auto-generated auth routes.
   */
  routes: AuthRouteEntry[]

  /**
   * Validation errors (fatal).
   */
  errors: AuthValidationError[]

  /**
   * Validation warnings (non-fatal).
   */
  warnings: AuthValidationWarning[]

  /**
   * When this manifest was generated.
   */
  generatedAt: Date
}
