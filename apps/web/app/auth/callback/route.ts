/**
 * Auth Callback Route Handler
 * 
 * Handles OAuth callbacks from authentication providers.
 * Exchanges authorization code for session and redirects to app.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { createRouteHandlerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription)
    
    // Redirect to login with error message
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', error)
    loginUrl.searchParams.set('error_description', errorDescription || 'Authentication failed')
    
    return NextResponse.redirect(loginUrl)
  }

  // Exchange code for session
  if (code) {
    const supabase = await createRouteHandlerClient()
    
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error('Code exchange error:', exchangeError)
      
      // Redirect to login with error
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('error', 'AUTH_CALLBACK_INVALID')
      loginUrl.searchParams.set('error_description', exchangeError.message)
      
      return NextResponse.redirect(loginUrl)
    }

    // Requirement 1.5: Redirect to Room List after successful login
    const redirectTo = requestUrl.searchParams.get('redirectTo') || '/rooms'
    return NextResponse.redirect(new URL(redirectTo, request.url))
  }

  // No code or error - invalid callback
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('error', 'AUTH_CALLBACK_INVALID')
  loginUrl.searchParams.set('error_description', 'Invalid authentication callback')
  
  return NextResponse.redirect(loginUrl)
}
