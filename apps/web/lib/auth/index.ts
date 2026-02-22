/**
 * Auth Module - Public API
 * 
 * Exports all authentication-related functions and types.
 */

// Gate Auth functions
export {
  signInWithOAuth,
  signInWithGoogle,
  signInWithFeishu,
  signInWithWeChat,
  sendEmailOTP,
  verifyEmailOTP,
  signOut,
  getSession,
  getUser,
  refreshSession,
} from './gate-auth'

// Session management functions
export {
  isSessionValid,
  isSessionExpiringSoon,
  getSessionInfo,
  isAuthenticated,
  requireAuth,
  getUserId,
  getUserEmail,
  shouldRefreshSession,
  getSessionExpirationTime,
  getTimeUntilExpiration,
} from './session'

// Re-export types
export type {
  AuthUser,
  AuthSession,
  AuthState,
  AuthError,
  OAuthProvider,
  OAuthConfig,
  EmailOTPConfig,
  EmailOTPVerifyConfig,
  UserMetadata,
  SessionInfo,
} from '../supabase/types'
