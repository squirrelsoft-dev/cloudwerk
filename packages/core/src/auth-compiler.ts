/**
 * @cloudwerk/core - Auth Compiler
 *
 * Compiles scanned auth files into an auth manifest.
 */

import type { ScannedAuthFile, AuthScanResult } from './auth-scanner.js'

// ============================================================================
// Types
// ============================================================================

/**
 * Compiled provider entry in the auth manifest.
 */
export interface AuthProviderEntry {
  /** Provider ID (e.g., 'github', 'google', 'credentials') */
  id: string

  /** Provider type */
  type: 'oauth' | 'oidc' | 'credentials' | 'email'

  /** Source file path */
  filePath: string

  /** Display name */
  name: string

  /** Whether this provider is disabled */
  disabled: boolean
}

/**
 * Compiled auth route entry.
 */
export interface AuthRouteEntry {
  /** Route path pattern */
  path: string

  /** HTTP method */
  method: 'GET' | 'POST'

  /** Route handler type */
  handler:
    | 'signin'
    | 'signin-provider'
    | 'callback'
    | 'signout'
    | 'session'
    | 'csrf'
    | 'providers'

  /** Provider ID (for provider-specific routes) */
  providerId?: string
}

/**
 * Auth pages configuration.
 */
export interface AuthPagesConfig {
  signIn?: string
  signOut?: string
  error?: string
  verifyRequest?: string
  newUser?: string
}

/**
 * Auth validation error.
 */
export interface AuthValidationError {
  /** Error code */
  code:
    | 'NO_PROVIDERS'
    | 'DUPLICATE_PROVIDER'
    | 'INVALID_CONFIG'
    | 'INVALID_CALLBACKS'
    | 'INVALID_PAGES'
    | 'INVALID_RBAC'
    | 'LOAD_ERROR'

  /** Error message */
  message: string

  /** Source file path */
  filePath?: string
}

/**
 * Auth validation warning.
 */
export interface AuthValidationWarning {
  /** Warning code */
  code:
    | 'NO_SECRET'
    | 'INSECURE_COOKIES'
    | 'NO_CSRF'
    | 'UNKNOWN_FILE'
    | 'MISSING_CALLBACK'

  /** Warning message */
  message: string

  /** Source file path */
  filePath?: string
}

/**
 * Complete auth manifest.
 */
export interface AuthManifest {
  /** Discovered providers */
  providers: AuthProviderEntry[]

  /** Config file info */
  config?: {
    filePath: string
    basePath: string
    sessionStrategy: 'jwt' | 'database'
    debug: boolean
  }

  /** Callbacks file info */
  callbacks?: {
    filePath: string
    handlers: string[]
  }

  /** Pages configuration */
  pages?: AuthPagesConfig

  /** RBAC configuration */
  rbac?: {
    filePath: string
    roles: string[]
    defaultRole: string
  }

  /** Auto-generated auth routes */
  routes: AuthRouteEntry[]

  /** Validation errors (fatal) */
  errors: AuthValidationError[]

  /** Validation warnings (non-fatal) */
  warnings: AuthValidationWarning[]

  /** When this manifest was generated */
  generatedAt: Date
}

// ============================================================================
// Compilation
// ============================================================================

/**
 * Default base path for auth routes.
 */
export const DEFAULT_BASE_PATH = '/auth'

/**
 * Default session strategy.
 */
export const DEFAULT_SESSION_STRATEGY = 'jwt'

/**
 * Create a basic auth provider entry from a scanned file.
 *
 * @param file - The scanned provider file
 * @returns Basic provider entry (type will be determined at load time)
 */
export function compileProviderEntry(file: ScannedAuthFile): AuthProviderEntry {
  // Provider ID is derived from filename
  const id = file.providerId ?? file.name

  return {
    id,
    type: 'oauth', // Default, will be updated when module is loaded
    filePath: file.absolutePath,
    name: toTitleCase(id),
    disabled: false,
  }
}

/**
 * Generate auth routes for a set of providers.
 *
 * @param providers - Provider entries
 * @param basePath - Base path for auth routes
 * @returns Array of auth route entries
 */
export function generateAuthRoutes(
  providers: AuthProviderEntry[],
  basePath: string = DEFAULT_BASE_PATH
): AuthRouteEntry[] {
  const routes: AuthRouteEntry[] = []

  // Core routes
  routes.push(
    { path: basePath, method: 'GET', handler: 'signin' },
    { path: `${basePath}/signin`, method: 'GET', handler: 'signin' },
    { path: `${basePath}/signin`, method: 'POST', handler: 'signin' },
    { path: `${basePath}/signout`, method: 'GET', handler: 'signout' },
    { path: `${basePath}/signout`, method: 'POST', handler: 'signout' },
    { path: `${basePath}/session`, method: 'GET', handler: 'session' },
    { path: `${basePath}/csrf`, method: 'GET', handler: 'csrf' },
    { path: `${basePath}/providers`, method: 'GET', handler: 'providers' }
  )

  // Provider-specific routes
  for (const provider of providers) {
    if (provider.disabled) continue

    if (provider.type === 'oauth' || provider.type === 'oidc') {
      routes.push(
        {
          path: `${basePath}/signin/${provider.id}`,
          method: 'GET',
          handler: 'signin-provider',
          providerId: provider.id,
        },
        {
          path: `${basePath}/callback/${provider.id}`,
          method: 'GET',
          handler: 'callback',
          providerId: provider.id,
        }
      )
    } else if (provider.type === 'credentials') {
      routes.push({
        path: `${basePath}/callback/${provider.id}`,
        method: 'POST',
        handler: 'callback',
        providerId: provider.id,
      })
    } else if (provider.type === 'email') {
      routes.push(
        {
          path: `${basePath}/signin/${provider.id}`,
          method: 'POST',
          handler: 'signin-provider',
          providerId: provider.id,
        },
        {
          path: `${basePath}/callback/${provider.id}`,
          method: 'GET',
          handler: 'callback',
          providerId: provider.id,
        }
      )
    }
  }

  return routes
}

/**
 * Build a complete auth manifest from scan results.
 *
 * @param scanResult - Results from scanAuth()
 * @param options - Build options
 * @returns The compiled auth manifest
 */
export function buildAuthManifest(
  scanResult: AuthScanResult,
  options?: {
    basePath?: string
    sessionStrategy?: 'jwt' | 'database'
    debug?: boolean
  }
): AuthManifest {
  const errors: AuthValidationError[] = []
  const warnings: AuthValidationWarning[] = []
  const basePath = options?.basePath ?? DEFAULT_BASE_PATH
  const sessionStrategy = options?.sessionStrategy ?? DEFAULT_SESSION_STRATEGY
  const debug = options?.debug ?? false

  // Compile providers
  const providers: AuthProviderEntry[] = []
  const seenProviderIds = new Set<string>()

  for (const file of scanResult.providerFiles) {
    const entry = compileProviderEntry(file)

    // Check for duplicates
    if (seenProviderIds.has(entry.id)) {
      errors.push({
        code: 'DUPLICATE_PROVIDER',
        message: `Duplicate provider ID: ${entry.id}`,
        filePath: file.absolutePath,
      })
      continue
    }

    seenProviderIds.add(entry.id)
    providers.push(entry)
  }

  // Warn if no providers found
  if (providers.length === 0 && scanResult.hasAuth) {
    warnings.push({
      code: 'NO_SECRET',
      message: 'No auth providers found in app/auth/providers/',
    })
  }

  // Handle unknown files
  for (const file of scanResult.files) {
    if (file.type === 'unknown') {
      warnings.push({
        code: 'UNKNOWN_FILE',
        message: `Unknown auth file: ${file.relativePath}`,
        filePath: file.absolutePath,
      })
    }
  }

  // Generate routes
  const routes = generateAuthRoutes(providers, basePath)

  // Build manifest
  const manifest: AuthManifest = {
    providers,
    routes,
    errors,
    warnings,
    generatedAt: new Date(),
  }

  // Add config info if present
  if (scanResult.configFile) {
    manifest.config = {
      filePath: scanResult.configFile.absolutePath,
      basePath,
      sessionStrategy,
      debug,
    }
  }

  // Add callbacks info if present
  if (scanResult.callbacksFile) {
    manifest.callbacks = {
      filePath: scanResult.callbacksFile.absolutePath,
      handlers: [], // Will be populated when module is loaded
    }
  }

  // Add pages info if present
  if (scanResult.pagesFile) {
    manifest.pages = {} // Will be populated when module is loaded
  }

  // Add RBAC info if present
  if (scanResult.rbacFile) {
    manifest.rbac = {
      filePath: scanResult.rbacFile.absolutePath,
      roles: [], // Will be populated when module is loaded
      defaultRole: 'user',
    }
  }

  return manifest
}

// ============================================================================
// Module Loading
// ============================================================================

/**
 * Load and validate a provider module.
 *
 * @param entry - The provider entry to update
 * @returns Updated provider entry
 */
export async function loadProviderModule(
  entry: AuthProviderEntry
): Promise<AuthProviderEntry> {
  try {
    const module = await import(/* @vite-ignore */ entry.filePath)
    const exported = module.default

    // Check if it's a provider definition
    if (exported && typeof exported === 'object') {
      // Handle defineProvider() result
      if ('provider' in exported && 'id' in exported && 'type' in exported) {
        return {
          ...entry,
          id: exported.id,
          type: exported.type,
          name: exported.provider.name ?? toTitleCase(exported.id),
        }
      }

      // Handle raw provider object
      if ('id' in exported && 'type' in exported) {
        return {
          ...entry,
          id: exported.id,
          type: exported.type,
          name: exported.name ?? toTitleCase(exported.id),
        }
      }
    }

    return entry
  } catch (error) {
    // Return entry as-is if loading fails
    console.warn(`Failed to load provider module: ${entry.filePath}`, error)
    return entry
  }
}

/**
 * Load and validate a config module.
 *
 * @param filePath - Path to config file
 * @returns Config data or undefined
 */
export async function loadConfigModule(
  filePath: string
): Promise<{
  basePath?: string
  sessionStrategy?: 'jwt' | 'database'
  debug?: boolean
  disabledProviders?: string[]
} | undefined> {
  try {
    const module = await import(/* @vite-ignore */ filePath)
    const config = module.default

    if (config && typeof config === 'object') {
      return {
        basePath: config.basePath,
        sessionStrategy: config.session?.strategy,
        debug: config.debug,
        disabledProviders: config.disabledProviders,
      }
    }

    return undefined
  } catch {
    return undefined
  }
}

/**
 * Load and validate a callbacks module.
 *
 * @param filePath - Path to callbacks file
 * @returns List of callback handler names
 */
export async function loadCallbacksModule(filePath: string): Promise<string[]> {
  try {
    const module = await import(/* @vite-ignore */ filePath)
    const callbacks = module.default

    if (callbacks && typeof callbacks === 'object') {
      const handlers: string[] = []
      if (typeof callbacks.signIn === 'function') handlers.push('signIn')
      if (typeof callbacks.session === 'function') handlers.push('session')
      if (typeof callbacks.jwt === 'function') handlers.push('jwt')
      if (typeof callbacks.redirect === 'function') handlers.push('redirect')
      if (typeof callbacks.signOut === 'function') handlers.push('signOut')
      return handlers
    }

    return []
  } catch {
    return []
  }
}

/**
 * Load and validate a pages module.
 *
 * @param filePath - Path to pages file
 * @returns Pages config or undefined
 */
export async function loadPagesModule(
  filePath: string
): Promise<AuthPagesConfig | undefined> {
  try {
    const module = await import(/* @vite-ignore */ filePath)
    const pages = module.default

    if (pages && typeof pages === 'object') {
      return {
        signIn: pages.signIn,
        signOut: pages.signOut,
        error: pages.error,
        verifyRequest: pages.verifyRequest,
        newUser: pages.newUser,
      }
    }

    return undefined
  } catch {
    return undefined
  }
}

/**
 * Load and validate an RBAC module.
 *
 * @param filePath - Path to RBAC file
 * @returns RBAC info or undefined
 */
export async function loadRBACModule(
  filePath: string
): Promise<{ roles: string[]; defaultRole: string } | undefined> {
  try {
    const module = await import(/* @vite-ignore */ filePath)
    const rbac = module.default

    if (rbac && typeof rbac === 'object' && Array.isArray(rbac.roles)) {
      return {
        roles: rbac.roles.map((r: { id: string }) => r.id),
        defaultRole: rbac.defaultRole ?? 'user',
      }
    }

    return undefined
  } catch {
    return undefined
  }
}

/**
 * Build a fully populated auth manifest by loading all modules.
 *
 * @param scanResult - Results from scanAuth()
 * @returns The compiled auth manifest with loaded module data
 */
export async function buildAuthManifestWithModules(
  scanResult: AuthScanResult
): Promise<AuthManifest> {
  // Load config first to get options
  let configData: Awaited<ReturnType<typeof loadConfigModule>>
  if (scanResult.configFile) {
    configData = await loadConfigModule(scanResult.configFile.absolutePath)
  }

  // Build basic manifest
  const manifest = buildAuthManifest(scanResult, {
    basePath: configData?.basePath,
    sessionStrategy: configData?.sessionStrategy,
    debug: configData?.debug,
  })

  // Load and update providers
  const loadedProviders = await Promise.all(
    manifest.providers.map((p) => loadProviderModule(p))
  )

  // Apply disabled providers from config
  if (configData?.disabledProviders) {
    for (const provider of loadedProviders) {
      if (configData.disabledProviders.includes(provider.id)) {
        provider.disabled = true
      }
    }
  }

  manifest.providers = loadedProviders

  // Regenerate routes with correct provider types
  manifest.routes = generateAuthRoutes(
    loadedProviders,
    manifest.config?.basePath ?? DEFAULT_BASE_PATH
  )

  // Load callbacks
  if (scanResult.callbacksFile && manifest.callbacks) {
    manifest.callbacks.handlers = await loadCallbacksModule(
      scanResult.callbacksFile.absolutePath
    )
  }

  // Load pages
  if (scanResult.pagesFile) {
    manifest.pages = await loadPagesModule(scanResult.pagesFile.absolutePath)
  }

  // Load RBAC
  if (scanResult.rbacFile && manifest.rbac) {
    const rbacData = await loadRBACModule(scanResult.rbacFile.absolutePath)
    if (rbacData) {
      manifest.rbac.roles = rbacData.roles
      manifest.rbac.defaultRole = rbacData.defaultRole
    }
  }

  return manifest
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Convert a string to title case.
 */
function toTitleCase(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim()
}

/**
 * Check if a manifest has any fatal errors.
 */
export function hasErrors(manifest: AuthManifest): boolean {
  return manifest.errors.length > 0
}

/**
 * Check if a manifest has any warnings.
 */
export function hasWarnings(manifest: AuthManifest): boolean {
  return manifest.warnings.length > 0
}

/**
 * Get a summary of the auth manifest.
 */
export function getManifestSummary(manifest: AuthManifest): {
  providerCount: number
  routeCount: number
  hasConfig: boolean
  hasCallbacks: boolean
  hasPages: boolean
  hasRBAC: boolean
  errorCount: number
  warningCount: number
} {
  return {
    providerCount: manifest.providers.filter((p) => !p.disabled).length,
    routeCount: manifest.routes.length,
    hasConfig: !!manifest.config,
    hasCallbacks: !!manifest.callbacks,
    hasPages: !!manifest.pages,
    hasRBAC: !!manifest.rbac,
    errorCount: manifest.errors.length,
    warningCount: manifest.warnings.length,
  }
}
