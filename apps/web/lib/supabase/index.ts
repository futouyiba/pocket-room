/**
 * Supabase Module - Public API
 * 
 * Exports Supabase client creation functions and types.
 */

// Client creation functions
export { createClient } from './client'
export {
  createServerComponentClient,
  createRouteHandlerClient,
  createAdminClient,
} from './server'

// Types
export type {
  Database,
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
} from './types'
