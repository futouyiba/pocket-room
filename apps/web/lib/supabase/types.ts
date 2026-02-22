/**
 * Supabase Database Types
 * 
 * Type definitions for the Supabase database schema.
 * These types are used throughout the application for type safety.
 */

import type { User, Session } from '@supabase/supabase-js'

/**
 * Database schema type
 * 
 * This is a placeholder that will be generated from the actual database schema.
 * In production, use: npx supabase gen types typescript --project-id <project-id>
 */
export type Database = {
  public: {
    Tables: {
      // Tables will be defined here
      [key: string]: any
    }
    Views: {
      [key: string]: any
    }
    Functions: {
      [key: string]: any
    }
    Enums: {
      [key: string]: string
    }
  }
}

/**
 * Auth-related types
 */

export type AuthUser = User

export type AuthSession = Session

export interface AuthState {
  user: AuthUser | null
  session: AuthSession | null
  isLoading: boolean
  error: AuthError | null
}

export interface AuthError {
  code: string
  message: string
  details?: any
}

/**
 * OAuth Provider types
 */

export type OAuthProvider = 'google' | 'feishu' | 'wechat'

export interface OAuthConfig {
  provider: OAuthProvider
  redirectTo?: string
  scopes?: string
}

/**
 * Email OTP types
 */

export interface EmailOTPConfig {
  email: string
  options?: {
    emailRedirectTo?: string
    shouldCreateUser?: boolean
  }
}

export interface EmailOTPVerifyConfig {
  email: string
  token: string
  type: 'email'
}

/**
 * User metadata types
 */

export interface UserMetadata {
  display_name?: string
  avatar_url?: string
  created_at?: string
}

/**
 * Session management types
 */

export interface SessionInfo {
  accessToken: string
  refreshToken: string
  expiresAt: number
  user: AuthUser
}
