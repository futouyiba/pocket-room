/**
 * Google OAuth Provider
 * 
 * OAuth 2.0 + PKCE implementation for Google/Gemini.
 * 
 * Provider-specific features:
 * - OAuth 2.0 authorization with PKCE
 * - Token refresh support
 * - Token revocation via Google's revocation endpoint
 * - Account ID extraction from user info endpoint
 */

import { BaseAuthProvider } from '../auth-provider';
import { ProviderType, ProviderConfig, Connection } from '../types';

/**
 * Google user info response
 */
interface GoogleUserInfo {
  sub: string; // Google user ID
  email?: string;
  name?: string;
  picture?: string;
}

/**
 * Google provider configuration
 */
function getGoogleConfig(): ProviderConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.NEXT_PUBLIC_APP_URL 
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`
    : 'http://localhost:3000/api/auth/callback/google';
  
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID environment variable is not set');
  }
  
  return {
    clientId,
    clientSecret,
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/generative-language',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
    redirectUri,
  };
}

/**
 * Google OAuth provider implementation
 * 
 * Encapsulates Google-specific OAuth flow and API details.
 */
export class GoogleProvider extends BaseAuthProvider {
  constructor() {
    super(getGoogleConfig());
  }
  
  getProviderType(): ProviderType {
    return 'google';
  }
  
  /**
   * Handle OAuth callback with Google-specific account ID extraction
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
        accountId: userInfo.sub,
        metadata: {
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
        },
      };
    } catch (error) {
      // If user info fetch fails, return connection without account ID
      console.warn('Failed to fetch Google user info:', error);
      return connection;
    }
  }
  
  /**
   * Fetch Google user info
   * 
   * @param accessToken - Access token
   * @returns User info
   */
  private async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
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
   * Revoke Google OAuth token
   * 
   * Google provides a standard revocation endpoint.
   * 
   * @override
   */
  async revoke(connection: Connection): Promise<void> {
    try {
      const response = await fetch(
        `https://oauth2.googleapis.com/revoke?token=${connection.accessToken}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`Token revocation failed: ${response.statusText}`);
      }
      
      console.log(`Successfully revoked Google connection ${connection.id}`);
    } catch (error) {
      console.error('Failed to revoke Google token:', error);
      throw error;
    }
  }
}

