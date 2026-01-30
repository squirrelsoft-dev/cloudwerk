/**
 * JWT-based cookie session store.
 *
 * Provides stateless session management using signed JWTs.
 * Uses the jose library for cryptographic operations.
 */

import * as jose from 'jose'
import type { Session, CookieSessionStore, CookieSessionStoreConfig } from '../types.js'
import { DEFAULT_JWT_ALGORITHM } from './constants.js'

/**
 * JWT payload structure for session data.
 * Extends JWTPayload to be compatible with jose library.
 */
interface SessionJWTPayload extends jose.JWTPayload {
  /** Session ID */
  sid: string
  /** User ID */
  uid: string
  /** Session token */
  stk: string
  /** Session data */
  dat?: Record<string, unknown>
  /** Created at timestamp (Unix seconds) */
  cat: number
  /** Updated at timestamp (Unix seconds) */
  uat: number
}

/**
 * Create a JWT-based cookie session store.
 *
 * Sessions are encoded as signed JWTs and stored in cookies.
 * No server-side session storage is required.
 *
 * @param config - Store configuration
 * @returns Cookie session store
 *
 * @example
 * ```typescript
 * import { createCookieSessionStore } from '@cloudwerk/auth/session'
 *
 * const store = createCookieSessionStore({
 *   secret: env.SESSION_SECRET,
 *   maxAge: 7 * 24 * 60 * 60, // 7 days
 *   issuer: 'https://myapp.com',
 * })
 *
 * // Create a session token
 * const session: Session = {
 *   id: 'sess_123',
 *   userId: 'user_456',
 *   sessionToken: 'tok_789',
 *   expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 * }
 * const token = await store.encode(session)
 *
 * // Later, decode the token
 * const decoded = await store.decode(token)
 * ```
 */
export function createCookieSessionStore<TSessionData = Record<string, unknown>>(
  config: CookieSessionStoreConfig
): CookieSessionStore<TSessionData> {
  const {
    secret,
    algorithm = DEFAULT_JWT_ALGORITHM,
    // maxAge is used as a default when session.expiresAt is not set
    // Currently we always use session.expiresAt, so this is unused
    issuer,
    audience,
  } = config

  // Convert secret to Uint8Array for jose
  const secretKey = new TextEncoder().encode(secret)

  return {
    async encode(session: Session<TSessionData>): Promise<string> {
      const now = Math.floor(Date.now() / 1000)
      const exp = Math.floor(session.expiresAt.getTime() / 1000)

      const payload: SessionJWTPayload = {
        sid: session.id,
        uid: session.userId,
        stk: session.sessionToken,
        cat: Math.floor(session.createdAt.getTime() / 1000),
        uat: Math.floor(session.updatedAt.getTime() / 1000),
      }

      // Only include data if it exists and has values
      if (session.data && Object.keys(session.data).length > 0) {
        payload.dat = session.data as Record<string, unknown>
      }

      let builder = new jose.SignJWT(payload)
        .setProtectedHeader({ alg: algorithm })
        .setIssuedAt(now)
        .setExpirationTime(exp)

      if (issuer) {
        builder = builder.setIssuer(issuer)
      }

      if (audience) {
        builder = builder.setAudience(audience)
      }

      return builder.sign(secretKey)
    },

    async decode(token: string): Promise<Session<TSessionData> | null> {
      try {
        const options: jose.JWTVerifyOptions = {
          algorithms: [algorithm],
        }

        if (issuer) {
          options.issuer = issuer
        }

        if (audience) {
          options.audience = audience
        }

        const { payload } = await jose.jwtVerify(token, secretKey, options)

        // Type guard for required claims
        const sessionPayload = payload as unknown as SessionJWTPayload
        if (
          !sessionPayload.sid ||
          !sessionPayload.uid ||
          !sessionPayload.stk ||
          !sessionPayload.exp
        ) {
          return null
        }

        const session: Session<TSessionData> = {
          id: sessionPayload.sid,
          userId: sessionPayload.uid,
          sessionToken: sessionPayload.stk,
          expiresAt: new Date(sessionPayload.exp * 1000),
          createdAt: new Date((sessionPayload.cat ?? sessionPayload.iat ?? 0) * 1000),
          updatedAt: new Date((sessionPayload.uat ?? sessionPayload.iat ?? 0) * 1000),
        }

        // Include data if present
        if (sessionPayload.dat) {
          session.data = sessionPayload.dat as TSessionData
        }

        return session
      } catch (error) {
        // Token verification failed (expired, invalid signature, malformed, etc.)
        if (error instanceof jose.errors.JWTExpired) {
          // Token has expired
          return null
        }
        if (error instanceof jose.errors.JWTClaimValidationFailed) {
          // Claims validation failed (issuer, audience, etc.)
          return null
        }
        if (error instanceof jose.errors.JWSSignatureVerificationFailed) {
          // Signature verification failed
          return null
        }
        if (error instanceof jose.errors.JWSInvalid) {
          // Malformed JWS/JWT
          return null
        }
        // Re-throw unexpected errors
        throw error
      }
    },
  }
}
