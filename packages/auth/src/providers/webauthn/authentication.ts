/**
 * @cloudwerk/auth - WebAuthn Authentication
 *
 * Utilities for passkey authentication (credential assertion).
 */

import type {
  WebAuthnConfig,
  PublicKeyCredentialRequestOptions,
  AuthenticationResponse,
  VerifiedAuthentication,
  StoredCredential,
  ChallengeStorage,
} from './types.js'

// ============================================================================
// Constants
// ============================================================================

/**
 * Default timeout for authentication (60 seconds).
 */
export const DEFAULT_AUTHENTICATION_TIMEOUT = 60000

/**
 * Challenge TTL in seconds (10 minutes).
 */
export const CHALLENGE_TTL = 600

// ============================================================================
// Authentication Options
// ============================================================================

/**
 * Generate authentication options for passkey assertion.
 *
 * @param config - WebAuthn configuration
 * @param userCredentials - User's credentials (empty for usernameless/discoverable)
 * @param challengeStorage - Challenge storage for verification
 * @returns Authentication options for navigator.credentials.get()
 *
 * @example
 * ```typescript
 * // Known user (with allowCredentials)
 * const options = await generateAuthenticationOptions(
 *   webauthnConfig,
 *   userCredentials,
 *   challengeStorage
 * )
 *
 * // Usernameless (discoverable credentials)
 * const options = await generateAuthenticationOptions(
 *   webauthnConfig,
 *   [],
 *   challengeStorage
 * )
 *
 * // Pass to client
 * return json(options)
 * ```
 */
export async function generateAuthenticationOptions(
  config: WebAuthnConfig,
  userCredentials: StoredCredential[],
  challengeStorage: ChallengeStorage
): Promise<PublicKeyCredentialRequestOptions> {
  // Generate challenge
  const challenge = generateChallenge()

  // Store challenge for verification (no user ID for authentication)
  await challengeStorage.storeChallenge(challenge, undefined, CHALLENGE_TTL)

  // Build allow credentials list
  const allowCredentials =
    userCredentials.length > 0
      ? userCredentials.map((cred) => ({
          type: 'public-key' as const,
          id: cred.id,
          transports: cred.transports,
        }))
      : undefined

  return {
    challenge,
    rpId: config.rpId,
    timeout: config.timeout ?? DEFAULT_AUTHENTICATION_TIMEOUT,
    allowCredentials,
    userVerification: config.userVerification ?? 'preferred',
  }
}

// ============================================================================
// Authentication Verification
// ============================================================================

/**
 * Verify authentication response from authenticator.
 *
 * @param config - WebAuthn configuration
 * @param response - Authentication response from authenticator
 * @param credential - Stored credential to verify against
 * @param challengeStorage - Challenge storage for verification
 * @returns Verified authentication result
 *
 * @example
 * ```typescript
 * // Find credential by ID
 * const credential = await credentialStorage.getCredential(response.id)
 * if (!credential) {
 *   return json({ error: 'Credential not found' }, { status: 400 })
 * }
 *
 * const result = await verifyAuthentication(
 *   webauthnConfig,
 *   authenticationResponse,
 *   credential,
 *   challengeStorage
 * )
 *
 * if (result.verified && result.authenticationInfo) {
 *   // Update credential counter
 *   await credentialStorage.updateCredential(credential.id, {
 *     counter: result.authenticationInfo.newCounter,
 *     lastUsedAt: new Date(),
 *   })
 *
 *   // Create session for user
 *   // ...
 * }
 * ```
 */
export async function verifyAuthentication(
  config: WebAuthnConfig,
  response: AuthenticationResponse,
  credential: StoredCredential,
  challengeStorage: ChallengeStorage
): Promise<VerifiedAuthentication> {
  try {
    // Decode client data
    const clientDataJSON = base64UrlDecode(response.response.clientDataJSON)
    const clientData = JSON.parse(new TextDecoder().decode(clientDataJSON))

    // Verify type
    if (clientData.type !== 'webauthn.get') {
      return { verified: false }
    }

    // Verify origin
    const origins = Array.isArray(config.origin)
      ? config.origin
      : config.origin
        ? [config.origin]
        : []

    if (origins.length > 0 && !origins.includes(clientData.origin)) {
      return { verified: false }
    }

    // Verify and consume challenge
    const challengeResult = await challengeStorage.consumeChallenge(clientData.challenge)
    if (challengeResult === null) {
      return { verified: false }
    }

    // Decode authenticator data
    const authenticatorData = base64UrlDecode(response.response.authenticatorData)
    const authData = parseAuthenticatorData(authenticatorData)

    // Verify RP ID hash
    const expectedRpIdHash = await sha256(new TextEncoder().encode(config.rpId ?? ''))
    if (!arrayBufferEqual(authData.rpIdHash, expectedRpIdHash)) {
      return { verified: false }
    }

    // Verify user presence
    if (!authData.flags.userPresent) {
      return { verified: false }
    }

    // Verify user verification if required
    if (config.userVerification === 'required' && !authData.flags.userVerified) {
      return { verified: false }
    }

    // Verify counter (clone detection)
    if (authData.signCount > 0 || credential.counter > 0) {
      if (authData.signCount <= credential.counter) {
        // Possible cloned authenticator
        console.warn(
          `WebAuthn: Potential cloned authenticator detected. ` +
            `Expected counter > ${credential.counter}, got ${authData.signCount}`
        )
        return { verified: false }
      }
    }

    // Verify signature
    const clientDataHash = await sha256(clientDataJSON)
    const signedData = concatenateBuffers(authenticatorData, clientDataHash)
    const signature = base64UrlDecode(response.response.signature)
    const publicKey = base64UrlDecode(credential.publicKey)

    const signatureValid = await verifySignature(publicKey, signedData, signature)
    if (!signatureValid) {
      return { verified: false }
    }

    return {
      verified: true,
      authenticationInfo: {
        credentialID: response.id,
        newCounter: authData.signCount,
        userHandle: response.response.userHandle ?? undefined,
        userVerified: authData.flags.userVerified,
        credentialDeviceType: authData.flags.backupEligibility ? 'multiDevice' : 'singleDevice',
        credentialBackedUp: authData.flags.backupEligibility && authData.flags.backupState,
      },
    }
  } catch {
    return { verified: false }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a random challenge.
 */
function generateChallenge(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes)
}

/**
 * Base64url encode bytes.
 */
function base64UrlEncode(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * Base64url decode to bytes.
 */
function base64UrlDecode(str: string): Uint8Array {
  // Add padding
  const padding = '='.repeat((4 - (str.length % 4)) % 4)
  const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * SHA-256 hash.
 */
async function sha256(data: Uint8Array): Promise<Uint8Array> {
  // Create a copy to ensure we have a plain ArrayBuffer (not SharedArrayBuffer)
  const buffer = new ArrayBuffer(data.length)
  new Uint8Array(buffer).set(data)
  const hash = await crypto.subtle.digest('SHA-256', buffer)
  return new Uint8Array(hash)
}

/**
 * Compare two ArrayBuffers for equality.
 */
function arrayBufferEqual(a: ArrayBuffer | Uint8Array, b: ArrayBuffer | Uint8Array): boolean {
  const viewA = a instanceof Uint8Array ? a : new Uint8Array(a)
  const viewB = b instanceof Uint8Array ? b : new Uint8Array(b)
  if (viewA.length !== viewB.length) return false
  for (let i = 0; i < viewA.length; i++) {
    if (viewA[i] !== viewB[i]) return false
  }
  return true
}

/**
 * Concatenate two Uint8Arrays.
 */
function concatenateBuffers(a: Uint8Array, b: Uint8Array): Uint8Array {
  const result = new Uint8Array(a.length + b.length)
  result.set(a, 0)
  result.set(b, a.length)
  return result
}

/**
 * Convert Uint8Array to a plain ArrayBuffer (not SharedArrayBuffer).
 * This is needed for WebCrypto APIs that don't accept SharedArrayBuffer.
 */
function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(data.length)
  new Uint8Array(buffer).set(data)
  return buffer
}

/**
 * Authenticator data flags.
 */
interface AuthenticatorDataFlags {
  userPresent: boolean
  userVerified: boolean
  backupEligibility: boolean
  backupState: boolean
  attestedCredentialData: boolean
  extensionData: boolean
}

/**
 * Parsed authenticator data.
 */
interface ParsedAuthenticatorData {
  rpIdHash: Uint8Array
  flags: AuthenticatorDataFlags
  signCount: number
}

/**
 * Parse authenticator data (for authentication, no attested credential data).
 */
function parseAuthenticatorData(authData: Uint8Array): ParsedAuthenticatorData {
  let offset = 0

  // RP ID hash (32 bytes)
  const rpIdHash = authData.slice(offset, offset + 32)
  offset += 32

  // Flags (1 byte)
  const flagsByte = authData[offset]
  offset += 1

  const flags: AuthenticatorDataFlags = {
    userPresent: (flagsByte & 0x01) !== 0,
    userVerified: (flagsByte & 0x04) !== 0,
    backupEligibility: (flagsByte & 0x08) !== 0,
    backupState: (flagsByte & 0x10) !== 0,
    attestedCredentialData: (flagsByte & 0x40) !== 0,
    extensionData: (flagsByte & 0x80) !== 0,
  }

  // Sign count (4 bytes, big-endian)
  const signCount = new DataView(authData.buffer, authData.byteOffset + offset, 4).getUint32(0)

  return {
    rpIdHash,
    flags,
    signCount,
  }
}

// ============================================================================
// Signature Verification
// ============================================================================

/**
 * Verify signature using COSE public key.
 */
async function verifySignature(
  publicKeyBytes: Uint8Array,
  data: Uint8Array,
  signature: Uint8Array
): Promise<boolean> {
  try {
    // Parse COSE key
    const coseKey = decodeCBOR(publicKeyBytes)

    // Key type (1 = OKP, 2 = EC2, 3 = RSA)
    const kty = coseKey[1]

    // Algorithm
    const alg = coseKey[3]

    let cryptoKey: CryptoKey

    if (kty === 2) {
      // EC2 key
      const crv = coseKey[-1]
      const x = coseKey[-2]
      const y = coseKey[-3]

      // Determine curve name
      let namedCurve: string
      if (crv === 1) namedCurve = 'P-256'
      else if (crv === 2) namedCurve = 'P-384'
      else if (crv === 3) namedCurve = 'P-521'
      else throw new Error(`Unsupported EC curve: ${crv}`)

      // Import as ECDSA key
      cryptoKey = await crypto.subtle.importKey(
        'jwk',
        {
          kty: 'EC',
          crv: namedCurve,
          x: base64UrlEncode(x),
          y: base64UrlEncode(y),
        },
        {
          name: 'ECDSA',
          namedCurve,
        },
        false,
        ['verify']
      )

      // Determine hash algorithm
      let hash: string
      if (alg === -7) hash = 'SHA-256' // ES256
      else if (alg === -35) hash = 'SHA-384' // ES384
      else if (alg === -36) hash = 'SHA-512' // ES512
      else throw new Error(`Unsupported EC algorithm: ${alg}`)

      // Convert signature from ASN.1 DER to raw format
      const rawSignature = derToRaw(signature, namedCurve)

      // Convert to ArrayBuffer to avoid SharedArrayBuffer issues
      const sigBuffer = toArrayBuffer(rawSignature)
      const dataBuffer = toArrayBuffer(data)

      return await crypto.subtle.verify(
        { name: 'ECDSA', hash },
        cryptoKey,
        sigBuffer,
        dataBuffer
      )
    } else if (kty === 3) {
      // RSA key
      const n = coseKey[-1]
      const e = coseKey[-2]

      // Import as RSA key
      cryptoKey = await crypto.subtle.importKey(
        'jwk',
        {
          kty: 'RSA',
          n: base64UrlEncode(n),
          e: base64UrlEncode(e),
        },
        {
          name: 'RSASSA-PKCS1-v1_5',
          hash: 'SHA-256',
        },
        false,
        ['verify']
      )

      // Convert to ArrayBuffer to avoid SharedArrayBuffer issues
      const sigBuffer = toArrayBuffer(signature)
      const dataBuffer = toArrayBuffer(data)

      return await crypto.subtle.verify(
        'RSASSA-PKCS1-v1_5',
        cryptoKey,
        sigBuffer,
        dataBuffer
      )
    } else {
      throw new Error(`Unsupported key type: ${kty}`)
    }
  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}

/**
 * Convert ASN.1 DER signature to raw format.
 */
function derToRaw(derSignature: Uint8Array, curve: string): Uint8Array {
  // Determine component size based on curve
  let componentSize: number
  if (curve === 'P-256') componentSize = 32
  else if (curve === 'P-384') componentSize = 48
  else if (curve === 'P-521') componentSize = 66
  else throw new Error(`Unsupported curve for DER conversion: ${curve}`)

  // Parse ASN.1 DER structure
  // SEQUENCE { INTEGER r, INTEGER s }
  if (derSignature[0] !== 0x30) {
    throw new Error('Invalid DER signature: expected SEQUENCE')
  }

  let offset = 2 // Skip SEQUENCE tag and length

  // Parse r
  if (derSignature[offset] !== 0x02) {
    throw new Error('Invalid DER signature: expected INTEGER for r')
  }
  offset++
  const rLength = derSignature[offset]
  offset++
  let r = derSignature.slice(offset, offset + rLength)
  offset += rLength

  // Parse s
  if (derSignature[offset] !== 0x02) {
    throw new Error('Invalid DER signature: expected INTEGER for s')
  }
  offset++
  const sLength = derSignature[offset]
  offset++
  let s = derSignature.slice(offset, offset + sLength)

  // Remove leading zeros (ASN.1 uses signed integers)
  while (r.length > componentSize && r[0] === 0) {
    r = r.slice(1)
  }
  while (s.length > componentSize && s[0] === 0) {
    s = s.slice(1)
  }

  // Pad to component size
  const rawSignature = new Uint8Array(componentSize * 2)
  rawSignature.set(r, componentSize - r.length)
  rawSignature.set(s, componentSize * 2 - s.length)

  return rawSignature
}

// ============================================================================
// Minimal CBOR Decoder
// ============================================================================

/**
 * Decode CBOR data.
 * This is a minimal implementation for WebAuthn COSE keys.
 */
function decodeCBOR(data: Uint8Array): any {
  let offset = 0

  function readByte(): number {
    return data[offset++]
  }

  function readBytes(length: number): Uint8Array {
    const result = data.slice(offset, offset + length)
    offset += length
    return result
  }

  function decodeValue(): any {
    const initialByte = readByte()
    const majorType = initialByte >> 5
    const additionalInfo = initialByte & 0x1f

    let argument: number | bigint

    if (additionalInfo < 24) {
      argument = additionalInfo
    } else if (additionalInfo === 24) {
      argument = readByte()
    } else if (additionalInfo === 25) {
      argument = (readByte() << 8) | readByte()
    } else if (additionalInfo === 26) {
      argument = (readByte() << 24) | (readByte() << 16) | (readByte() << 8) | readByte()
    } else if (additionalInfo === 27) {
      const high =
        BigInt(readByte()) << 56n |
        BigInt(readByte()) << 48n |
        BigInt(readByte()) << 40n |
        BigInt(readByte()) << 32n
      const low =
        BigInt(readByte()) << 24n |
        BigInt(readByte()) << 16n |
        BigInt(readByte()) << 8n |
        BigInt(readByte())
      argument = high | low
    } else if (additionalInfo === 31) {
      argument = -1
    } else {
      throw new Error(`Invalid CBOR additional info: ${additionalInfo}`)
    }

    switch (majorType) {
      case 0:
        return typeof argument === 'bigint' ? Number(argument) : argument

      case 1:
        return typeof argument === 'bigint' ? -1 - Number(argument) : -1 - argument

      case 2:
        return readBytes(Number(argument))

      case 3:
        const textBytes = readBytes(Number(argument))
        return new TextDecoder().decode(textBytes)

      case 4:
        const arrayLength = Number(argument)
        const array: any[] = []
        for (let i = 0; i < arrayLength; i++) {
          array.push(decodeValue())
        }
        return array

      case 5:
        const mapLength = Number(argument)
        const map: Record<string | number, any> = {}
        for (let i = 0; i < mapLength; i++) {
          const key = decodeValue()
          const value = decodeValue()
          map[key] = value
        }
        return map

      case 6:
        return decodeValue()

      case 7:
        if (additionalInfo === 20) return false
        if (additionalInfo === 21) return true
        if (additionalInfo === 22) return null
        if (additionalInfo === 23) return undefined
        return argument

      default:
        throw new Error(`Unknown CBOR major type: ${majorType}`)
    }
  }

  return decodeValue()
}
