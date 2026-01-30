/**
 * @cloudwerk/auth - Client Module
 *
 * Client-side authentication utilities for Cloudwerk applications.
 *
 * This module provides actions and utilities for client-side authentication.
 * It's designed to work with any framework (React, Vue, Svelte, etc.) or
 * vanilla JavaScript.
 *
 * @example
 * ```typescript
 * import { signIn, signOut, getSession, configureAuth } from '@cloudwerk/auth/client'
 *
 * // Configure (optional, defaults to /auth)
 * configureAuth({ basePath: '/api/auth' })
 *
 * // Sign in with OAuth
 * await signIn('github')
 *
 * // Sign in with credentials
 * const result = await signIn('credentials', {
 *   credentials: { email, password },
 *   redirect: false,
 * })
 *
 * // Get current session
 * const session = await getSession()
 *
 * // Sign out
 * await signOut()
 * ```
 */

// Re-export types
export type {
  ClientSession,
  ClientUser,
  AuthState,
  AuthContextValue,
  SignInOptions,
  SignOutOptions,
  SignInResult,
  SignOutResult,
  ClientProvider,
  UseSessionOptions,
  UseAuthOptions,
  SessionResponse,
  CSRFResponse,
  ProvidersResponse,
} from './types.js'

// Re-export actions
export {
  configureAuth,
  getSession,
  getCsrfToken,
  getProviders,
  signIn,
  signOut,
  type AuthConfig,
} from './actions.js'

// ============================================================================
// State Store (for frameworks that need reactive state)
// ============================================================================

import type { ClientSession, AuthState } from './types.js'
import { getSession } from './actions.js'

/**
 * Auth state listeners.
 */
type AuthListener = (state: AuthState) => void

/**
 * Simple auth state store for client-side use.
 *
 * This can be used directly or wrapped by framework-specific hooks.
 *
 * @example
 * ```typescript
 * // Create store
 * const store = createAuthStore()
 *
 * // Subscribe to changes
 * const unsubscribe = store.subscribe((state) => {
 *   console.log('Auth state changed:', state)
 * })
 *
 * // Initialize (fetch session)
 * await store.initialize()
 *
 * // Get current state
 * const state = store.getState()
 *
 * // Refresh session
 * await store.refresh()
 * ```
 */
export interface AuthStore {
  /** Get current state */
  getState(): AuthState

  /** Subscribe to state changes */
  subscribe(listener: AuthListener): () => void

  /** Initialize store (fetch session) */
  initialize(): Promise<void>

  /** Refresh session */
  refresh(): Promise<void>

  /** Dispose store (cleanup timers) */
  dispose(): void
}

/**
 * Create an auth state store.
 *
 * @param options - Store options
 * @returns Auth store
 */
export function createAuthStore(options: {
  /** Refetch interval in milliseconds */
  refetchInterval?: number
} = {}): AuthStore {
  let state: AuthState = {
    session: null,
    loading: true,
    error: null,
    isAuthenticated: false,
  }

  const listeners = new Set<AuthListener>()
  let refetchTimer: ReturnType<typeof setInterval> | null = null

  function notify(): void {
    for (const listener of listeners) {
      listener(state)
    }
  }

  function setState(updates: Partial<AuthState>): void {
    state = { ...state, ...updates }
    notify()
  }

  async function fetchSession(): Promise<void> {
    try {
      const sessionResponse = await getSession()

      const session: ClientSession | null = sessionResponse
        ? {
            user: sessionResponse.user,
            expires: sessionResponse.expires,
            isValid: sessionResponse.user !== null,
          }
        : null

      setState({
        session,
        loading: false,
        error: null,
        isAuthenticated: session?.user !== null,
      })
    } catch (error) {
      setState({
        session: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch session',
        isAuthenticated: false,
      })
    }
  }

  return {
    getState(): AuthState {
      return state
    },

    subscribe(listener: AuthListener): () => void {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    async initialize(): Promise<void> {
      await fetchSession()

      // Set up refetch interval if configured
      if (options.refetchInterval && options.refetchInterval > 0) {
        refetchTimer = setInterval(fetchSession, options.refetchInterval)
      }
    },

    async refresh(): Promise<void> {
      setState({ loading: true })
      await fetchSession()
    },

    dispose(): void {
      if (refetchTimer) {
        clearInterval(refetchTimer)
        refetchTimer = null
      }
      listeners.clear()
    },
  }
}

// ============================================================================
// URL Utilities
// ============================================================================

/**
 * Get the callback URL from query parameters.
 *
 * @param defaultUrl - Default URL if not in query
 * @returns Callback URL
 */
export function getCallbackUrl(defaultUrl: string = '/'): string {
  if (typeof window === 'undefined') {
    return defaultUrl
  }

  const params = new URLSearchParams(window.location.search)
  return params.get('callbackUrl') ?? defaultUrl
}

/**
 * Build sign-in URL with callback.
 *
 * @param provider - Provider ID
 * @param callbackUrl - Callback URL
 * @param basePath - Auth base path
 * @returns Sign-in URL
 */
export function buildSignInUrl(
  provider: string,
  callbackUrl: string = '/',
  basePath: string = '/auth'
): string {
  const url = new URL(`${basePath}/signin/${provider}`, window.location.origin)
  url.searchParams.set('callbackUrl', callbackUrl)
  return url.toString()
}

/**
 * Build sign-out URL with callback.
 *
 * @param callbackUrl - Callback URL
 * @param basePath - Auth base path
 * @returns Sign-out URL
 */
export function buildSignOutUrl(
  callbackUrl: string = '/',
  basePath: string = '/auth'
): string {
  const url = new URL(`${basePath}/signout`, window.location.origin)
  url.searchParams.set('callbackUrl', callbackUrl)
  return url.toString()
}
