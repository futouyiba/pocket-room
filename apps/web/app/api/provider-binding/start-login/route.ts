/**
 * Start OAuth Login API Route
 * 
 * Initiates OAuth 2.0 + PKCE authorization flow for AI provider binding.
 * Implements requirement: 2.1 (OAuth 2.0 authorization flow)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/server';
import { getProvider } from '@/lib/provider-binding/providers';
import type { ProviderType } from '@/lib/provider-binding/types';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createServerComponentClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { provider } = body as { provider: ProviderType };
    
    if (!provider) {
      return NextResponse.json(
        { error: 'Provider type is required' },
        { status: 400 }
      );
    }
    
    // Get provider implementation
    const authProvider = getProvider(provider);
    
    // Start OAuth flow (generates PKCE parameters and stores state)
    const { authUrl, state } = await authProvider.startLogin();
    
    return NextResponse.json({ authUrl, state });
  } catch (error) {
    console.error('Failed to start OAuth login:', error);
    return NextResponse.json(
      { error: 'Failed to start OAuth flow' },
      { status: 500 }
    );
  }
}
