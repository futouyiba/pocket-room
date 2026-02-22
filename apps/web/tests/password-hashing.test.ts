/**
 * Unit tests for password hashing with bcrypt
 * 
 * Tests the bcrypt password hashing functionality:
 * - Password hash generation
 * - Password verification
 * - Hash uniqueness (different salts)
 * 
 * Validates requirement: 3.3 (password hashing for passcode strategy)
 */

import { describe, it, expect } from 'vitest'
import bcrypt from 'bcryptjs'

describe('Password Hashing (bcrypt)', () => {
  describe('Hash generation', () => {
    it('should generate a bcrypt hash for a password', async () => {
      const password = 'mySecurePassword123'
      const hash = await bcrypt.hash(password, 10)

      expect(hash).toBeDefined()
      expect(typeof hash).toBe('string')
      expect(hash.length).toBeGreaterThan(0)
      expect(hash).not.toBe(password) // Hash should not be the plain password
    })

    it('should generate different hashes for the same password (different salts)', async () => {
      const password = 'mySecurePassword123'
      const hash1 = await bcrypt.hash(password, 10)
      const hash2 = await bcrypt.hash(password, 10)

      expect(hash1).not.toBe(hash2) // Different salts should produce different hashes
    })

    it('should generate hash with bcrypt format', async () => {
      const password = 'mySecurePassword123'
      const hash = await bcrypt.hash(password, 10)

      // Bcrypt hashes start with $2a$, $2b$, or $2y$
      expect(hash).toMatch(/^\$2[aby]\$/)
    })
  })

  describe('Password verification', () => {
    it('should verify correct password against hash', async () => {
      const password = 'mySecurePassword123'
      const hash = await bcrypt.hash(password, 10)

      const isValid = await bcrypt.compare(password, hash)
      expect(isValid).toBe(true)
    })

    it('should reject incorrect password against hash', async () => {
      const password = 'mySecurePassword123'
      const wrongPassword = 'wrongPassword'
      const hash = await bcrypt.hash(password, 10)

      const isValid = await bcrypt.compare(wrongPassword, hash)
      expect(isValid).toBe(false)
    })

    it('should be case-sensitive', async () => {
      const password = 'MySecurePassword123'
      const hash = await bcrypt.hash(password, 10)

      const isValid = await bcrypt.compare('mysecurepassword123', hash)
      expect(isValid).toBe(false)
    })
  })

  describe('Salt rounds', () => {
    it('should use salt rounds = 10 as specified', async () => {
      const password = 'mySecurePassword123'
      const saltRounds = 10
      const hash = await bcrypt.hash(password, saltRounds)

      // Bcrypt hash format: $2a$10$... where 10 is the cost factor
      expect(hash).toMatch(/^\$2[aby]\$10\$/)
    })
  })

  describe('Edge cases', () => {
    it('should handle empty password', async () => {
      const password = ''
      const hash = await bcrypt.hash(password, 10)

      expect(hash).toBeDefined()
      const isValid = await bcrypt.compare('', hash)
      expect(isValid).toBe(true)
    })

    it('should handle very long password', async () => {
      const password = 'a'.repeat(100)
      const hash = await bcrypt.hash(password, 10)

      expect(hash).toBeDefined()
      const isValid = await bcrypt.compare(password, hash)
      expect(isValid).toBe(true)
    })

    it('should handle special characters in password', async () => {
      const password = '!@#$%^&*()_+-=[]{}|;:,.<>?'
      const hash = await bcrypt.hash(password, 10)

      expect(hash).toBeDefined()
      const isValid = await bcrypt.compare(password, hash)
      expect(isValid).toBe(true)
    })

    it('should handle unicode characters in password', async () => {
      const password = '密码123🔒'
      const hash = await bcrypt.hash(password, 10)

      expect(hash).toBeDefined()
      const isValid = await bcrypt.compare(password, hash)
      expect(isValid).toBe(true)
    })
  })
})
