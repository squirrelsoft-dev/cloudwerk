/**
 * @cloudwerk/auth - WebAuthn Registration
 *
 * Utilities for passkey registration (credential creation).
 */

import type {
  WebAuthnConfig,
  PublicKeyCredentialCreationOptions,
  RegistrationResponse,
  VerifiedRegistration,
  StoredCredential,
  ChallengeStorage,
} from './types.js'

// ============================================================================
// Constants
// ============================================================================

/**
 * Default timeout for registration (60 seconds).
 */
export const DEFAULT_REGISTRATION_TIMEOUT = 60000

/**
 * Challenge TTL in seconds (10 minutes).
 */
export const CHALLENGE_TTL = 600

// ============================================================================
// Registration Options
// ============================================================================

/**
 * Generate registration options for passkey creation.
 *
 * @param config - WebAuthn configuration
 * @param user - User information
 * @param existingCredentials - User's existing credentials (to exclude)
 * @param challengeStorage - Challenge storage for verification
 * @returns Registration options for navigator.credentials.create()
 *
 * @example
 * ```typescript
 * const options = await generateRegistrationOptions(
 *   webauthnConfig,
 *   { id: 'user-123', name: 'user@example.com', displayName: 'John Doe' },
 *   existingCredentials,
 *   challengeStorage
 * )
 *
 * // Pass to client
 * return json(options)
 * ```
 */
export async function generateRegistrationOptions(
  config: WebAuthnConfig,
  user: { id: string; name: string; displayName: string },
  existingCredentials: StoredCredential[],
  challengeStorage: ChallengeStorage
): Promise<PublicKeyCredentialCreationOptions> {
  // Generate challenge
  const challenge = generateChallenge()

  // Store challenge for verification
  await challengeStorage.storeChallenge(challenge, user.id, CHALLENGE_TTL)

  // Build algorithms list
  const algorithms = config.supportedAlgorithms ?? [-7, -257] // ES256, RS256
  const pubKeyCredParams = algorithms.map((alg) => ({
    type: 'public-key' as const,
    alg,
  }))

  // Build exclude credentials list
  const excludeCredentials = existingCredentials.map((cred) => ({
    type: 'public-key' as const,
    id: cred.id,
    transports: cred.transports,
  }))

  return {
    challenge,
    rp: {
      id: config.rpId,
      name: config.rpName,
    },
    user: {
      id: base64UrlEncode(new TextEncoder().encode(user.id)),
      name: user.name,
      displayName: user.displayName,
    },
    pubKeyCredParams,
    timeout: config.timeout ?? DEFAULT_REGISTRATION_TIMEOUT,
    excludeCredentials: excludeCredentials.length > 0 ? excludeCredentials : undefined,
    authenticatorSelection: {
      authenticatorAttachment: config.authenticatorAttachment,
      residentKey: config.residentKey ?? 'required',
      requireResidentKey: config.residentKey === 'required',
      userVerification: config.userVerification ?? 'preferred',
    },
    attestation: config.attestation ?? 'none',
  }
}

// ============================================================================
// Registration Verification
// ============================================================================

/**
 * Verify registration response from authenticator.
 *
 * @param config - WebAuthn configuration
 * @param response - Registration response from authenticator
 * @param challengeStorage - Challenge storage for verification
 * @returns Verified registration result
 *
 * @example
 * ```typescript
 * const result = await verifyRegistration(
 *   webauthnConfig,
 *   registrationResponse,
 *   challengeStorage
 * )
 *
 * if (result.verified && result.registrationInfo) {
 *   // Save credential to database
 *   await credentialStorage.createCredential({
 *     id: result.registrationInfo.credentialID,
 *     userId: user.id,
 *     publicKey: result.registrationInfo.credentialPublicKey,
 *     counter: result.registrationInfo.counter,
 *     // ...
 *   })
 * }
 * ```
 */
export async function verifyRegistration(
  config: WebAuthnConfig,
  response: RegistrationResponse,
  challengeStorage: ChallengeStorage
): Promise<VerifiedRegistration> {
  try {
    // Decode client data
    const clientDataJSON = base64UrlDecode(response.response.clientDataJSON)
    const clientData = JSON.parse(new TextDecoder().decode(clientDataJSON))

    // Verify type
    if (clientData.type !== 'webauthn.create') {
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

    // Decode attestation object
    const attestationObject = base64UrlDecode(response.response.attestationObject)
    const attestation = decodeCBOR(attestationObject)

    // Parse authenticator data
    const authData = parseAuthenticatorData(attestation.authData)

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

    // Extract attested credential data
    if (!authData.attestedCredentialData) {
      return { verified: false }
    }

    const { aaguid, credentialId, credentialPublicKey } = authData.attestedCredentialData

    // Determine attestation type
    const attestationType = determineAttestationType(attestation.fmt, attestation.attStmt)

    return {
      verified: true,
      registrationInfo: {
        credentialID: base64UrlEncode(new Uint8Array(credentialId)),
        credentialPublicKey: base64UrlEncode(new Uint8Array(credentialPublicKey)),
        counter: authData.signCount,
        aaguid: formatAAGUID(aaguid),
        credentialType: 'public-key',
        transports: response.response.transports,
        credentialBackedUp: authData.flags.backupEligibility && authData.flags.backupState,
        credentialDeviceType: authData.flags.backupEligibility ? 'multiDevice' : 'singleDevice',
        attestationType,
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
  attestedCredentialData?: {
    aaguid: Uint8Array
    credentialId: Uint8Array
    credentialPublicKey: Uint8Array
  }
  extensions?: Record<string, unknown>
}

/**
 * Parse authenticator data.
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
  offset += 4

  const result: ParsedAuthenticatorData = {
    rpIdHash,
    flags,
    signCount,
  }

  // Attested credential data (if present)
  if (flags.attestedCredentialData) {
    // AAGUID (16 bytes)
    const aaguid = authData.slice(offset, offset + 16)
    offset += 16

    // Credential ID length (2 bytes, big-endian)
    const credentialIdLength = new DataView(
      authData.buffer,
      authData.byteOffset + offset,
      2
    ).getUint16(0)
    offset += 2

    // Credential ID
    const credentialId = authData.slice(offset, offset + credentialIdLength)
    offset += credentialIdLength

    // Credential public key (CBOR-encoded, remaining bytes before extensions)
    // We need to decode CBOR to know the exact length
    const remainingData = authData.slice(offset)
    const { bytesRead } = decodeCBORWithLength(remainingData)
    const credentialPublicKey = authData.slice(offset, offset + bytesRead)
    offset += bytesRead

    result.attestedCredentialData = {
      aaguid,
      credentialId,
      credentialPublicKey,
    }
  }

  // Extensions (if present)
  if (flags.extensionData && offset < authData.length) {
    const extensionData = authData.slice(offset)
    result.extensions = decodeCBOR(extensionData)
  }

  return result
}

/**
 * Format AAGUID as string.
 */
function formatAAGUID(aaguid: Uint8Array): string {
  const hex = Array.from(aaguid)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * Determine attestation type from format and statement.
 */
function determineAttestationType(
  fmt: string,
  attStmt: Record<string, unknown>
): 'none' | 'self' | 'basic' | 'attca' {
  if (fmt === 'none') {
    return 'none'
  }

  if (fmt === 'packed') {
    if (!attStmt.x5c) {
      return 'self'
    }
    return 'basic'
  }

  // For other formats, default to basic if attestation present
  return Object.keys(attStmt).length === 0 ? 'none' : 'basic'
}

// ============================================================================
// Minimal CBOR Decoder
// ============================================================================

/**
 * Decode CBOR data.
 * This is a minimal implementation for WebAuthn attestation objects.
 */
function decodeCBOR(data: Uint8Array): any {
  return decodeCBORWithLength(data).value
}

/**
 * Decode CBOR data and return bytes read.
 */
function decodeCBORWithLength(data: Uint8Array): { value: any; bytesRead: number } {
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
      // 64-bit, use BigInt
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
      // Indefinite length
      argument = -1
    } else {
      throw new Error(`Invalid CBOR additional info: ${additionalInfo}`)
    }

    switch (majorType) {
      case 0: // Unsigned integer
        return typeof argument === 'bigint' ? Number(argument) : argument

      case 1: // Negative integer
        return typeof argument === 'bigint' ? -1 - Number(argument) : -1 - argument

      case 2: // Byte string
        return readBytes(Number(argument))

      case 3: // Text string
        const textBytes = readBytes(Number(argument))
        return new TextDecoder().decode(textBytes)

      case 4: // Array
        const arrayLength = Number(argument)
        const array: any[] = []
        for (let i = 0; i < arrayLength; i++) {
          array.push(decodeValue())
        }
        return array

      case 5: // Map
        const mapLength = Number(argument)
        const map: Record<string, any> = {}
        for (let i = 0; i < mapLength; i++) {
          const key = decodeValue()
          const value = decodeValue()
          map[String(key)] = value
        }
        return map

      case 6: // Tagged value
        // Skip tag and decode value
        return decodeValue()

      case 7: // Simple values and floats
        if (additionalInfo === 20) return false
        if (additionalInfo === 21) return true
        if (additionalInfo === 22) return null
        if (additionalInfo === 23) return undefined
        if (additionalInfo === 25) {
          // 16-bit float - not commonly used in WebAuthn
          throw new Error('16-bit float not supported')
        }
        if (additionalInfo === 26) {
          // 32-bit float
          const bytes = readBytes(4)
          const view = new DataView(bytes.buffer, bytes.byteOffset, 4)
          return view.getFloat32(0)
        }
        if (additionalInfo === 27) {
          // 64-bit float
          const bytes = readBytes(8)
          const view = new DataView(bytes.buffer, bytes.byteOffset, 8)
          return view.getFloat64(0)
        }
        return argument

      default:
        throw new Error(`Unknown CBOR major type: ${majorType}`)
    }
  }

  const value = decodeValue()
  return { value, bytesRead: offset }
}
