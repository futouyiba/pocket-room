/**
 * Login Page Tests
 * 
 * Tests for the login page UI and authentication flow.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.8
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginPage from '@/app/login/page'
import * as gateAuth from '@/lib/auth/gate-auth'
import { useSearchParams } from 'next/navigation'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => ({
    get: vi.fn(() => null),
  })),
}))

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({})),
}))

// Mock gate-auth functions
vi.mock('@/lib/auth/gate-auth', () => ({
  signInWithGoogle: vi.fn(),
  signInWithFeishu: vi.fn(),
  signInWithWeChat: vi.fn(),
  sendEmailOTP: vi.fn(),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('UI Rendering', () => {
    it('should render all login options', () => {
      render(<LoginPage />)

      // Check for Google OAuth button - Requirement 1.1
      expect(screen.getByText('Continue with Google')).toBeInTheDocument()

      // Check for Feishu OAuth button - Requirement 1.3
      expect(screen.getByText('Continue with Feishu')).toBeInTheDocument()

      // Check for WeChat button - Requirement 1.4
      expect(screen.getByText('Continue with WeChat')).toBeInTheDocument()

      // Check for Email OTP form - Requirement 1.2
      expect(screen.getByLabelText('Email address')).toBeInTheDocument()
      expect(screen.getByText('Send magic link')).toBeInTheDocument()
    })

    it('should display page title and description', () => {
      render(<LoginPage />)

      expect(screen.getByText('Pocket Room')).toBeInTheDocument()
      expect(screen.getByText('A shared space to think, remember, and build.')).toBeInTheDocument()
      expect(screen.getByText('Sign in to continue')).toBeInTheDocument()
    })
  })

  describe('Google OAuth Login - Requirement 1.1', () => {
    it('should call signInWithGoogle when Google button is clicked', async () => {
      const mockSignInWithGoogle = vi.mocked(gateAuth.signInWithGoogle)
      mockSignInWithGoogle.mockResolvedValue({ url: 'https://google.com/oauth', error: null })

      // Mock window.location.href
      delete (window as any).location
      window.location = { href: '' } as any

      render(<LoginPage />)

      const googleButton = screen.getByText('Continue with Google')
      fireEvent.click(googleButton)

      await waitFor(() => {
        expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1)
      })
    })

    it('should display error when Google OAuth fails', async () => {
      const mockSignInWithGoogle = vi.mocked(gateAuth.signInWithGoogle)
      mockSignInWithGoogle.mockResolvedValue({
        url: null,
        error: {
          code: 'AUTH_OAUTH_FAILED',
          message: 'Google OAuth failed',
          details: null,
        },
      })

      render(<LoginPage />)

      const googleButton = screen.getByText('Continue with Google')
      fireEvent.click(googleButton)

      await waitFor(() => {
        expect(screen.getByText('Google OAuth failed')).toBeInTheDocument()
      })
    })
  })

  describe('Email OTP Login - Requirement 1.2', () => {
    it('should send email OTP when form is submitted', async () => {
      const mockSendEmailOTP = vi.mocked(gateAuth.sendEmailOTP)
      mockSendEmailOTP.mockResolvedValue({ success: true, error: null })

      render(<LoginPage />)

      const emailInput = screen.getByLabelText('Email address')
      const submitButton = screen.getByText('Send magic link')

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockSendEmailOTP).toHaveBeenCalledWith(
          expect.anything(),
          { email: 'test@example.com' }
        )
      })
    })

    it('should display success message after sending email', async () => {
      const mockSendEmailOTP = vi.mocked(gateAuth.sendEmailOTP)
      mockSendEmailOTP.mockResolvedValue({ success: true, error: null })

      render(<LoginPage />)

      const emailInput = screen.getByLabelText('Email address')
      const submitButton = screen.getByText('Send magic link')

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Check your email')).toBeInTheDocument()
        expect(screen.getByText(/We sent a magic link to/)).toBeInTheDocument()
      })
    })

    it('should validate email format', async () => {
      render(<LoginPage />)

      const emailInput = screen.getByLabelText('Email address') as HTMLInputElement
      const submitButton = screen.getByText('Send magic link')

      // Set invalid email
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
      
      // Try to submit - HTML5 validation should prevent submission
      fireEvent.click(submitButton)

      // Check that the email input has the invalid state
      // The browser's built-in validation will prevent form submission
      expect(emailInput.validity.valid).toBe(false)
      expect(emailInput.validity.typeMismatch).toBe(true)
    })
  })

  describe('Feishu OAuth Login - Requirement 1.3', () => {
    it('should call signInWithFeishu when Feishu button is clicked', async () => {
      const mockSignInWithFeishu = vi.mocked(gateAuth.signInWithFeishu)
      mockSignInWithFeishu.mockResolvedValue({ url: 'https://feishu.com/oauth', error: null })

      delete (window as any).location
      window.location = { href: '' } as any

      render(<LoginPage />)

      const feishuButton = screen.getByText('Continue with Feishu')
      fireEvent.click(feishuButton)

      await waitFor(() => {
        expect(mockSignInWithFeishu).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('WeChat Login - Requirement 1.4', () => {
    it('should call signInWithWeChat when WeChat button is clicked', async () => {
      const mockSignInWithWeChat = vi.mocked(gateAuth.signInWithWeChat)
      mockSignInWithWeChat.mockResolvedValue({ url: 'https://wechat.com/oauth', error: null })

      delete (window as any).location
      window.location = { href: '' } as any

      render(<LoginPage />)

      const wechatButton = screen.getByText('Continue with WeChat')
      fireEvent.click(wechatButton)

      await waitFor(() => {
        expect(mockSignInWithWeChat).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Error Handling - Requirement 1.8', () => {
    it('should display error from URL params', () => {
      const mockUseSearchParams = vi.mocked(useSearchParams)
      mockUseSearchParams.mockReturnValue({
        get: vi.fn((key: string) => {
          if (key === 'error') return 'AUTH_FAILED'
          if (key === 'error_description') return 'Authentication failed'
          return null
        }),
      } as any)

      render(<LoginPage />)

      expect(screen.getByText('Authentication failed')).toBeInTheDocument()
    })

    it('should show retry button when error occurs', async () => {
      const mockSignInWithGoogle = vi.mocked(gateAuth.signInWithGoogle)
      mockSignInWithGoogle.mockResolvedValue({
        url: null,
        error: {
          code: 'AUTH_OAUTH_FAILED',
          message: 'OAuth failed',
          details: null,
        },
      })

      render(<LoginPage />)

      const googleButton = screen.getByText('Continue with Google')
      fireEvent.click(googleButton)

      await waitFor(() => {
        expect(screen.getByText('Try again')).toBeInTheDocument()
      })
    })

    it('should clear error when retry is clicked', async () => {
      const mockSignInWithGoogle = vi.mocked(gateAuth.signInWithGoogle)
      mockSignInWithGoogle.mockResolvedValue({
        url: null,
        error: {
          code: 'AUTH_OAUTH_FAILED',
          message: 'OAuth failed',
          details: null,
        },
      })

      render(<LoginPage />)

      const googleButton = screen.getByText('Continue with Google')
      fireEvent.click(googleButton)

      await waitFor(() => {
        expect(screen.getByText('OAuth failed')).toBeInTheDocument()
      })

      const retryButton = screen.getByText('Try again')
      fireEvent.click(retryButton)

      await waitFor(() => {
        expect(screen.queryByText('OAuth failed')).not.toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('should show loading state when Google login is in progress', async () => {
      const mockSignInWithGoogle = vi.mocked(gateAuth.signInWithGoogle)
      mockSignInWithGoogle.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<LoginPage />)

      const googleButton = screen.getByText('Continue with Google')
      fireEvent.click(googleButton)

      await waitFor(() => {
        // Check that all buttons are disabled
        expect(screen.getByText('Continue with Google').closest('button')).toBeDisabled()
        expect(screen.getByText('Continue with Feishu').closest('button')).toBeDisabled()
        expect(screen.getByText('Continue with WeChat').closest('button')).toBeDisabled()
      })
    })

    it('should show loading state when sending email', async () => {
      const mockSendEmailOTP = vi.mocked(gateAuth.sendEmailOTP)
      mockSendEmailOTP.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<LoginPage />)

      const emailInput = screen.getByLabelText('Email address')
      const submitButton = screen.getByText('Send magic link')

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Sending...')).toBeInTheDocument()
      })
    })
  })
})
