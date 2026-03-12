/**
 * Gate Auth - User Authentication System
 * 
 * Provides authentication functions for user login via Supabase Auth.
 * Supports: Google OAuth, Email OTP, Feishu OAuth, WeChat OAuth
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Database,
  OAuthProvider,
  OAuthConfig,
  EmailOTPConfig,
  EmailOTPVerifyConfig,
  AuthError,
} from '../supabase/types'

// Type alias for the Supabase client with Database type
type TypedSupabaseClient = SupabaseClient<Database, 'public', any>

/**
 * Sign in with OAuth provider (Google, Feishu, WeChat)
 * 
 * Requirements: 1.1 (Google), 1.3 (Feishu), 1.4 (WeChat)
 * 
 * @param supabase - Supabase client instance
 * @param config - OAuth configuration
 * @returns Promise with OAuth URL or error
 */
export async function signInWithOAuth(
  supabase: TypedSupabaseClient,
  config: OAuthConfig
): Promise<{ url: string | null; error: AuthError | null }> {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: config.provider as any, // Cast to any for custom providers like feishu and wechat
      options: {
        redirectTo: config.redirectTo || `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        scopes: config.scopes,
      },
    })

    if (error) {
      return {
        url: null,
        error: {
          code: 'AUTH_OAUTH_FAILED',
          message: error.message,
          details: error,
        },
      }
    }

    return {
      url: data.url,
      error: null,
    }
  } catch (err) {
    return {
      url: null,
      error: {
        code: 'AUTH_PROVIDER_UNAVAILABLE',
        message: 'OAuth provider is currently unavailable. Please try again later.',
        details: err,
      },
    }
  }
}

/**
 * Sign in with Google OAuth
 * 
 * Requirement: 1.1
 * 
 * @param supabase - Supabase client instance
 * @param redirectTo - Optional redirect URL after authentication
 * @returns Promise with OAuth URL or error
 */
export async function signInWithGoogle(
  supabase: TypedSupabaseClient,
  redirectTo?: string
): Promise<{ url: string | null; error: AuthError | null }> {
  return signInWithOAuth(supabase, {
    provider: 'google',
    redirectTo,
  })
}

/**
 * Sign in with Feishu (Lark) OAuth
 * 
 * Requirement: 1.3
 * 
 * @param supabase - Supabase client instance
 * @param redirectTo - Optional redirect URL after authentication
 * @returns Promise with OAuth URL or error
 */
export async function signInWithFeishu(
  supabase: TypedSupabaseClient,
  redirectTo?: string
): Promise<{ url: string | null; error: AuthError | null }> {
  return signInWithOAuth(supabase, {
    provider: 'feishu' as OAuthProvider,
    redirectTo,
  })
}

/**
 * Sign in with WeChat OAuth
 * 
 * Requirement: 1.4
 * 
 * @param supabase - Supabase client instance
 * @param redirectTo - Optional redirect URL after authentication
 * @returns Promise with OAuth URL or error
 */
export async function signInWithWeChat(
  supabase: TypedSupabaseClient,
  redirectTo?: string
): Promise<{ url: string | null; error: AuthError | null }> {
  return signInWithOAuth(supabase, {
    provider: 'wechat' as OAuthProvider,
    redirectTo,
  })
}

/**
 * Send Email OTP (One-Time Password)
 * 
 * Requirement: 1.2
 * 
 * @param supabase - Supabase client instance
 * @param config - Email OTP configuration
 * @returns Promise with success status or error
 */
export async function sendEmailOTP(
  supabase: TypedSupabaseClient,
  config: EmailOTPConfig
): Promise<{ success: boolean; error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: config.email,
      options: {
        emailRedirectTo: config.options?.emailRedirectTo || `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        shouldCreateUser: config.options?.shouldCreateUser ?? true,
      },
    })

    if (error) {
      return {
        success: false,
        error: {
          code: 'AUTH_EMAIL_OTP_FAILED',
          message: error.message,
          details: error,
        },
      }
    }

    return {
      success: true,
      error: null,
    }
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'AUTH_PROVIDER_UNAVAILABLE',
        message: 'Email service is currently unavailable. Please try again later.',
        details: err,
      },
    }
  }
}

/**
 * Verify Email OTP
 * 
 * Requirement: 1.2
 * 
 * @param supabase - Supabase client instance
 * @param config - Email OTP verification configuration
 * @returns Promise with success status or error
 */
export async function verifyEmailOTP(
  supabase: TypedSupabaseClient,
  config: EmailOTPVerifyConfig
): Promise<{ success: boolean; error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.verifyOtp({
      email: config.email,
      token: config.token,
      type: config.type,
    })

    if (error) {
      return {
        success: false,
        error: {
          code: 'AUTH_OTP_INVALID',
          message: error.message,
          details: error,
        },
      }
    }

    return {
      success: true,
      error: null,
    }
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'AUTH_PROVIDER_UNAVAILABLE',
        message: 'Verification service is currently unavailable. Please try again later.',
        details: err,
      },
    }
  }
}

/**
 * Sign out current user
 * 
 * @param supabase - Supabase client instance
 * @returns Promise with success status or error
 */
export async function signOut(
  supabase: TypedSupabaseClient
): Promise<{ success: boolean; error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.signOut()

    if (error) {
      return {
        success: false,
        error: {
          code: 'AUTH_SIGNOUT_FAILED',
          message: error.message,
          details: error,
        },
      }
    }

    return {
      success: true,
      error: null,
    }
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'AUTH_PROVIDER_UNAVAILABLE',
        message: 'Sign out failed. Please try again.',
        details: err,
      },
    }
  }
}

/**
 * Get current session
 * 
 * Requirement: 1.6 (Session persistence)
 * 
 * @param supabase - Supabase client instance
 * @returns Promise with session or null
 */
export async function getSession(supabase: TypedSupabaseClient) {
  try {
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      return {
        session: null,
        error: {
          code: 'AUTH_SESSION_ERROR',
          message: error.message,
          details: error,
        },
      }
    }

    return {
      session: data.session,
      error: null,
    }
  } catch (err) {
    return {
      session: null,
      error: {
        code: 'AUTH_PROVIDER_UNAVAILABLE',
        message: 'Failed to retrieve session.',
        details: err,
      },
    }
  }
}

/**
 * Get current user
 * 
 * @param supabase - Supabase client instance
 * @returns Promise with user or null
 */
export async function getUser(supabase: TypedSupabaseClient) {
  try {
    const { data, error } = await supabase.auth.getUser()

    if (error) {
      return {
        user: null,
        error: {
          code: 'AUTH_USER_ERROR',
          message: error.message,
          details: error,
        },
      }
    }

    return {
      user: data.user,
      error: null,
    }
  } catch (err) {
    return {
      user: null,
      error: {
        code: 'AUTH_PROVIDER_UNAVAILABLE',
        message: 'Failed to retrieve user.',
        details: err,
      },
    }
  }
}

/**
 * Refresh session
 * 
 * Requirement: 1.6 (Session persistence across browser close)
 * 
 * @param supabase - Supabase client instance
 * @returns Promise with refreshed session or error
 */
export async function refreshSession(supabase: TypedSupabaseClient) {
  try {
    const { data, error } = await supabase.auth.refreshSession()

    if (error) {
      return {
        session: null,
        error: {
          code: 'AUTH_SESSION_EXPIRED',
          message: error.message,
          details: error,
        },
      }
    }

    return {
      session: data.session,
      error: null,
    }
  } catch (err) {
    return {
      session: null,
      error: {
        code: 'AUTH_PROVIDER_UNAVAILABLE',
        message: 'Failed to refresh session.',
        details: err,
      },
    }
  }
}
