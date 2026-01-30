import { describe, it, expect } from 'vitest'
import { generateToken, generateUrlSafeToken } from '../password/token.js'
import { DEFAULT_TOKEN_BYTES } from '../password/constants.js'

describe('Token Generation', () => {
  describe('generateToken (hex)', () => {
    it('should generate hex string with correct length', () => {
      const token = generateToken()

      // 32 bytes = 64 hex characters
      expect(token.length).toBe(DEFAULT_TOKEN_BYTES * 2)
    })

    it('should only contain hex characters', () => {
      const token = generateToken()

      expect(token).toMatch(/^[0-9a-f]+$/)
    })

    it('should generate unique tokens', () => {
      const tokens = new Set<string>()
      for (let i = 0; i < 100; i++) {
        tokens.add(generateToken())
      }
      expect(tokens.size).toBe(100)
    })

    it('should respect custom byte length', () => {
      const token16 = generateToken(16)
      const token64 = generateToken(64)

      expect(token16.length).toBe(32) // 16 bytes = 32 hex chars
      expect(token64.length).toBe(128) // 64 bytes = 128 hex chars
    })

    it('should handle edge case of 1 byte', () => {
      const token = generateToken(1)

      expect(token.length).toBe(2)
      expect(token).toMatch(/^[0-9a-f]{2}$/)
    })
  })

  describe('generateUrlSafeToken', () => {
    it('should generate URL-safe base64 string', () => {
      const token = generateUrlSafeToken()

      // Should not contain standard base64 special chars
      expect(token).not.toMatch(/[+/=]/)
    })

    it('should generate correct length', () => {
      const token = generateUrlSafeToken()

      // 32 bytes base64 encoded = 43 characters (without padding)
      expect(token.length).toBe(43)
    })

    it('should only contain URL-safe characters', () => {
      const token = generateUrlSafeToken()

      // URL-safe base64 uses A-Z, a-z, 0-9, -, _
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
    })

    it('should generate unique tokens', () => {
      const tokens = new Set<string>()
      for (let i = 0; i < 100; i++) {
        tokens.add(generateUrlSafeToken())
      }
      expect(tokens.size).toBe(100)
    })

    it('should respect custom byte length', () => {
      const token16 = generateUrlSafeToken(16)
      const token64 = generateUrlSafeToken(64)

      // 16 bytes base64 = 22 chars (without padding)
      expect(token16.length).toBe(22)
      // 64 bytes base64 = 86 chars (without padding)
      expect(token64.length).toBe(86)
    })

    it('should generate different tokens each call', () => {
      const token1 = generateUrlSafeToken()
      const token2 = generateUrlSafeToken()

      expect(token1).not.toBe(token2)
    })
  })
})
