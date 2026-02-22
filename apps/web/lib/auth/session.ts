/**
 * Session Management Utilities
 * 
 * Provides utility functions for managing user sessions.
 * Handles session validation, expiration checks, and persistence.
 * 
 * Requirements: 1.5, 1.6, 1.7
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { AuthSession, SessionInfo } from '../supabase/types'

/**
 * Check if session is valid and not expired
 * 
 * @param session - Auth session to validate
 * @returns true if session is valid and not expired
 */
export function isSessionValid(session: AuthSession | null): boolean {
  if (!session) {
    return false
  }

  // Check if session has required fields
  if (!session.access_token || !session.user) {
    return false
  }

  // Check if session is expired
  if (session.expires_at) {
    const expiresAt = session.expires_at * 1000 // Convert to milliseconds
    const now = Date.now()
    
    // Session is expired if current time is past expiration
    if (now >= expiresAt) {
      return false
    }
  }

  return true
}

/**
 * Check if session is about to expire (within 5 minutes)
 * 
 * @param session - Auth session to check
 * @returns true if session expires within 5 minutes
 */
export function isSessionExpiringSoon(session: AuthSession | null): boolean {
  if (!session || !session.expires_at) {
    return false
  }

  const expiresAt = session.expires_at * 1000 // Convert to milliseconds
  const now = Date.now()
  const fiveMinutes = 5 * 60 * 1000

  return (expiresAt - now) <= fiveMinutes
}

/**
 * Get session info for client-side use
 * 
 * @param session - Auth session
 * @returns Session info object or null
 */
export function getSessionInfo(session: AuthSession | null): SessionInfo | null {
  if (!session || !isSessionValid(session)) {
    return null
  }

  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token || '',
    expiresAt: session.expires_at || 0,
    user: session.user,
  }
}

/**
 * Check if user is authenticated
 * 
 * Requirement: 1.7 (Redirect unauthenticated users)
 * 
 * @param supabase - Supabase client instance
 * @returns Promise with authentication status
 */
export async function isAuthenticated(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession()
    return isSessionValid(data.session)
  } catch {
    return false
  }
}

/**
 * Require authentication - throws error if not authenticated
 * 
 * Requirement: 1.7 (Protect routes)
 * 
 * @param supabase - Supabase client instance
 * @throws Error if user is not authenticated
 */
export async function requireAuth(supabase: SupabaseClient): Promise<void> {
  const authenticated = await isAuthenticated(supabase)
  
  if (!authenticated) {
    throw new Error('AUTH_UNAUTHORIZED')
  }
}

/**
 * Get user ID from session
 * 
 * @param session - Auth session
 * @returns User ID or null
 */
export function getUserId(session: AuthSession | null): string | null {
  if (!session || !isSessionValid(session)) {
    return null
  }

  return session.user.id
}

/**
 * Get user email from session
 * 
 * @param session - Auth session
 * @returns User email or null
 */
export function getUserEmail(session: AuthSession | null): string | null {
  if (!session || !isSessionValid(session)) {
    return null
  }

  return session.user.email || null
}

/**
 * Check if session needs refresh
 * 
 * Requirement: 1.6 (Session persistence)
 * 
 * @param session - Auth session
 * @returns true if session should be refreshed
 */
export function shouldRefreshSession(session: AuthSession | null): boolean {
  if (!session) {
    return false
  }

  // Refresh if session is expiring soon
  return isSessionExpiringSoon(session)
}

/**
 * Format session expiration time
 * 
 * @param session - Auth session
 * @returns Formatted expiration time or null
 */
export function getSessionExpirationTime(session: AuthSession | null): Date | null {
  if (!session || !session.expires_at) {
    return null
  }

  return new Date(session.expires_at * 1000)
}

/**
 * Calculate time until session expires (in seconds)
 * 
 * @param session - Auth session
 * @returns Seconds until expiration or null
 */
export function getTimeUntilExpiration(session: AuthSession | null): number | null {
  if (!session || !session.expires_at) {
    return null
  }

  const expiresAt = session.expires_at * 1000
  const now = Date.now()
  const diff = expiresAt - now

  return Math.max(0, Math.floor(diff / 1000))
}
