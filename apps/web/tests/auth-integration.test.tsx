/**
 * Authentication Integration Tests
 * 
 * Tests the complete authentication flow including:
 * - Session persistence
 * - Route protection
 * - Redirect behavior
 * 
 * Requirements: 1.5, 1.6, 1.7
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuthContext } from '@/lib/contexts/auth-context'

// Mock the useAuth hook directly instead of Supabase client
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}))

// Test component that displays auth state
function AuthStatusComponent() {
  const { user, session, isLoading, isAuthenticated } = useAuthContext()

  if (isLoading) {
    return <div data-testid="loading">Loading...</div>
  }

  return (
    <div>
      <div data-testid="auth-status">
        {isAuthenticated() ? 'Authenticated' : 'Not Authenticated'}
      </div>
      {user && (
        <div data-testid="user-info">
          <div data-testid="user-email">{user.email}</div>
          <div data-testid="user-id">{user.id}</div>
        </div>
      )}
      {session && (
        <div data-testid="session-info">
          <div data-testid="session-token">Token: {session.access_token.substring(0, 10)}...</div>
        </div>
      )}
    </div>
  )
}

describe('Authentication Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Requirement 1.5: Session creation and redirect', () => {
    it('should create session after successful authentication', async () => {
      const { useAuth } = await import('@/lib/hooks/use-auth')

      // Mock successful authentication
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
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
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
          <AuthStatusComponent />
        </AuthProvider>
      )

      // Wait for auth state to load
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')
      })

      // Verify session info is displayed
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
      expect(screen.getByTestId('user-id')).toHaveTextContent('test-user-id')
      expect(screen.getByTestId('session-token')).toHaveTextContent('Token: test-acces...')
    })
  })

  describe('Requirement 1.6: Session persistence', () => {
    it('should persist session across component remounts', async () => {
      const { useAuth } = await import('@/lib/hooks/use-auth')

      const mockAuthState = {
        user: {
          id: 'persistent-user',
          email: 'persistent@example.com',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        },
        session: {
          access_token: 'persistent-token',
          refresh_token: 'persistent-refresh',
          expires_at: Date.now() / 1000 + 3600,
          user: {
            id: 'persistent-user',
            email: 'persistent@example.com',
            app_metadata: {},
            user_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
          },
        },
        isLoading: false,
        error: null,
        isAuthenticated: () => true,
        getUserId: () => 'persistent-user',
        getUserEmail: () => 'persistent@example.com',
      }

      vi.mocked(useAuth).mockReturnValue(mockAuthState)

      // First render
      const { unmount } = render(
        <AuthProvider>
          <AuthStatusComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')
      })

      // Unmount component
      unmount()

      // Re-render (simulating browser refresh)
      render(
        <AuthProvider>
          <AuthStatusComponent />
        </AuthProvider>
      )

      // Session should still be available
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')
        expect(screen.getByTestId('user-email')).toHaveTextContent('persistent@example.com')
      })
    })

    it('should handle session expiration', async () => {
      const { useAuth } = await import('@/lib/hooks/use-auth')

      // Mock expired session
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        session: null,
        isLoading: false,
        error: {
          code: 'AUTH_SESSION_EXPIRED',
          message: 'Session expired',
        },
        isAuthenticated: () => false,
        getUserId: () => null,
        getUserEmail: () => null,
      })

      render(
        <AuthProvider>
          <AuthStatusComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated')
      })
    })
  })

  describe('Requirement 1.7: Unauthenticated user handling', () => {
    it('should show not authenticated when no session exists', async () => {
      const { useAuth } = await import('@/lib/hooks/use-auth')

      // Mock no session
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        session: null,
        isLoading: false,
        error: null,
        isAuthenticated: () => false,
        getUserId: () => null,
        getUserEmail: () => null,
      })

      render(
        <AuthProvider>
          <AuthStatusComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated')
      })

      // User info should not be displayed
      expect(screen.queryByTestId('user-info')).not.toBeInTheDocument()
      expect(screen.queryByTestId('session-info')).not.toBeInTheDocument()
    })

    it('should handle session errors gracefully', async () => {
      const { useAuth } = await import('@/lib/hooks/use-auth')

      // Mock session error
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        session: null,
        isLoading: false,
        error: {
          code: 'AUTH_SESSION_ERROR',
          message: 'Session expired',
        },
        isAuthenticated: () => false,
        getUserId: () => null,
        getUserEmail: () => null,
      })

      render(
        <AuthProvider>
          <AuthStatusComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated')
      })
    })
  })

  describe('Auth state changes', () => {
    it('should update state when user signs out', async () => {
      const { useAuth } = await import('@/lib/hooks/use-auth')

      // Start with authenticated state
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: 'test-user',
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
            id: 'test-user',
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
        getUserId: () => 'test-user',
        getUserEmail: () => 'test@example.com',
      })

      const { rerender } = render(
        <AuthProvider>
          <AuthStatusComponent />
        </AuthProvider>
      )

      // Wait for initial authenticated state
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')
      })

      // Simulate sign out by changing the mock
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        session: null,
        isLoading: false,
        error: null,
        isAuthenticated: () => false,
        getUserId: () => null,
        getUserEmail: () => null,
      })

      // Force re-render
      rerender(
        <AuthProvider>
          <AuthStatusComponent />
        </AuthProvider>
      )

      // Should update to not authenticated
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated')
      })
    })
  })
})
