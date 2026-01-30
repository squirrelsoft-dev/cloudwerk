/**
 * @cloudwerk/auth
 *
 * Authentication and session management for Cloudwerk.
 */

export * from './types.js'

// Re-export commonly used session utilities from main entry
export {
  createKVSessionAdapter,
  createCookieSessionStore,
  createSessionManager,
} from './session/index.js'
