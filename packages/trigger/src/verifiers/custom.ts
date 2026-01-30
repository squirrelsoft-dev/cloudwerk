/**
 * Custom webhook signature verifier factory.
 *
 * Create verifiers for any webhook provider using common patterns.
 */

import type { WebhookVerifier, WebhookVerificationResult } from '../types.js'
import { computeHmac, timingSafeEqual } from './utils.js'

/**
 * Signature encoding format.
 */
export type SignatureEncoding = 'hex' | 'base64'

/**
 * Hash algorithm for HMAC computation.
 */
export type HashAlgorithm = 'SHA-256' | 'SHA-1' | 'SHA-512'

export interface CustomVerifierOptions {
  /**
   * Name of the header containing the signature.
   * @example 'x-webhook-signature'
   */
  header: string

  /**
   * Hash algorithm to use.
   * @default 'SHA-256'
   */
  algorithm?: HashAlgorithm

  /**
   * Encoding of the signature in the header.
   * @default 'hex'
   */
  encoding?: SignatureEncoding

  /**
   * Prefix before the signature (e.g., 'sha256=').
   * Will be stripped before comparison.
   */
  prefix?: string

  /**
   * Optional timestamp header for replay attack prevention.
   */
  timestampHeader?: string

  /**
   * Tolerance for timestamp validation in seconds.
   * Only used if timestampHeader is set.
   * @default 300
   */
  timestampTolerance?: number

  /**
   * Function to build the signature base string.
   * By default, just uses the raw body.
   *
   * @param body - Raw request body as string
   * @param timestamp - Timestamp value if timestampHeader is set
   * @returns String to compute signature over
   */
  buildSignatureBase?: (body: string, timestamp?: string) => string
}

/**
 * Create a custom webhook signature verifier.
 *
 * @param secret - Webhook signing secret
 * @param options - Verifier configuration
 * @returns WebhookVerifier function
 *
 * @example
 * ```typescript
 * // Simple HMAC-SHA256 with hex encoding
 * verifiers.custom(secret, {
 *   header: 'x-webhook-signature',
 *   algorithm: 'SHA-256',
 *   encoding: 'hex',
 * })
 *
 * // With timestamp validation (like Stripe)
 * verifiers.custom(secret, {
 *   header: 'x-signature',
 *   timestampHeader: 'x-timestamp',
 *   timestampTolerance: 300,
 *   buildSignatureBase: (body, timestamp) => `${timestamp}.${body}`,
 * })
 *
 * // With prefix (like GitHub)
 * verifiers.custom(secret, {
 *   header: 'x-hub-signature-256',
 *   prefix: 'sha256=',
 * })
 * ```
 */
export function customVerifier(
  secret: string,
  options: CustomVerifierOptions
): WebhookVerifier {
  const {
    header,
    algorithm = 'SHA-256',
    encoding = 'hex',
    prefix,
    timestampHeader,
    timestampTolerance = 300,
    buildSignatureBase,
  } = options

  return async (
    request: Request,
    rawBody: ArrayBuffer
  ): Promise<WebhookVerificationResult> => {
    // Get signature header
    let signature = request.headers.get(header)

    if (!signature) {
      return {
        valid: false,
        error: `Missing ${header} header`,
      }
    }

    // Strip prefix if present
    if (prefix) {
      if (!signature.startsWith(prefix)) {
        return {
          valid: false,
          error: `Invalid signature format (expected ${prefix} prefix)`,
        }
      }
      signature = signature.slice(prefix.length)
    }

    // Validate timestamp if configured
    let timestamp: string | undefined
    if (timestampHeader) {
      timestamp = request.headers.get(timestampHeader) ?? undefined

      if (!timestamp) {
        return {
          valid: false,
          error: `Missing ${timestampHeader} header`,
        }
      }

      const timestampNum = parseInt(timestamp, 10)
      if (isNaN(timestampNum)) {
        return {
          valid: false,
          error: 'Invalid timestamp',
        }
      }

      const now = Math.floor(Date.now() / 1000)
      if (Math.abs(now - timestampNum) > timestampTolerance) {
        return {
          valid: false,
          error: `Timestamp outside tolerance (${timestampTolerance}s)`,
        }
      }
    }

    // Build signature base
    const body = new TextDecoder().decode(rawBody)
    const signatureBase = buildSignatureBase
      ? buildSignatureBase(body, timestamp)
      : body
    const signatureBaseBytes = new TextEncoder().encode(signatureBase)

    // Compute HMAC
    const computedSignatureHex = await computeHmac(
      algorithm,
      secret,
      signatureBaseBytes.buffer
    )

    // Convert to expected encoding
    let computedSignature: string
    if (encoding === 'base64') {
      const bytes = new Uint8Array(
        computedSignatureHex.match(/.{2}/g)!.map((byte) => parseInt(byte, 16))
      )
      computedSignature = btoa(String.fromCharCode(...bytes))
    } else {
      computedSignature = computedSignatureHex
    }

    // Compare signatures
    if (!timingSafeEqual(computedSignature, signature)) {
      return {
        valid: false,
        error: 'Signature mismatch',
      }
    }

    return { valid: true }
  }
}

/**
 * Alias for customVerifier.
 */
export const custom = customVerifier
