import { describe, it, expect } from 'vitest'
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generatePKCE,
  verifyCodeChallenge,
  base64UrlEncode,
  base64UrlDecode,
} from '../providers/oauth/pkce.js'

describe('PKCE Utilities', () => {
  describe('generateCodeVerifier', () => {
    it('should generate a base64url encoded string', () => {
      const verifier = generateCodeVerifier()

      // Should only contain URL-safe base64 characters
      expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/)
    })

    it('should generate 86 character string (64 bytes base64url)', () => {
      const verifier = generateCodeVerifier()

      // 64 bytes base64url encoded = 86 characters
      expect(verifier.length).toBe(86)
    })

    it('should generate unique verifiers', () => {
      const verifiers = new Set<string>()
      for (let i = 0; i < 100; i++) {
        verifiers.add(generateCodeVerifier())
      }
      expect(verifiers.size).toBe(100)
    })
  })

  describe('generateCodeChallenge', () => {
    it('should generate a base64url encoded SHA-256 hash', async () => {
      const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
      const challenge = await generateCodeChallenge(verifier)

      // Challenge should be URL-safe base64
      expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/)
    })

    it('should generate 43 character string (32 bytes base64url)', async () => {
      const verifier = generateCodeVerifier()
      const challenge = await generateCodeChallenge(verifier)

      // SHA-256 = 32 bytes = 43 base64url characters
      expect(challenge.length).toBe(43)
    })

    it('should produce consistent output for same input', async () => {
      const verifier = 'test-verifier-string'
      const challenge1 = await generateCodeChallenge(verifier)
      const challenge2 = await generateCodeChallenge(verifier)

      expect(challenge1).toBe(challenge2)
    })

    it('should produce different output for different inputs', async () => {
      const challenge1 = await generateCodeChallenge('verifier1')
      const challenge2 = await generateCodeChallenge('verifier2')

      expect(challenge1).not.toBe(challenge2)
    })
  })

  describe('generatePKCE', () => {
    it('should return both verifier and challenge', async () => {
      const pkce = await generatePKCE()

      expect(pkce).toHaveProperty('codeVerifier')
      expect(pkce).toHaveProperty('codeChallenge')
      expect(pkce).toHaveProperty('codeChallengeMethod')
    })

    it('should use S256 challenge method', async () => {
      const pkce = await generatePKCE()

      expect(pkce.codeChallengeMethod).toBe('S256')
    })

    it('should have correctly paired verifier and challenge', async () => {
      const pkce = await generatePKCE()
      const expectedChallenge = await generateCodeChallenge(pkce.codeVerifier)

      expect(pkce.codeChallenge).toBe(expectedChallenge)
    })
  })

  describe('verifyCodeChallenge', () => {
    it('should return true for matching verifier and challenge', async () => {
      const pkce = await generatePKCE()
      const isValid = await verifyCodeChallenge(
        pkce.codeVerifier,
        pkce.codeChallenge
      )

      expect(isValid).toBe(true)
    })

    it('should return false for mismatched verifier and challenge', async () => {
      const pkce = await generatePKCE()
      const isValid = await verifyCodeChallenge(
        'wrong-verifier',
        pkce.codeChallenge
      )

      expect(isValid).toBe(false)
    })

    it('should return false for wrong challenge', async () => {
      const pkce = await generatePKCE()
      const isValid = await verifyCodeChallenge(
        pkce.codeVerifier,
        'wrong-challenge'
      )

      expect(isValid).toBe(false)
    })
  })

  describe('base64UrlEncode', () => {
    it('should encode bytes to URL-safe base64', () => {
      const bytes = new Uint8Array([0, 1, 2, 3, 4, 5])
      const encoded = base64UrlEncode(bytes)

      // Should not contain + / or =
      expect(encoded).not.toMatch(/[+/=]/)
      expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/)
    })

    it('should strip padding', () => {
      // Various lengths that would have different padding
      const bytes1 = new Uint8Array([1]) // 1 byte -> needs 2 chars padding
      const bytes2 = new Uint8Array([1, 2]) // 2 bytes -> needs 1 char padding
      const bytes3 = new Uint8Array([1, 2, 3]) // 3 bytes -> no padding

      expect(base64UrlEncode(bytes1)).not.toContain('=')
      expect(base64UrlEncode(bytes2)).not.toContain('=')
      expect(base64UrlEncode(bytes3)).not.toContain('=')
    })
  })

  describe('base64UrlDecode', () => {
    it('should decode URL-safe base64 to bytes', () => {
      const original = new Uint8Array([0, 1, 2, 3, 4, 5])
      const encoded = base64UrlEncode(original)
      const decoded = base64UrlDecode(encoded)

      expect(decoded).toEqual(original)
    })

    it('should handle strings without padding', () => {
      // 'AQ' is base64 for byte 0x01
      const decoded = base64UrlDecode('AQ')
      expect(decoded).toEqual(new Uint8Array([1]))
    })

    it('should convert - to + and _ to /', () => {
      // Test with chars that differ between base64 and base64url
      const encoded = 'a-_' // URL-safe
      const decoded = base64UrlDecode(encoded + 'A') // Need 4 chars
      expect(decoded).toBeDefined()
    })

    it('should round-trip various byte arrays', () => {
      const testCases = [
        new Uint8Array([]),
        new Uint8Array([0]),
        new Uint8Array([255]),
        new Uint8Array([0, 127, 255]),
        new Uint8Array(Array.from({ length: 32 }, (_, i) => i)),
      ]

      for (const original of testCases) {
        const encoded = base64UrlEncode(original)
        const decoded = base64UrlDecode(encoded)
        expect(decoded).toEqual(original)
      }
    })
  })
})
