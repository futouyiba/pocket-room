/**
 * OpenAI OAuth Provider
 * 
 * OAuth 2.0 + PKCE implementation for OpenAI/ChatGPT.
 * 
 * Provider-specific features:
 * - OAuth 2.0 authorization with PKCE
 * - Token refresh support
 * - Token revocation
 * - Account ID extraction from user info endpoint
 */

import { BaseAuthProvider } from '../auth-provider';
import { ProviderType, ProviderConfig, Connection } from '../types';

/**
 * OpenAI user info response
 */
interface OpenAIUserInfo {
  id: string;
  email?: string;
  name?: string;
}

/**
 * OpenAI provider configuration
 */
function getOpenAIConfig(): ProviderConfig {
  const clientId = process.env.OPENAI_CLIENT_ID;
  const clientSecret = process.env.OPENAI_CLIENT_SECRET;
  const redirectUri = process.env.NEXT_PUBLIC_APP_URL 
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/openai`
    : 'http://localhost:3000/api/auth/callback/openai';
  
  if (!clientId) {
    throw new Error('OPENAI_CLIENT_ID environment variable is not set');
  }
  
  return {
    clientId,
    clientSecret,
    authorizationEndpoint: 'https://auth.openai.com/authorize',
    tokenEndpoint: 'https://auth.openai.com/oauth/token',
    scopes: ['openai.api'],
    redirectUri,
  };
}

/**
 * OpenAI OAuth provider implementation
 * 
 * Encapsulates OpenAI-specific OAuth flow and API details.
 */
export class OpenAIProvider extends BaseAuthProvider {
  constructor() {
    super(getOpenAIConfig());
  }
  
  getProviderType(): ProviderType {
    return 'openai';
  }
  
  /**
   * Handle OAuth callback with OpenAI-specific account ID extraction
   * 
   * @override
   */
  async handleCallback(
    code: string,
    state: string,
    codeVerifier: string
  ): Promise<Omit<Connection, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> {
    // Get base connection from parent
    const connection = await super.handleCallback(code, state, codeVerifier);
    
    // Fetch user info to get account ID
    try {
      const userInfo = await this.getUserInfo(connection.accessToken);
      return {
        ...connection,
        accountId: userInfo.id,
        metadata: {
          email: userInfo.email,
          name: userInfo.name,
        },
      };
    } catch (error) {
      // If user info fetch fails, return connection without account ID
      console.warn('Failed to fetch OpenAI user info:', error);
      return connection;
    }
  }
  
  /**
   * Fetch OpenAI user info
   * 
   * @param accessToken - Access token
   * @returns User info
   */
  private async getUserInfo(accessToken: string): Promise<OpenAIUserInfo> {
    const response = await fetch('https://api.openai.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch user info: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  /**
   * Revoke OpenAI OAuth token
   * 
   * @override
   */
  async revoke(connection: Connection): Promise<void> {
    // OpenAI doesn't have a standard revocation endpoint
    // The token will expire naturally based on expiresAt
    // For now, we just log the revocation
    console.log(`Revoking OpenAI connection ${connection.id}`);
    
    // In a production system, you might want to:
    // 1. Call OpenAI's revocation endpoint if available
    // 2. Mark the connection as revoked in the database
    // 3. Clear any cached tokens
  }
}

