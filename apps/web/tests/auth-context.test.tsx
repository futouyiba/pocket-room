/**
 * Authentication Context Tests
 * 
 * Tests for the AuthContext provider and useAuthContext hook.
 * 
 * Requirements: 1.5, 1.6, 1.7
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuthContext } from '@/lib/contexts/auth-context'

// Mock the useAuth hook
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    session: null,
    isLoading: false,
    error: null,
    isAuthenticated: () => false,
    getUserId: () => null,
    getUserEmail: () => null,
  })),
}))

// Test component that uses the auth context
function TestComponent() {
  const { user, isAuthenticated, getUserId, getUserEmail } = useAuthContext()
  
  return (
    <div>
      <div data-testid="user-status">
        {isAuthenticated() ? 'Authenticated' : 'Not authenticated'}
      </div>
      <div data-testid="user-id">{getUserId() || 'No ID'}</div>
      <div data-testid="user-email">{getUserEmail() || 'No email'}</div>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should provide authentication state to child components', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('user-status')).toHaveTextContent('Not authenticated')
    expect(screen.getByTestId('user-id')).toHaveTextContent('No ID')
    expect(screen.getByTestId('user-email')).toHaveTextContent('No email')
  })

  it('should throw error when useAuthContext is used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useAuthContext must be used within an AuthProvider')

    consoleError.mockRestore()
  })

  it('should provide authenticated user state when logged in', async () => {
    const { useAuth } = await import('@/lib/hooks/use-auth')
    
    // Mock authenticated state
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      },
      session: {
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        expires_at: Date.now() / 1000 + 3600,
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        },
      },
      isLoading: false,
      error: null,
      isAuthenticated: () => true,
      getUserId: () => 'test-user-id',
      getUserEmail: () => 'test@example.com',
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Authenticated')
      expect(screen.getByTestId('user-id')).toHaveTextContent('test-user-id')
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
    })
  })
})
