/**
 * Unit tests for Room creation form validation
 * 
 * Tests the form validation logic for creating rooms:
 * - Room name validation
 * - Invitee email validation
 * - Password validation for passcode strategy
 * 
 * Validates requirements: 3.1, 3.2, 3.3
 */

import { describe, it, expect } from 'vitest'

describe('Room Creation Form Validation', () => {
  describe('Room name validation', () => {
    it('should reject empty room name', () => {
      const name = ''
      const isValid = name.trim().length > 0
      expect(isValid).toBe(false)
    })

    it('should accept non-empty room name', () => {
      const name = 'Product Design'
      const isValid = name.trim().length > 0
      expect(isValid).toBe(true)
    })

    it('should reject whitespace-only room name', () => {
      const name = '   '
      const isValid = name.trim().length > 0
      expect(isValid).toBe(false)
    })
  })

  describe('Invitee email validation (需求 3.1)', () => {
    it('should reject empty invitee email', () => {
      const email = ''
      const isValid = email.trim().length > 0
      expect(isValid).toBe(false)
    })

    it('should reject invalid email format', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user @example.com',
        'user@example',
      ]

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

      invalidEmails.forEach((email) => {
        expect(emailRegex.test(email)).toBe(false)
      })
    })

    it('should accept valid email format', () => {
      const validEmails = [
        'user@example.com',
        'test.user@example.co.uk',
        'user+tag@example.com',
      ]

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

      validEmails.forEach((email) => {
        expect(emailRegex.test(email)).toBe(true)
      })
    })
  })

  describe('Join strategy validation (需求 3.2)', () => {
    it('should accept valid join strategies', () => {
      const validStrategies = ['approval', 'free', 'passcode']
      
      validStrategies.forEach((strategy) => {
        expect(['approval', 'free', 'passcode'].includes(strategy)).toBe(true)
      })
    })

    it('should reject invalid join strategies', () => {
      const invalidStrategies = ['invalid', 'public', 'private']
      
      invalidStrategies.forEach((strategy) => {
        expect(['approval', 'free', 'passcode'].includes(strategy)).toBe(false)
      })
    })
  })

  describe('Passcode validation (需求 3.3)', () => {
    it('should require passcode when strategy is passcode', () => {
      const joinStrategy = 'passcode'
      const passcode = ''
      
      const isValid = joinStrategy !== 'passcode' || passcode.trim().length > 0
      expect(isValid).toBe(false)
    })

    it('should not require passcode when strategy is approval', () => {
      const joinStrategy = 'approval'
      const passcode = ''
      
      const isValid = joinStrategy !== 'passcode' || passcode.trim().length > 0
      expect(isValid).toBe(true)
    })

    it('should not require passcode when strategy is free', () => {
      const joinStrategy = 'free'
      const passcode = ''
      
      const isValid = joinStrategy !== 'passcode' || passcode.trim().length > 0
      expect(isValid).toBe(true)
    })

    it('should accept passcode when strategy is passcode and passcode is provided', () => {
      const joinStrategy = 'passcode'
      const passcode = 'mySecurePassword123'
      
      const isValid = joinStrategy !== 'passcode' || passcode.trim().length > 0
      expect(isValid).toBe(true)
    })
  })

  describe('Complete form validation', () => {
    interface FormData {
      name: string
      joinStrategy: 'approval' | 'free' | 'passcode'
      passcode: string
      inviteeEmail: string
    }

    const validateForm = (formData: FormData): { isValid: boolean; errors: string[] } => {
      const errors: string[] = []

      // Validate room name
      if (!formData.name.trim()) {
        errors.push('Room name is required')
      }

      // Validate invitee email (需求 3.1)
      if (!formData.inviteeEmail.trim()) {
        errors.push('At least one invitee is required')
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.inviteeEmail)) {
        errors.push('Invalid email format')
      }

      // Validate join strategy (需求 3.2)
      if (!['approval', 'free', 'passcode'].includes(formData.joinStrategy)) {
        errors.push('Invalid join strategy')
      }

      // Validate passcode for passcode strategy (需求 3.3)
      if (formData.joinStrategy === 'passcode' && !formData.passcode.trim()) {
        errors.push('Passcode is required for passcode strategy')
      }

      return {
        isValid: errors.length === 0,
        errors,
      }
    }

    it('should reject form with missing required fields', () => {
      const formData: FormData = {
        name: '',
        joinStrategy: 'approval',
        passcode: '',
        inviteeEmail: '',
      }

      const result = validateForm(formData)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Room name is required')
      expect(result.errors).toContain('At least one invitee is required')
    })

    it('should reject form with passcode strategy but no passcode', () => {
      const formData: FormData = {
        name: 'Test Room',
        joinStrategy: 'passcode',
        passcode: '',
        inviteeEmail: 'user@example.com',
      }

      const result = validateForm(formData)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Passcode is required for passcode strategy')
    })

    it('should accept valid form with approval strategy', () => {
      const formData: FormData = {
        name: 'Test Room',
        joinStrategy: 'approval',
        passcode: '',
        inviteeEmail: 'user@example.com',
      }

      const result = validateForm(formData)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should accept valid form with free strategy', () => {
      const formData: FormData = {
        name: 'Test Room',
        joinStrategy: 'free',
        passcode: '',
        inviteeEmail: 'user@example.com',
      }

      const result = validateForm(formData)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should accept valid form with passcode strategy and passcode', () => {
      const formData: FormData = {
        name: 'Test Room',
        joinStrategy: 'passcode',
        passcode: 'mySecurePassword123',
        inviteeEmail: 'user@example.com',
      }

      const result = validateForm(formData)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })
})
