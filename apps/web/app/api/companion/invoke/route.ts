/**
 * Companion Invocation API Route
 * 
 * Example of using token refresh in an API route.
 * Demonstrates automatic token refresh before making AI API calls.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken, TokenRefreshError } from '@/lib/provider-binding/token-refresh';
import { getConnection } from '@/lib/provider-binding/connection-store';
import { createLogger } from '@/lib/provider-binding/logger';

const logger = createLogger('CompanionInvokeAPI');

/**
 * POST /api/companion/invoke
 * 
 * Invoke a companion to generate a response.
 * Automatically refreshes the provider connection token if needed.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { connectionId, prompt, model = 'gpt-4' } = body;
    
    if (!connectionId || !prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: connectionId, prompt' },
        { status: 400 }
      );
    }
    
    logger.info('Invoking companion', { connectionId, model });
    
    // Get connection to determine provider
    const connection = await getConnection(connectionId);
    
    if (!connection) {
      logger.warn('Connection not found', { connectionId });
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }
    
    // Get valid access token (automatically refreshes if needed)
    let accessToken: string;
    try {
      accessToken = await getValidAccessToken(connectionId);
      logger.debug('Got valid access token', { connectionId });
    } catch (error) {
      if (error instanceof TokenRefreshError) {
        logger.error('Token refresh failed', error, {
          connectionId,
          provider: error.provider,
          shouldReauthorize: error.shouldReauthorize,
        });
        
        return NextResponse.json(
          {
            error: 'Token refresh failed',
            message: error.message,
            shouldReauthorize: error.shouldReauthorize,
            provider: error.provider,
          },
          { status: 401 }
        );
      }
      throw error;
    }
    
    // Make AI API call based on provider
    let response;
    
    if (connection.provider === 'openai') {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
    } else if (connection.provider === 'google') {
      response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });
    } else {
      return NextResponse.json(
        { error: `Unsupported provider: ${connection.provider}` },
        { status: 400 }
      );
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error('AI API call failed', null, {
        connectionId,
        provider: connection.provider,
        status: response.status,
        error: errorText,
      });
      
      return NextResponse.json(
        { error: 'AI API call failed', details: errorText },
        { status: response.status }
      );
    }
    
    const result = await response.json();
    
    logger.info('Companion invocation successful', {
      connectionId,
      provider: connection.provider,
    });
    
    return NextResponse.json(result);
    
  } catch (error) {
    logger.error('Unexpected error in companion invocation', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
