import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../password/hash.js'
import { SALT_LENGTH, PBKDF2_KEY_LENGTH } from '../password/constants.js'

describe('Password Hashing', () => {
  describe('hashPassword', () => {
    it('should generate a valid base64 hash', async () => {
      const hash = await hashPassword('password123')

      expect(typeof hash).toBe('string')
      // Should be valid base64
      expect(() => atob(hash)).not.toThrow()
    })

    it('should generate hash with correct length', async () => {
      const hash = await hashPassword('password123')
      const decoded = atob(hash)

      // Salt (16 bytes) + hash (32 bytes) = 48 bytes
      const expectedBytes = SALT_LENGTH + PBKDF2_KEY_LENGTH / 8
      expect(decoded.length).toBe(expectedBytes)
    })

    it('should generate unique salts for each hash', async () => {
      const hash1 = await hashPassword('samepassword')
      const hash2 = await hashPassword('samepassword')

      // Same password should produce different hashes due to random salt
      expect(hash1).not.toBe(hash2)
    })

    it('should handle empty password', async () => {
      const hash = await hashPassword('')

      expect(typeof hash).toBe('string')
      expect(hash.length).toBeGreaterThan(0)
    })

    it('should handle unicode passwords', async () => {
      const hash = await hashPassword('пароль🔒密码')

      expect(typeof hash).toBe('string')
      expect(() => atob(hash)).not.toThrow()
    })

    it('should handle long passwords', async () => {
      const longPassword = 'a'.repeat(10000)
      const hash = await hashPassword(longPassword)

      expect(typeof hash).toBe('string')
      expect(() => atob(hash)).not.toThrow()
    })
  })

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'correctpassword'
      const hash = await hashPassword(password)

      const isValid = await verifyPassword(password, hash)

      expect(isValid).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const hash = await hashPassword('correctpassword')

      const isValid = await verifyPassword('wrongpassword', hash)

      expect(isValid).toBe(false)
    })

    it('should reject password with case mismatch', async () => {
      const hash = await hashPassword('Password')

      const isValid = await verifyPassword('password', hash)

      expect(isValid).toBe(false)
    })

    it('should return false for malformed hash', async () => {
      const isValid = await verifyPassword('password', 'not-valid-base64!!!')

      expect(isValid).toBe(false)
    })

    it('should return false for truncated hash', async () => {
      const hash = await hashPassword('password')
      const truncated = hash.slice(0, 10)

      const isValid = await verifyPassword('password', truncated)

      expect(isValid).toBe(false)
    })

    it('should return false for empty hash', async () => {
      const isValid = await verifyPassword('password', '')

      expect(isValid).toBe(false)
    })

    it('should return false for hash with wrong length', async () => {
      // Create a valid base64 string but wrong length
      const wrongLength = btoa('too short')

      const isValid = await verifyPassword('password', wrongLength)

      expect(isValid).toBe(false)
    })

    it('should handle empty password correctly', async () => {
      const hash = await hashPassword('')

      expect(await verifyPassword('', hash)).toBe(true)
      expect(await verifyPassword('notEmpty', hash)).toBe(false)
    })

    it('should handle unicode passwords correctly', async () => {
      const password = 'пароль🔒密码'
      const hash = await hashPassword(password)

      expect(await verifyPassword(password, hash)).toBe(true)
      expect(await verifyPassword('пароль', hash)).toBe(false)
    })
  })
})
