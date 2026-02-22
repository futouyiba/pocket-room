/**
 * useAuth Hook
 * 
 * React hook for managing authentication state in client components.
 * Provides access to current user, session, and auth methods.
 * 
 * Requirements: 1.5, 1.6, 1.7
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AuthState, AuthUser, AuthSession } from '@/lib/supabase/types'
import {
  isSessionValid,
  shouldRefreshSession,
} from '@/lib/auth/session'

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    error: null,
  })

  const supabase = createClient()

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          setState({
            user: null,
            session: null,
            isLoading: false,
            error: {
              code: 'AUTH_SESSION_ERROR',
              message: error.message,
            },
          })
          return
        }

        setState({
          user: session?.user || null,
          session: session,
          isLoading: false,
          error: null,
        })

        // Auto-refresh session if needed
        if (session && shouldRefreshSession(session)) {
          await supabase.auth.refreshSession()
        }
      } catch (err) {
        setState({
          user: null,
          session: null,
          isLoading: false,
          error: {
            code: 'AUTH_PROVIDER_UNAVAILABLE',
            message: 'Failed to initialize authentication',
          },
        })
      }
    }

    initializeAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setState({
          user: session?.user || null,
          session: session,
          isLoading: false,
          error: null,
        })

        // Handle session refresh
        if (event === 'TOKEN_REFRESHED') {
          console.log('Session refreshed')
        }

        // Handle sign out
        if (event === 'SIGNED_OUT') {
          setState({
            user: null,
            session: null,
            isLoading: false,
            error: null,
          })
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  // Check if user is authenticated
  const isAuthenticated = useCallback(() => {
    return isSessionValid(state.session)
  }, [state.session])

  // Get user ID
  const getUserId = useCallback(() => {
    return state.user?.id || null
  }, [state.user])

  // Get user email
  const getUserEmail = useCallback(() => {
    return state.user?.email || null
  }, [state.user])

  return {
    user: state.user,
    session: state.session,
    isLoading: state.isLoading,
    error: state.error,
    isAuthenticated,
    getUserId,
    getUserEmail,
  }
}
