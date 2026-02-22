/**
 * OAuth Callback API Route
 * 
 * Handles OAuth 2.0 callback, validates state, exchanges code for tokens.
 * Implements requirements: 2.1, 2.2 (OAuth with PKCE and state validation)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/server';
import { getProvider } from '@/lib/provider-binding/providers';
import { getOAuthState, clearOAuthState } from '@/lib/provider-binding/state-manager';
import { createConnection } from '@/lib/provider-binding/connection-store';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createServerComponentClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    // Parse callback parameters
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    // Handle OAuth error
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/settings?error=${encodeURIComponent(error)}`, request.url)
      );
    }
    
    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/settings?error=invalid_callback', request.url)
      );
    }
    
    // Retrieve stored OAuth state
    const oauthState = getOAuthState(state);
    
    if (!oauthState) {
      return NextResponse.redirect(
        new URL('/settings?error=invalid_state', request.url)
      );
    }
    
    // Validate state matches
    if (oauthState.state !== state) {
      clearOAuthState(state);
      return NextResponse.redirect(
        new URL('/settings?error=state_mismatch', request.url)
      );
    }
    
    // Get provider implementation
    const authProvider = getProvider(oauthState.provider);
    
    // Handle OAuth callback (exchange code for tokens)
    const connectionData = await authProvider.handleCallback(
      code,
      state,
      oauthState.codeVerifier
    );
    
    // Create connection in database (with token encryption)
    const connection = await createConnection(
      session.user.id,
      oauthState.provider,
      connectionData.accessToken,
      Math.floor((connectionData.expiresAt.getTime() - Date.now()) / 1000),
      {
        refreshToken: connectionData.refreshToken,
        accountId: connectionData.accountId,
        scopes: connectionData.scopes,
        metadata: connectionData.metadata,
      }
    );
    
    // Clear OAuth state
    clearOAuthState(state);
    
    // Redirect to settings with success message
    return NextResponse.redirect(
      new URL('/settings?success=provider_connected', request.url)
    );
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/settings?error=callback_failed', request.url)
    );
  }
}
