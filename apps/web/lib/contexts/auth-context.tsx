/**
 * Authentication Context
 * 
 * Provides authentication state and methods throughout the application.
 * Wraps the useAuth hook in a React Context for easy access in any component.
 * 
 * Requirements: 1.5, 1.6, 1.7
 */

'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import type { AuthUser, AuthSession, AuthError } from '@/lib/supabase/types'

/**
 * Authentication context value type
 */
interface AuthContextValue {
  /** Current authenticated user */
  user: AuthUser | null
  /** Current session */
  session: AuthSession | null
  /** Loading state */
  isLoading: boolean
  /** Authentication error */
  error: AuthError | null
  /** Check if user is authenticated */
  isAuthenticated: () => boolean
  /** Get current user ID */
  getUserId: () => string | null
  /** Get current user email */
  getUserEmail: () => string | null
}

/**
 * Authentication context
 */
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/**
 * Authentication provider props
 */
interface AuthProviderProps {
  children: ReactNode
}

/**
 * Authentication Provider Component
 * 
 * Wraps the application to provide authentication state to all components.
 * 
 * Requirements:
 * - 1.5: Session creation and redirect after successful authentication
 * - 1.6: Session persistence across browser close (handled by Supabase)
 * - 1.7: Redirect unauthenticated users (handled by middleware)
 * 
 * @example
 * ```tsx
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 * ```
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const auth = useAuth()

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to access authentication context
 * 
 * Must be used within an AuthProvider.
 * 
 * @throws Error if used outside of AuthProvider
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, isAuthenticated } = useAuthContext()
 *   
 *   if (!isAuthenticated()) {
 *     return <div>Please log in</div>
 *   }
 *   
 *   return <div>Welcome, {user?.email}</div>
 * }
 * ```
 */
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext)
  
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  
  return context
}
