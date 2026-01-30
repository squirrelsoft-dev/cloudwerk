/**
 * @cloudwerk/auth - WebAuthn Types
 *
 * Type definitions for WebAuthn/passkey authentication.
 */

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration for the WebAuthn provider.
 */
export interface WebAuthnConfig {
  /**
   * Unique identifier for this provider.
   * @default 'passkey'
   */
  id?: string

  /**
   * Display name for this provider.
   * @default 'Passkey'
   */
  name?: string

  /**
   * Relying Party ID (your domain).
   * @default window.location.hostname
   */
  rpId?: string

  /**
   * Relying Party name shown to users.
   */
  rpName: string

  /**
   * Allowed origins for WebAuthn operations.
   * @default [window.location.origin]
   */
  origin?: string | string[]

  /**
   * Timeout for WebAuthn operations in milliseconds.
   * @default 60000 (1 minute)
   */
  timeout?: number

  /**
   * Authenticator attachment preference.
   * - 'platform': Built-in authenticators (Face ID, Touch ID, Windows Hello)
   * - 'cross-platform': Security keys, phones
   * - undefined: Allow both
   */
  authenticatorAttachment?: AuthenticatorAttachment

  /**
   * Resident key requirement.
   * - 'required': Credential must be stored on authenticator (for usernameless)
   * - 'preferred': Store if possible
   * - 'discouraged': Don't store on authenticator
   * @default 'required'
   */
  residentKey?: ResidentKeyRequirement

  /**
   * User verification requirement.
   * - 'required': Always require PIN/biometric
   * - 'preferred': Use if available
   * - 'discouraged': Skip if possible
   * @default 'preferred'
   */
  userVerification?: UserVerificationRequirement

  /**
   * Attestation conveyance preference.
   * - 'none': Don't request attestation
   * - 'indirect': Let authenticator decide
   * - 'direct': Request full attestation
   * @default 'none'
   */
  attestation?: AttestationConveyancePreference

  /**
   * Supported cryptographic algorithms.
   * @default ES256 (-7), RS256 (-257)
   */
  supportedAlgorithms?: COSEAlgorithmIdentifier[]
}

// ============================================================================
// WebAuthn Standard Types (subset)
// ============================================================================

export type AuthenticatorAttachment = 'platform' | 'cross-platform'
export type ResidentKeyRequirement = 'required' | 'preferred' | 'discouraged'
export type UserVerificationRequirement = 'required' | 'preferred' | 'discouraged'
export type AttestationConveyancePreference = 'none' | 'indirect' | 'direct' | 'enterprise'
export type AuthenticatorTransport = 'usb' | 'nfc' | 'ble' | 'internal' | 'hybrid'

/**
 * COSE algorithm identifiers.
 * @see https://www.iana.org/assignments/cose/cose.xhtml#algorithms
 */
export type COSEAlgorithmIdentifier =
  | -7    // ES256 (ECDSA w/ SHA-256)
  | -35   // ES384 (ECDSA w/ SHA-384)
  | -36   // ES512 (ECDSA w/ SHA-512)
  | -257  // RS256 (RSASSA-PKCS1-v1_5 w/ SHA-256)
  | -258  // RS384
  | -259  // RS512
  | -37   // PS256 (RSASSA-PSS w/ SHA-256)
  | -38   // PS384
  | -39   // PS512
  | -8    // EdDSA

/**
 * Default supported algorithms.
 */
export const DEFAULT_SUPPORTED_ALGORITHMS: COSEAlgorithmIdentifier[] = [-7, -257]

// ============================================================================
// Registration Types
// ============================================================================

/**
 * Options for credential creation (registration).
 */
export interface PublicKeyCredentialCreationOptions {
  /** Challenge bytes (base64url encoded) */
  challenge: string

  /** Relying Party information */
  rp: {
    id?: string
    name: string
  }

  /** User information */
  user: {
    id: string
    name: string
    displayName: string
  }

  /** Supported algorithms */
  pubKeyCredParams: Array<{
    type: 'public-key'
    alg: COSEAlgorithmIdentifier
  }>

  /** Timeout in milliseconds */
  timeout?: number

  /** Exclude existing credentials */
  excludeCredentials?: Array<{
    type: 'public-key'
    id: string
    transports?: AuthenticatorTransport[]
  }>

  /** Authenticator selection criteria */
  authenticatorSelection?: {
    authenticatorAttachment?: AuthenticatorAttachment
    residentKey?: ResidentKeyRequirement
    requireResidentKey?: boolean
    userVerification?: UserVerificationRequirement
  }

  /** Attestation preference */
  attestation?: AttestationConveyancePreference
}

/**
 * Registration response from the authenticator.
 */
export interface RegistrationResponse {
  /** Credential ID (base64url encoded) */
  id: string

  /** Raw credential ID (base64url encoded) */
  rawId: string

  /** Attestation response */
  response: {
    /** Client data JSON (base64url encoded) */
    clientDataJSON: string

    /** Attestation object (base64url encoded CBOR) */
    attestationObject: string

    /** Transports supported by authenticator */
    transports?: AuthenticatorTransport[]
  }

  /** Authenticator attachment used */
  authenticatorAttachment?: AuthenticatorAttachment

  /** Client extension results */
  clientExtensionResults?: Record<string, unknown>

  /** Type (always 'public-key') */
  type: 'public-key'
}

/**
 * Verified registration result.
 */
export interface VerifiedRegistration {
  /** Whether verification succeeded */
  verified: boolean

  /** Registration info if verified */
  registrationInfo?: {
    /** Credential ID (base64url) */
    credentialID: string

    /** Public key (base64url) */
    credentialPublicKey: string

    /** Signature counter */
    counter: number

    /** AAGUID of authenticator */
    aaguid: string

    /** Credential type */
    credentialType: 'public-key'

    /** Transports */
    transports?: AuthenticatorTransport[]

    /** Whether this is a backup-eligible credential */
    credentialBackedUp: boolean

    /** Credential device type */
    credentialDeviceType: 'singleDevice' | 'multiDevice'

    /** Attestation type */
    attestationType: 'none' | 'self' | 'basic' | 'attca'
  }
}

// ============================================================================
// Authentication Types
// ============================================================================

/**
 * Options for credential assertion (authentication).
 */
export interface PublicKeyCredentialRequestOptions {
  /** Challenge bytes (base64url encoded) */
  challenge: string

  /** Relying Party ID */
  rpId?: string

  /** Timeout in milliseconds */
  timeout?: number

  /** Allowed credentials (empty for usernameless/discoverable) */
  allowCredentials?: Array<{
    type: 'public-key'
    id: string
    transports?: AuthenticatorTransport[]
  }>

  /** User verification requirement */
  userVerification?: UserVerificationRequirement
}

/**
 * Authentication response from the authenticator.
 */
export interface AuthenticationResponse {
  /** Credential ID (base64url encoded) */
  id: string

  /** Raw credential ID (base64url encoded) */
  rawId: string

  /** Assertion response */
  response: {
    /** Client data JSON (base64url encoded) */
    clientDataJSON: string

    /** Authenticator data (base64url encoded) */
    authenticatorData: string

    /** Signature (base64url encoded) */
    signature: string

    /** User handle (base64url encoded, may be null) */
    userHandle?: string | null
  }

  /** Authenticator attachment used */
  authenticatorAttachment?: AuthenticatorAttachment

  /** Client extension results */
  clientExtensionResults?: Record<string, unknown>

  /** Type (always 'public-key') */
  type: 'public-key'
}

/**
 * Verified authentication result.
 */
export interface VerifiedAuthentication {
  /** Whether verification succeeded */
  verified: boolean

  /** Authentication info if verified */
  authenticationInfo?: {
    /** Credential ID (base64url) */
    credentialID: string

    /** New signature counter */
    newCounter: number

    /** User handle from response */
    userHandle?: string

    /** Whether user verification was performed */
    userVerified: boolean

    /** Credential device type */
    credentialDeviceType: 'singleDevice' | 'multiDevice'

    /** Whether credential is backed up */
    credentialBackedUp: boolean
  }
}

// ============================================================================
// Storage Types
// ============================================================================

/**
 * Stored credential in database.
 */
export interface StoredCredential {
  /** Credential ID (base64url) */
  id: string

  /** User ID this credential belongs to */
  userId: string

  /** Public key (base64url) */
  publicKey: string

  /** Signature counter (for clone detection) */
  counter: number

  /** Authenticator AAGUID */
  aaguid?: string

  /** Transports */
  transports?: AuthenticatorTransport[]

  /** Whether credential is backed up */
  backedUp: boolean

  /** Device type */
  deviceType: 'singleDevice' | 'multiDevice'

  /** When credential was created */
  createdAt: Date

  /** When credential was last used */
  lastUsedAt?: Date

  /** Friendly name for the credential */
  name?: string
}

/**
 * Credential storage interface.
 */
export interface CredentialStorage {
  /**
   * Save a new credential.
   */
  createCredential(credential: StoredCredential): Promise<void>

  /**
   * Get a credential by ID.
   */
  getCredential(credentialId: string): Promise<StoredCredential | null>

  /**
   * Get all credentials for a user.
   */
  getCredentialsByUser(userId: string): Promise<StoredCredential[]>

  /**
   * Update a credential (e.g., counter, lastUsedAt).
   */
  updateCredential(
    credentialId: string,
    updates: Partial<StoredCredential>
  ): Promise<void>

  /**
   * Delete a credential.
   */
  deleteCredential(credentialId: string): Promise<void>
}

/**
 * Challenge storage interface.
 */
export interface ChallengeStorage {
  /**
   * Store a challenge for verification.
   *
   * @param challenge - Challenge bytes (base64url encoded)
   * @param userId - User ID (for registration) or undefined (for authentication)
   * @param ttl - Time to live in seconds
   */
  storeChallenge(
    challenge: string,
    userId: string | undefined,
    ttl: number
  ): Promise<void>

  /**
   * Verify and consume a challenge.
   *
   * @param challenge - Challenge to verify
   * @returns User ID if stored, undefined for auth, null if not found
   */
  consumeChallenge(challenge: string): Promise<string | undefined | null>
}
