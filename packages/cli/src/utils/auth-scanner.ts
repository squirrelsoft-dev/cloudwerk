/**
 * @cloudwerk/cli - Auth Scanner Utilities
 *
 * Utilities for scanning auth providers and loading auth configuration.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import {
  scanAuth,
  loadConfig,
} from '@cloudwerk/core/build'
import type { AuthProviderEntry } from '@cloudwerk/core/build'

// ============================================================================
// Types
// ============================================================================

export interface ScannedProvider {
  /** Provider ID (from filename or provider config) */
  id: string

  /** Provider type */
  type: 'oauth' | 'oidc' | 'credentials' | 'email' | 'passkey'

  /** Source file path */
  filePath: string
}

export interface AuthConfigResult {
  /** Session configuration */
  session?: {
    /** Session strategy */
    strategy?: 'jwt' | 'database'

    /** Maximum session age in seconds */
    maxAge?: number

    /** Update age in seconds */
    updateAge?: number
  }

  /** Base path for auth routes */
  basePath?: string

  /** Whether debug mode is enabled */
  debug?: boolean
}

// ============================================================================
// TypeScript Module Loader
// ============================================================================

/**
 * Compile a TypeScript file to JavaScript using esbuild.
 *
 * @param filePath - Path to the TypeScript file
 * @returns Path to the compiled temporary JavaScript file
 */
async function compileTypeScriptModule(filePath: string): Promise<string> {
  const result = await build({
    entryPoints: [filePath],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    // Externalize all packages - they'll be resolved from node_modules at runtime
    packages: 'external',
  })

  // Write temp file in the same directory so it can resolve node_modules
  const fileDir = path.dirname(filePath)
  const fileName = path.basename(filePath, path.extname(filePath))
  const tempPath = path.join(fileDir, `.${fileName}-${Date.now()}.mjs`)
  fs.writeFileSync(tempPath, result.outputFiles[0].text)
  return tempPath
}

/**
 * Load a TypeScript module by compiling and importing it.
 *
 * @param filePath - Path to the TypeScript file
 * @returns Module exports
 */
async function loadTypeScriptModule(filePath: string): Promise<unknown> {
  let tempFile: string | null = null

  try {
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      tempFile = await compileTypeScriptModule(filePath)
      const module = await import(pathToFileURL(tempFile).href)
      return module
    }

    // For JS files, import directly
    return await import(pathToFileURL(filePath).href)
  } finally {
    // Clean up temp file
    if (tempFile) {
      try {
        fs.unlinkSync(tempFile)
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

// ============================================================================
// Provider Scanner
// ============================================================================

/**
 * Scan for auth providers in app/auth/providers/.
 *
 * @param appDir - Application directory
 * @returns List of scanned providers
 */
export async function scanAuthProviders(appDir: string): Promise<ScannedProvider[]> {
  // Load cloudwerk config for extensions
  const config = await loadConfig(process.cwd())

  // Scan auth directory
  const scanResult = await scanAuth(appDir, { extensions: config.extensions })

  // No providers found
  if (scanResult.providerFiles.length === 0) {
    return []
  }

  // Load and compile each provider
  const providers: ScannedProvider[] = []

  for (const file of scanResult.providerFiles) {
    // Create basic provider entry
    const entry: AuthProviderEntry = {
      id: file.providerId ?? file.name,
      type: 'oauth', // Default
      filePath: file.absolutePath,
      name: file.name,
      disabled: false,
    }

    // Try to load and get actual type
    try {
      const module = await loadTypeScriptModule(file.absolutePath) as { default?: unknown }
      const exported = module?.default

      if (exported && typeof exported === 'object') {
        const obj = exported as Record<string, unknown>

        // Handle defineProvider() result
        if ('provider' in obj && 'id' in obj && 'type' in obj) {
          providers.push({
            id: obj.id as string,
            type: obj.type as ScannedProvider['type'],
            filePath: file.absolutePath,
          })
          continue
        }

        // Handle raw provider object
        if ('id' in obj && 'type' in obj) {
          providers.push({
            id: obj.id as string,
            type: obj.type as ScannedProvider['type'],
            filePath: file.absolutePath,
          })
          continue
        }
      }

      // Use default if structure doesn't match
      providers.push({
        id: entry.id,
        type: entry.type,
        filePath: entry.filePath,
      })
    } catch (error) {
      // Use default if loading fails
      console.warn(`Failed to load provider module: ${file.absolutePath}`, error)
      providers.push({
        id: entry.id,
        type: entry.type,
        filePath: entry.filePath,
      })
    }
  }

  return providers
}

/**
 * Load auth configuration from app/auth/config.ts.
 *
 * @param appDir - Application directory
 * @returns Auth configuration or null if not found
 */
export async function loadAuthConfig(
  appDir: string
): Promise<AuthConfigResult | null> {
  // Load cloudwerk config for extensions
  const config = await loadConfig(process.cwd())

  // Scan auth directory
  const scanResult = await scanAuth(appDir, { extensions: config.extensions })

  // No config file found
  if (!scanResult.configFile) {
    return null
  }

  // Load config module
  try {
    const module = await loadTypeScriptModule(scanResult.configFile.absolutePath) as { default?: unknown }
    const authConfig = module?.default as Record<string, unknown> | undefined

    if (!authConfig) {
      return null
    }

    const session = authConfig.session as { strategy?: 'jwt' | 'database' } | undefined

    return {
      basePath: authConfig.basePath as string | undefined,
      session: session?.strategy ? { strategy: session.strategy } : undefined,
      debug: authConfig.debug as boolean | undefined,
    }
  } catch {
    return null
  }
}

// ============================================================================
// Migration Schema Generators
// ============================================================================

/**
 * Generate users table SQL schema.
 */
export function generateUsersTableSQL(): string {
  return `-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  email_verified TEXT,
  name TEXT,
  image TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`
}

/**
 * Generate accounts table SQL schema (for OAuth providers).
 */
export function generateAccountsTableSQL(): string {
  return `-- Accounts table for OAuth provider links
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(provider, provider_account_id)
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_provider ON accounts(provider, provider_account_id);
`
}

/**
 * Generate sessions table SQL schema.
 */
export function generateSessionsTableSQL(): string {
  return `-- Sessions table for database session strategy
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  data TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
`
}

/**
 * Generate WebAuthn credentials table SQL schema.
 */
export function generateWebAuthnCredentialsTableSQL(): string {
  return `-- WebAuthn credentials table for passkey authentication
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  aaguid TEXT,
  transports TEXT,
  backed_up INTEGER NOT NULL DEFAULT 0,
  device_type TEXT NOT NULL DEFAULT 'singleDevice',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_used_at TEXT,
  name TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON webauthn_credentials(user_id);
`
}

/**
 * Generate verification tokens table SQL schema.
 */
export function generateVerificationTokensTableSQL(): string {
  return `-- Verification tokens table for email verification and password reset
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  PRIMARY KEY (identifier, token)
);

CREATE INDEX IF NOT EXISTS idx_verification_tokens_token ON verification_tokens(token);
`
}

/**
 * Generate tenants table SQL schema.
 */
export function generateTenantsTableSQL(): string {
  return `-- Tenants table for multi-tenancy
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  config TEXT,
  metadata TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
`
}

/**
 * Generate user_roles table SQL schema for RBAC.
 */
export function generateUserRolesTableSQL(): string {
  return `-- User roles junction table for RBAC
CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
`
}
